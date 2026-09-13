import { supabase } from "@/integrations/supabase/client";

import {
  confirmFileUpload,
  deleteCollectionFile,
  getCollectionSnapshot,
  openCollectionLink,
  requestFileUpload,
  saveCollectionAnswers,
  submitCollection,
  type ConfirmUploadResult,
} from "./collection.functions";
import type { RemoteFile } from "./remote-types";
import { stateFromSnapshot } from "./snapshot";
import { emptyState, type AnswerValue, type CollectionState, type FileMeta } from "./types";

/**
 * Couche de persistance de la collecte.
 * Pass 3C : le backend est la source de vérité ; localStorage n'est plus qu'un
 * cache UX de secours (affichage immédiat, mode dégradé si le réseau tombe).
 */

const STORAGE_PREFIX = "sawaz.lftc.collecte.v1";
const BUCKET = "collection-files";

/**
 * Le cache local est isolé par collecte + soumission (`scopeId`, construit à partir de
 * `collectionId`/`submissionId` — des identifiants serveur opaques, non sensibles, déjà
 * transmis au client dans chaque snapshot). Sans cet identifiant, il n'existe aucune clé
 * à lire ni à écrire : aucune réponse ni fichier d'une collecte précédente ne peut donc
 * être chargé avant que le serveur n'ait confirmé à quelle soumission on s'adresse.
 */
function storageKey(scopeId: string) {
  return `${STORAGE_PREFIX}.${scopeId}`;
}

/**
 * Pointeur de portée « optimiste », propre à cet onglet (`sessionStorage`, jamais
 * partagé entre onglets ni persistant au-delà de leur fermeture). Il permet d'afficher
 * un cache local avant la première réponse serveur, mais ne fait jamais foi à lui
 * seul : le composant appelant doit toujours le confronter à la réponse serveur avant
 * d'autoriser la moindre écriture distante (voir `store.tsx`).
 */
const SCOPE_POINTER_KEY = "sawaz.lftc.scope";

/** Les objets File ne sont pas sérialisables : ils vivent en mémoire pour la session. */
const blobs = new Map<string, File>();

/**
 * Portée confirmée à transmettre à chaque opération mutante, une fois établie (voir
 * `store.tsx`). Le serveur revalide indépendamment cette portée contre la session
 * `HttpOnly` avant toute écriture — ceci ne fait jamais foi côté client, seulement lui
 * permettre de savoir à qui il s'adresse.
 */
export type ExpectedScope = { collectionId: string; submissionId: string };

