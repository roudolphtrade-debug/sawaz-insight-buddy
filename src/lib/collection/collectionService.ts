import { supabase } from "@/integrations/supabase/client";

import {
  confirmFileUpload,
  deleteCollectionFile,
  getCollectionSnapshot,
  openCollectionLink,
  requestFileUpload,
  saveCollectionAnswers,
  submitCollection,
} from "./collection.functions";
import type { RemoteFile, RemoteSnapshot } from "./remote-types";
import { emptyState, type AnswerValue, type CollectionState, type FileMeta } from "./types";

/**
 * Couche de persistance de la collecte.
 * Pass 3C : le backend est la source de vérité ; localStorage n'est plus qu'un
 * cache UX de secours (affichage immédiat, mode dégradé si le réseau tombe).
 */

const STORAGE_KEY = "sawaz.lftc.collecte.v1";
const BUCKET = "collection-files";

/** Les objets File ne sont pas sérialisables : ils vivent en mémoire pour la session. */
const blobs = new Map<string, File>();

function stateFromSnapshot(snapshot: RemoteSnapshot): CollectionState {
  const files: Record<string, FileMeta[]> = {};
  for (const f of snapshot.files) {
    const meta: FileMeta = {
      id: f.id,
      remoteId: f.id,
      name: f.name,
      size: f.size,
      type: f.mime,
      addedAt: new Date(f.uploadedAt).getTime(),
    };
    (files[f.slot] ??= []).push(meta);
  }
  return {
    version: 1,
    answers: snapshot.answers as Record<string, AnswerValue>,
    files,
    submittedAt: snapshot.submittedAt ? new Date(snapshot.submittedAt).getTime() : null,
  };
}

export const collectionService = {
  /** Cache local (affichage immédiat avant la réponse serveur). */
  load(): CollectionState {
    if (typeof window === "undefined") return emptyState;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
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

  save(state: CollectionState) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota ou mode privé : on ignore silencieusement */
    }
  },

  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    blobs.clear();
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

  async saveAnswers(answers: Record<string, AnswerValue>) {
    return saveCollectionAnswers({ data: { answers } });
  },

  /** Upload direct vers le bucket privé via URL signée : aucune clé serveur côté client. */
  async uploadFile(
    slot: string,
    file: File,
  ): Promise<{ ok: true; data: RemoteFile } | { ok: false; error: string }> {
    const ticket = await requestFileUpload({
      data: { slot, name: file.name, mime: file.type, size: file.size },
    });
    if (!ticket.ok) return ticket;

    const { error } = await supabase.storage
      .from(BUCKET)
      .uploadToSignedUrl(ticket.data.path, ticket.data.token, file, {
        contentType: file.type,
      });
    if (error) return { ok: false, error: "Envoi du fichier impossible" };

    return confirmFileUpload({
      data: {
        slot,
        path: ticket.data.path,
        name: file.name,
        mime: file.type,
        size: file.size,
      },
    });
  },

  async deleteFile(fileId: string) {
    return deleteCollectionFile({ data: { fileId } });
  },

  async submit(): Promise<{ ok: true; submittedAt: number } | { ok: false; error: string }> {
    const res = await submitCollection();
    if (!res.ok) return res;
    return { ok: true, submittedAt: new Date(res.data.submittedAt).getTime() };
  },
};

export function formatBytes(size: number) {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}