export const collectionService = {
  /** Cache local (affichage avant confirmation serveur), isolé par `scopeId`. */
  load(scopeId: string): CollectionState {
    if (typeof window === "undefined") return emptyState;
    try {
      const raw = window.localStorage.getItem(storageKey(scopeId));
      if (!raw) return emptyState;
      const parsed = JSON.parse(raw) as Partial<CollectionState>;
      if (!parsed || parsed.version !== 1) return emptyState;
      return {
        version: 1,
        answers: parsed.answers ?? {},
        files: parsed.files ?? {},
        submittedAt: parsed.submittedAt ?? null,
      };
    } catch {
      return emptyState;
    }
  },

  save(state: CollectionState, scopeId: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey(scopeId), JSON.stringify(state));
    } catch {
      /* quota ou mode privé : on ignore silencieusement */
    }
  },

  clear(scopeId: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(storageKey(scopeId));
    blobs.clear();
  },

  /** Lit le pointeur de portée optimiste de cet onglet, s'il existe. */
  readScopePointer(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.sessionStorage.getItem(SCOPE_POINTER_KEY);
    } catch {
      return null;
    }
  },

  writeScopePointer(scopeId: string) {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(SCOPE_POINTER_KEY, scopeId);
    } catch {
      /* mode privé ou quota : on ignore silencieusement */
    }
  },

  clearScopePointer() {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(SCOPE_POINTER_KEY);
    } catch {
      /* ignore */
    }
  },

  registerFile(meta: FileMeta, file: File) {
    blobs.set(meta.id, file);
  },

  getFile(id: string) {
    return blobs.get(id);
  },

  hasFile(id: string) {
    return blobs.has(id);
  },

  forgetFile(id: string) {
    blobs.delete(id);
  },

  /* ---------------- Backend ---------------- */

  /** Ouvre une session à partir du secret présent dans l'URL (supprimé aussitôt). */
  async openLink(token: string) {
    return openCollectionLink({ data: { token } });
  },

  /** Reprend la progression serveur (refresh ou changement d'appareil). */
  async snapshot() {
    return getCollectionSnapshot();
  },

  fromSnapshot: stateFromSnapshot,

  async saveAnswers(answers: Record<string, AnswerValue>, expected: ExpectedScope) {
    return saveCollectionAnswers({
      data: {
        answers,
        expectedCollectionId: expected.collectionId,
        expectedSubmissionId: expected.submissionId,
      },
    });
  },

  /** Demande un ticket d'upload (URL signée) sans envoyer d'octets. */
  async requestUploadTicket(slot: string, file: File, expected: ExpectedScope) {
    return requestFileUpload({
      data: {
        slot,
        name: file.name,
        mime: file.type,
        size: file.size,
        expectedCollectionId: expected.collectionId,
        expectedSubmissionId: expected.submissionId,
      },
    });
  },

  /** Confirme un chemin déjà écrit (ou potentiellement écrit) dans le bucket. */
  async confirmUpload(
    input: { slot: string; path: string; name: string; mime: string; size: number },
    expected: ExpectedScope,
  ): Promise<ConfirmUploadResult> {
    return confirmFileUpload({
      data: {
        ...input,
        expectedCollectionId: expected.collectionId,
        expectedSubmissionId: expected.submissionId,
      },
    });
  },

  /**
   * Upload direct vers le bucket privé via URL signée : aucune clé serveur côté client.
   * `onTicket` est appelé dès l'obtention du chemin, avant l'envoi des octets, pour que
   * l'appelant puisse le conserver immédiatement (survit à un échec d'envoi ou de
   * confirmation, et à une actualisation de page). Seul ce chemin est conservé — jamais
   * le jeton signé, à usage unique et sans intérêt à persister.
   */
  async uploadFile(
    slot: string,
    file: File,
    expected: ExpectedScope,
    onTicket?: (path: string) => void,
  ): Promise<ConfirmUploadResult> {
    const ticket = await collectionService.requestUploadTicket(slot, file, expected);
    if (!ticket.ok) return ticket;
    onTicket?.(ticket.data.path);

    const { error } = await supabase.storage
      .from(BUCKET)
      .uploadToSignedUrl(ticket.data.path, ticket.data.token, file, {
        contentType: file.type,
      });
    // Erreur temporaire (réseau) : le chemin reste valable, une reprise pourra d'abord
    // vérifier s'il a malgré tout été écrit avant de recréer un ticket.
    if (error) return { ok: false, error: "Envoi du fichier impossible" };

    return collectionService.confirmUpload(
      {
        slot,
        path: ticket.data.path,
        name: file.name,
        mime: file.type,
        size: file.size,
      },
      expected,
    );
  },

  /**
   * Reprise d'un import en échec. Ne recrée un nouveau ticket (donc un nouvel objet de
   * stockage) que lorsque le serveur confirme explicitement l'absence de l'objet
   * (`reason: "missing"`) et qu'une copie locale du fichier est disponible pour le
   * ré-envoyer. Une erreur temporaire ou un rejet définitif ne créent jamais de nouveau
   * ticket : la reprise retente la confirmation sur le chemin déjà connu, ou remonte
   * l'échec tel quel pour que l'interface propose l'action adaptée (réessayer, remplacer,
   * re-sélectionner).
   */
  async retryUpload(
    slot: string,
    meta: FileMeta,
    file: File | undefined,
    expected: ExpectedScope,
    onTicket?: (path: string) => void,
  ): Promise<ConfirmUploadResult> {
    if (meta.uploadPath) {
      const res = await collectionService.confirmUpload(
        {
          slot,
          path: meta.uploadPath,
          name: meta.name,
          mime: meta.type,
          size: meta.size,
        },
        expected,
      );
      if (res.ok) return res;
      if (res.reason !== "missing" || !file) return res;
      // Absence confirmée + copie locale disponible : seul cas où un nouveau ticket
      // (donc un nouvel objet) est justifié.
    } else if (!file) {
      return { ok: false, error: "Fichier introuvable, resélectionne-le", reason: "missing" };
    }

    return collectionService.uploadFile(slot, file as File, expected, onTicket);
  },

  async deleteFile(fileId: string, expected: ExpectedScope) {
    return deleteCollectionFile({
      data: {
        fileId,
        expectedCollectionId: expected.collectionId,
        expectedSubmissionId: expected.submissionId,
      },
    });
  },

  async submit(
    expected: ExpectedScope,
  ): Promise<
    | { ok: true; submittedAt: number }
    | { ok: false; error: string; code?: "SESSION_MISMATCH" }
  > {
    const res = await submitCollection({
      data: {
        expectedCollectionId: expected.collectionId,
        expectedSubmissionId: expected.submissionId,
      },
    });
    if (!res.ok) return res;
    return { ok: true, submittedAt: new Date(res.data.submittedAt).getTime() };
  },
};

export function formatBytes(size: number) {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}
