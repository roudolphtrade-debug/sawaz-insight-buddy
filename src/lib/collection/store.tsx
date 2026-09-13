import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { collectionService, type ExpectedScope } from "./collectionService";
import { emptyState, type AnswerValue, type CollectionState, type FileMeta } from "./types";

export type RemoteStatus = "idle" | "syncing" | "online" | "offline" | "submitted";

/**
 * `saved` ne signifie jamais « écrit en localStorage » (ce cache s'écrit à chaque
 * changement d'état, indépendamment de tout accès réseau) : il ne passe à `saved`
 * qu'après confirmation du serveur pour la dernière réponse en file.
 */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type FlushResult = { ok: true } | { ok: false; error: string };

/**
 * Portée (collecte + soumission) du cache actuellement affiché, vis-à-vis du serveur :
 * - "unconfirmed" : rien n'a encore été confirmé (premier rendu, en attente de réponse).
 * - "offline" : la confirmation a échoué (réseau indisponible) ; le cache déjà affiché,
 *   le cas échéant, reste en lecture/saisie locale, mais aucune écriture distante ne
 *   part tant que ce statut n'a pas changé.
 * - "confirmed" : le serveur a confirmé exactement le même `collectionId`/`submissionId`
 *   que celui affiché — toutes les écritures distantes sont autorisées.
 * - "mismatch" : le serveur a répondu avec une portée différente de celle affichée
 *   (pointeur `sessionStorage` obsolète) — état terminal, écritures bloquées, l'état
 *   optimiste affiché est effacé, la session doit être rouverte via un lien à jour.
 */
export type ScopeStatus = "unconfirmed" | "offline" | "confirmed" | "mismatch";

type Ctx = {
  state: CollectionState;
  hydrated: boolean;
  remoteStatus: RemoteStatus;
  saveStatus: SaveStatus;
  scopeStatus: ScopeStatus;
  /** Retente la confirmation de portée (utile après un échec réseau initial). */
  retryScopeSync: () => void;
  /** Signale un `SESSION_MISMATCH` reçu directement par un appelant hors du store
   *  (ex. `collectionService.submit()` dans la page de validation) : bascule l'état
   *  de portée global sans jamais effacer les données non transmises. */
  reportSessionMismatch: () => void;
  /** Portée confirmée à transmettre à un appel direct à `collectionService` hors du
   *  store (ex. la transmission finale) ; `null` tant qu'elle n'est pas confirmée. */
  getExpectedScope: () => ExpectedScope | null;
  setAnswer: (key: string, value: AnswerValue) => void;
  /** Force l'envoi immédiat des réponses en attente ; résultat explicite succès/échec. */
  flushAnswers: () => Promise<FlushResult>;
  /** Lecture directe de la file d'attente (réponses non encore confirmées par le
   *  serveur, y compris celles en cours d'envoi) — pour une décision qui ne doit pas
   *  dépendre d'un état React potentiellement pas encore re-rendu. */
  hasPendingAnswers: () => boolean;
  addFiles: (slot: string, files: File[]) => void;
  /** Reprise manuelle d'un import de fichier en échec. */
  retryFile: (slot: string, id: string) => void;
  removeFile: (slot: string, id: string) => void;
  markSubmitted: (at: number | null) => void;
  refresh: () => void;
  reset: () => void;
};

const CollectionContext = createContext<Ctx | null>(null);

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `f_${Math.random().toString(36).slice(2)}_${Date.now()}`;

const AUTOSAVE_DELAY = 700;

/** Délais croissants des reprises automatiques bornées après un échec de sauvegarde. */
const RETRY_DELAYS_MS = [2000, 6000, 20000];

/** Origine du prochain appel à `flushAnswers()`, pour décider si le compteur de
 *  reprises automatiques doit être remis à zéro (voir `flushAnswers` plus bas). */
type FlushOrigin = "external" | "scheduled-retry" | "online";

/**
 * Reprend la confirmation des imports de fichiers restés en attente dans le cache
 * local (ticket obtenu, confirmation jamais reçue — page rafraîchie ou fermée entre
 * les deux) et absents du snapshot serveur. Le blob n'étant plus disponible après un
 * rechargement, seule une confirmation directe sur le chemin déjà connu est tentée —
 * jamais un nouveau ticket, puisqu'il n'y a pas d'octets à ré-envoyer ici.
 *
 * Toutes les tentatives sont d'abord résolues (`Promise.all`), puis fusionnées dans un
 * second temps, de façon strictement synchrone : aucune écriture ne lit `files[slot]`
 * avant l'attente réseau d'une autre tentative du même slot (ce qui écraserait un
 * résultat déjà fusionné). Un fichier confirmé dont le `remoteId` figure déjà dans le
 * snapshot serveur (ou dans un résultat déjà fusionné) n'est jamais ajouté une seconde
 * fois.
 *
 * Si une confirmation renvoie explicitement `SESSION_MISMATCH`, l'entrée locale n'est
 * ni modifiée ni classée comme une erreur de fichier ordinaire (elle resterait sinon
 * éligible à un bouton « Réessayer » qui retenterait une confirmation contre une
 * portée déjà invalidée) : `sessionMismatch` en informe l'appelant, qui doit déclencher
 * `handleSessionMismatch` au lieu de considérer la portée comme confirmée.
 */
async function recoverInterruptedUploads(
  cached: CollectionState,
  next: CollectionState,
  expected: ExpectedScope,
): Promise<{ state: CollectionState; sessionMismatch: boolean }> {
  const pendingRecoveries: Array<{ slot: string; meta: FileMeta }> = [];
  for (const [slot, files] of Object.entries(cached.files)) {
    for (const meta of files) {
      if (meta.uploadPath && !meta.remoteId) pendingRecoveries.push({ slot, meta });
    }
  }
  if (pendingRecoveries.length === 0) return { state: next, sessionMismatch: false };

  const outcomes = await Promise.all(
    pendingRecoveries.map(async ({ slot, meta }) => {
      const res = await collectionService.confirmUpload(
        {
          slot,
          path: meta.uploadPath as string,
          name: meta.name,
          mime: meta.type,
          size: meta.size,
        },
        expected,
      );
      if (res.ok) {
        const entry: FileMeta = {
          ...meta,
          remoteId: res.data.id,
          pending: false,
          error: undefined,
          errorReason: undefined,
        };
        return { slot, entry, mismatch: false };
      }
      if ("code" in res && res.code === "SESSION_MISMATCH") {
        return { slot, entry: meta, mismatch: true };
      }
      const entry: FileMeta = {
        ...meta,
        pending: false,
        error: res.error,
        errorReason: res.reason ?? "temporary",
      };
      return { slot, entry, mismatch: false };
    }),
  );

  const files: CollectionState["files"] = { ...next.files };
  for (const { slot, entry } of outcomes) {
    const existing = files[slot] ?? [];
    if (entry.remoteId && existing.some((f) => f.remoteId === entry.remoteId)) continue;
    files[slot] = [...existing, entry];
  }

  return { state: { ...next, files }, sessionMismatch: outcomes.some((o) => o.mismatch) };
}

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CollectionState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatus>("idle");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [scopeStatus, setScopeStatus] = useState<ScopeStatus>("unconfirmed");
  const hydratedRef = useRef(false);
  const onlineRef = useRef(false);
  const pendingAnswers = useRef<Record<string, AnswerValue>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Promesse de la chaîne de sauvegarde en cours : un seul appel distant actif à la
   *  fois, tout appelant pendant ce temps reçoit cette même promesse. */
  const flushChain = useRef<Promise<FlushResult> | null>(null);
  /** Miroir de `remoteStatus === "submitted"`, lisible sans dépendance de fermeture
   *  dans les callbacks à dépendances vides (ex. `runFlushChain`). */
  const submittedRef = useRef(false);
  /** Nombre de reprises automatiques déjà déclenchées depuis le dernier succès ou la
   *  dernière origine externe (voir `FlushOrigin`). */
  const retryCountRef = useRef(0);
  /** Minuteur de la prochaine reprise automatique programmée — un seul à la fois. */
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Lu et remis à "external" au début de chaque `flushAnswers()` ; positionné à une
   *  autre valeur juste avant un appel automatique (reprise programmée ou événement
   *  `online`) pour que cet appel-là ne remette pas le compteur à zéro. */
  const flushOriginRef = useRef<FlushOrigin>("external");
  /** Référence stable vers la dernière version de `flushAnswers`, pour que le minuteur
   *  de reprise et l'écouteur `online` (déclarés une seule fois) appellent toujours
   *  l'implémentation à jour sans figurer dans leurs propres dépendances. */
  const flushAnswersRef = useRef<(() => Promise<FlushResult>) | undefined>(undefined);
  /** Référence stable vers `refresh`, utilisée par `runFlushChain` (déclaré avant
   *  `refresh` dans ce composant) pour resynchroniser l'état local depuis le serveur
   *  quand une sauvegarde échoue parce que la collecte est déjà transmise. */
  const refreshRef = useRef<(() => void) | undefined>(undefined);
  /** `true` pendant toute la durée de vie du Provider, `false` dès le démontage — pour
   *  qu'une résolution tardive (réponse réseau arrivant après un démontage) ne
   *  déclenche aucune mise à jour React ni ne programme de minuteur. Démarre à `false`
   *  et n'est mis à `true` que dans l'effet ci-dessous : forme correcte en mode strict
   *  (l'effet peut être monté/démonté/remonté en développement). */
  const mountedRef = useRef(false);
  /** Identifiant de portée du cache local (`collectionId.submissionId`), connu
   *  seulement après la première réponse serveur — voir l'effet d'hydratation. */
  const scopeIdRef = useRef<string | null>(null);
  /** `collectionId`/`submissionId` confirmés, transmis à chaque opération mutante pour
   *  que le serveur puisse les comparer à la session réellement active avant toute
   *  écriture (voir `assertExpectedScope`/`assertExpectedSubmission` côté serveur). */
  const expectedScopeRef = useRef<ExpectedScope | null>(null);
  /** Miroir synchrone de `scopeStatus === "confirmed"` : seul point de vérité lu par
   *  toute tentative d'écriture distante (réponses, fichiers, transmission). */
  const scopeConfirmedRef = useRef(false);
  /** Miroir synchrone de `scopeStatus`, pour les callbacks à dépendances vides qui ne
   *  peuvent pas lire l'état React directement (ex. l'écouteur `online`). */
  const scopeStatusRef = useRef<ScopeStatus>("unconfirmed");
  /** Référence stable vers la tentative de synchronisation de portée en cours, pour
   *  que l'écouteur `online` puisse la redéclencher sans dépendre de sa fermeture. */
  const retryScopeSyncRef = useRef<(() => void) | undefined>(undefined);
  /** Référence stable vers la reprise des imports de fichiers mis en file pendant que
   *  la portée n'était pas encore confirmée — déclenchée dès la confirmation. */
  const flushQueuedFileUploadsRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  /**
   * Le serveur a répondu `SESSION_MISMATCH` à une opération mutante, ou la portée
   * confirmée à l'hydratation diverge du pointeur optimiste : dans les deux cas, on
   * n'accepte jamais de basculer silencieusement vers l'autre collecte.
   * - Arrête toute reprise automatique en cours (minuteurs annulés) et empêche toute
   *   nouvelle programmation (`scopeConfirmedRef` à `false`, revu par `scheduleRetry`
   *   et `runFlushChain`).
   * - `wipeDisplay` n'efface l'écran que pour le cas de l'hydratation (portée jamais
   *   légitimement confirmée dans cet onglet) : une divergence détectée après coup, en
   *   cours de travail réel sur cette page, conserve au contraire tout ce qui n'a pas
   *   encore été transmis — seules les écritures distantes s'arrêtent.
   * - Remet aussi `saveStatus` à `"error"` : sans cela, un décalage détecté en plein
   *   envoi de réponses laisserait `saveStatus` bloqué sur `"saving"` pour toujours,
   *   puisque le chemin normal qui le fait passer à `"saved"` n'est jamais atteint.
   * - Les mises à jour React (`setState`, `setScopeStatus`, `setSaveStatus`) sont
   *   sautées si le Provider est démonté entre-temps ; les références, elles, sont
   *   toujours mises à jour (sans effet observable, mais sans besoin de garde).
   */
  const handleSessionMismatch = useCallback((options?: { wipeDisplay?: boolean }) => {
    if (scopeStatusRef.current === "mismatch") return;
    scopeConfirmedRef.current = false;
    scopeStatusRef.current = "mismatch";
    scopeIdRef.current = null;
    expectedScopeRef.current = null;
    collectionService.clearScopePointer();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (!mountedRef.current) return;
    if (options?.wipeDisplay) setState(emptyState);
    setScopeStatus("mismatch");
    setSaveStatus("error");
  }, []);

  /**
   * Hydratation en deux temps :
   * 1. Si un pointeur de portée optimiste existe pour cet onglet (`sessionStorage`,
   *    écrit lors d'une confirmation précédente dans ce même onglet), le cache local
   *    correspondant est affiché immédiatement, en lecture/saisie locale — mais reste
   *    `"unconfirmed"` : `scopeConfirmedRef` ne passe à `true` qu'à l'étape 2.
   * 2. La réponse serveur tranche : même portée → confirmé, écritures débloquées, tout
   *    ce qui a été saisi/ajouté entre-temps part immédiatement ; portée différente →
   *    l'affichage optimiste est effacé, écritures bloquées, message explicite ; échec
   *    réseau → l'affichage optimiste (s'il existe) est conservé tel quel, en attente
   *    d'une nouvelle tentative (retour réseau ou bouton manuel).
   */
  useEffect(() => {
    let cancelled = false;

    const setScope = (next: ScopeStatus) => {
      scopeStatusRef.current = next;
      setScopeStatus(next);
    };

    const sync = async () => {
      const pointerScopeId = collectionService.readScopePointer();

      // Affichage optimiste uniquement au tout premier passage : une reprise après
      // échec ne doit jamais écraser des saisies locales faites entre-temps.
      if (pointerScopeId && !hydratedRef.current) {
        setState(collectionService.load(pointerScopeId));
        setScope("unconfirmed");
        hydratedRef.current = true;
        setHydrated(true);
      }

      setRemoteStatus("syncing");
      const url = new URL(window.location.href);
      const token = url.searchParams.get("t");

      let res = token
        ? await collectionService.openLink(token)
        : await collectionService.snapshot();

      // Le secret ne doit jamais rester dans l'URL ni dans l'historique.
      if (token) {
        url.searchParams.delete("t");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        if (!res.ok) res = await collectionService.snapshot();
      }

      if (cancelled) return;
      if (!res.ok) {
        onlineRef.current = false;
        setRemoteStatus("offline");
        setScope("offline");
        hydratedRef.current = true;
        setHydrated(true);
        return;
      }

      onlineRef.current = true;
      const authoritativeScopeId = `${res.data.collectionId}.${res.data.submissionId}`;

      if (pointerScopeId && pointerScopeId !== authoritativeScopeId) {
        // Le pointeur optimiste de cet onglet ne correspond pas à ce que confirme le
        // serveur (lien réouvert entre-temps, session expirée puis renouvelée, etc.) :
        // on n'écrase jamais silencieusement l'un par l'autre. Portée jamais
        // légitimement confirmée dans cet onglet : l'affichage optimiste est effacé.
        submittedRef.current = res.data.status === "submitted";
        setRemoteStatus(submittedRef.current ? "submitted" : "online");
        hydratedRef.current = true;
        setHydrated(true);
        handleSessionMismatch({ wipeDisplay: true });
        return;
      }

      const expected: ExpectedScope = {
        collectionId: res.data.collectionId,
        submissionId: res.data.submissionId,
      };
      scopeIdRef.current = authoritativeScopeId;
      expectedScopeRef.current = expected;
      collectionService.writeScopePointer(authoritativeScopeId);
      const cached = collectionService.load(authoritativeScopeId);
      const next = collectionService.fromSnapshot(res.data);
      const recovered = await recoverInterruptedUploads(cached, next, expected);
      if (cancelled) return;
      setState((prev) => {
        // Réponses/fichiers saisis ou ajoutés localement pendant que les écritures
        // distantes étaient encore bloquées : ni envoyés (gardés par `pendingAnswers`
        // et jamais uploadés), ni jamais écrits dans le cache localStorage tant que
        // `scopeIdRef` n'était pas encore fixé — `recovered.state` seul (serveur +
        // dernier cache d'une session confirmée antérieure) les ignorerait
        // complètement. Seules les clés effectivement modifiées localement
        // (`pendingAnswers`) l'emportent sur la valeur serveur, pour ne pas écraser
        // une réponse plus récente enregistrée entre-temps depuis un autre
        // onglet/appareil.
        const files: CollectionState["files"] = { ...recovered.state.files };
        for (const [slot, list] of Object.entries(prev.files)) {
          const existing = files[slot] ?? [];
          // `prev` peut contenir la version obsolète (pré-reprise) d'un fichier que
          // `recoverInterruptedUploads` vient de confirmer avec succès — `cached` et
          // `prev` sont issus de la même lecture `localStorage` dans le cas où le
          // pointeur optimiste correspond à la portée confirmée. Sans ce
          // dédoublonnage, cette version obsolète (toujours sans `remoteId`)
          // réapparaîtrait à côté de la version confirmée. Identité vérifiée par
          // ordre de fiabilité décroissante : `remoteId` (confirmé serveur) > `id`
          // local > `uploadPath` (chemin de stockage déjà connu) — la version
          // porteuse d'un `remoteId` a toujours priorité.
          const presentKeys = new Set<string>();
          for (const f of existing) {
            if (f.remoteId) presentKeys.add(`remoteId:${f.remoteId}`);
            presentKeys.add(`id:${f.id}`);
            if (f.uploadPath) presentKeys.add(`uploadPath:${f.uploadPath}`);
          }

          // Boucle déterministe plutôt qu'un `filter` testé contre un Set figé : un
          // doublon peut exister *entre deux entrées de `list` elles-mêmes* (pas
          // seulement contre `existing`) ; `presentKeys` doit donc être mis à jour
          // immédiatement après l'acceptation de chaque entrée, avant d'examiner la
          // suivante, pour que ce cas soit lui aussi couvert.
          const neverSent: FileMeta[] = [];
          for (const f of list) {
            if (f.remoteId) continue;
            const isDuplicate =
              presentKeys.has(`id:${f.id}`) ||
              (Boolean(f.uploadPath) && presentKeys.has(`uploadPath:${f.uploadPath}`));
            if (isDuplicate) continue;
            presentKeys.add(`id:${f.id}`);
            if (f.uploadPath) presentKeys.add(`uploadPath:${f.uploadPath}`);
            neverSent.push(f);
          }
          if (neverSent.length > 0) files[slot] = [...existing, ...neverSent];
        }
        return {
          ...recovered.state,
          answers: { ...recovered.state.answers, ...pendingAnswers.current },
          files,
        };
      });
      submittedRef.current = res.data.status === "submitted";
      setRemoteStatus(submittedRef.current ? "submitted" : "online");
      hydratedRef.current = true;
      setHydrated(true);

      if (recovered.sessionMismatch) {
        // Une reprise de fichier a été explicitement refusée pour cause de portée
        // divergente : la session a changé pendant cette même confirmation. On
        // n'annonce jamais la portée comme confirmée dans ce cas — les données
        // affichées ci-dessus restent visibles, mais aucune écriture distante ne
        // démarre.
        handleSessionMismatch();
        return;
      }

      scopeConfirmedRef.current = true;
      setScope("confirmed");

      // Portée confirmée : déclenche l'envoi de ce qui a été saisi/ajouté localement
      // pendant que les écritures distantes étaient encore bloquées.
      void flushAnswersRef.current?.();
      flushQueuedFileUploadsRef.current?.();
    };

    retryScopeSyncRef.current = () => void sync();
    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Cache UX de secours, isolé par `scopeIdRef` une fois connu. */
  useEffect(() => {
    if (!hydratedRef.current || !scopeIdRef.current) return;
    collectionService.save(state, scopeIdRef.current);
  }, [state]);

  /**
   * Boucle d'envoi : tant que la file contient des réponses, on tente de les envoyer.
   * - File vide dès l'entrée : ne touche à rien, renvoie `{ ok: true }` en conservant le
   *   statut d'affichage courant (aucune confirmation n'a eu lieu, donc jamais `saved`).
   * - Hors ligne : la file n'est pas vidée (rien n'est perdu), statuts passés en échec,
   *   on s'arrête ; une reprise ultérieure (retour réseau, tentative bornée ou manuelle)
   *   la traitera.
   * - Échec réseau/serveur, y compris une exception inattendue de `saveAnswers` (jamais
   *   laissée remonter : `flushAnswers()` ne doit jamais rejeter pour un incident réseau
   *   normal) : le lot envoyé est refusionné dans la file sans écraser une valeur plus
   *   récente déjà présente (les clés déjà en file l'emportent), `saveStatus` reste
   *   `error`, puis on s'arrête — même si un lot précédent avait réussi dans cette même
   *   chaîne.
   * - Succès complet de la chaîne (aucun lot en échec) et au moins un lot réellement
   *   confirmé : passage à `saved`, et à `online` si la collecte n'est pas déjà
   *   `submitted`.
   */
  const runFlushChain = useCallback(async (): Promise<FlushResult> => {
    let result: FlushResult = { ok: true };
    let confirmedAtLeastOneBatch = false;

    for (;;) {
      if (Object.keys(pendingAnswers.current).length === 0) break;
      if (!mountedRef.current) {
        // Pas de nouvelle tentative réseau après démontage, et aucune mise à jour
        // React dans cette branche : seul un résultat explicite est renvoyé.
        result = { ok: false, error: "Enregistrement interrompu" };
        break;
      }

      if (!scopeConfirmedRef.current) {
        // Portée pas encore confirmée par le serveur (premier chargement en attente,
        // ou hors ligne) : la réponse reste en file, aucune tentative d'envoi n'a
        // lieu. Le bandeau de portée porte cette information — on ne bascule pas
        // `saveStatus` sur "error" pour un état qui n'en est pas un.
        result = { ok: false, error: "Portée de la collecte non confirmée" };
        break;
      }

      if (!onlineRef.current) {
        if (mountedRef.current) {
          setRemoteStatus("offline");
          setSaveStatus("error");
        }
        result = { ok: false, error: "Hors ligne" };
        break;
      }

      const batch = pendingAnswers.current;
      pendingAnswers.current = {};
      const expected = expectedScopeRef.current;
      if (mountedRef.current) setSaveStatus("saving");

      const res = await (async () => {
        if (!expected) return { ok: false as const, error: "Portée de la collecte non confirmée" };
        try {
          return await collectionService.saveAnswers(batch, expected);
        } catch {
          return { ok: false as const, error: "Connexion impossible" };
        }
      })();

      // La réponse serveur termine l'opération métier (file, statut de soumission)
      // même après un démontage survenu pendant l'attente ci-dessus ; seules les
      // mises à jour React qui suivent sont conditionnées à `mountedRef`.
      if (!res.ok) {
        if ("code" in res && res.code === "SESSION_MISMATCH") {
          // Le serveur a explicitement rejeté cette écriture : la portée attendue par
          // cet onglet ne correspond plus à la session réellement active. On ne
          // bascule jamais silencieusement — la réponse reste en file (conservée
          // localement), toute reprise automatique est arrêtée.
          pendingAnswers.current = { ...batch, ...pendingAnswers.current };
          handleSessionMismatch();
          result = { ok: false, error: res.error };
          break;
        }

        // Dette technique assumée : cette détection repose sur un extrait du message
        // d'erreur français renvoyé par le serveur (voir `requireWorkingSubmission`
        // dans session.server.ts, "... les données sont figées"). Aucune autre
        // décision ne doit se fonder sur ce texte ; à remplacer par un code d'erreur
        // typé et stable dès qu'un tel code sera exposé côté serveur.
        const alreadySubmitted = res.error.includes("figées");

        if (alreadySubmitted) {
          // La collecte a été transmise entre-temps (autre onglet/appareil) : ce lot
          // ne pourra plus jamais être enregistré. On ne le remet pas en file. Le
          // minuteur de reprise, s'il y en a un, est annulé quel que soit l'état de
          // montage (simple nettoyage de minuteur, aucune mise à jour React) ; le
          // changement de statut et la resynchronisation depuis le serveur, eux, ne
          // se produisent que si le Provider est encore monté.
          submittedRef.current = true;
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          if (mountedRef.current) {
            setRemoteStatus("submitted");
            setSaveStatus("error");
            refreshRef.current?.();
          }
          result = {
            ok: false,
            error: "Cette collecte a déjà été transmise, ces modifications n'ont pas pu être enregistrées.",
          };
          break;
        }

        pendingAnswers.current = { ...batch, ...pendingAnswers.current };
        if (mountedRef.current) {
          setRemoteStatus("offline");
          setSaveStatus("error");
        }
        result = { ok: false, error: res.error };
        break;
      }

      confirmedAtLeastOneBatch = true;
      result = { ok: true };
    }

    if (result.ok && confirmedAtLeastOneBatch && mountedRef.current) {
      setSaveStatus("saved");
      if (!submittedRef.current) {
        onlineRef.current = true;
        setRemoteStatus("online");
      }
    }

    return result;
  }, []);

  /**
   * Programme une reprise automatique bornée. S'arrête sans rien programmer si le
   * Provider est démonté, si la collecte est déjà `submitted`, si la file est vide, si
   * un minuteur est déjà en attente, ou si les trois tentatives sont épuisées. Le
   * compteur est incrémenté au moment même de la programmation. À son échéance, le
   * minuteur remet d'abord sa propre référence à `null` avant d'appeler la dernière
   * fonction connue via `flushAnswersRef` (jamais une fermeture figée).
   */
  const scheduleRetry = useCallback(() => {
    if (!mountedRef.current) return;
    if (submittedRef.current) return;
    // Tant que la portée n'est pas confirmée, une reprise ne ferait que retomber sur
    // le même verrou dans `runFlushChain` : inutile de consommer le budget de trois
    // tentatives pour ça. La confirmation de portée déclenche elle-même un flush.
    if (!scopeConfirmedRef.current) return;
    if (Object.keys(pendingAnswers.current).length === 0) return;
    if (retryTimerRef.current) return;
    if (retryCountRef.current >= RETRY_DELAYS_MS.length) return;

    const delay = RETRY_DELAYS_MS[retryCountRef.current];
    retryCountRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      if (!mountedRef.current) return;
      if (submittedRef.current) return;
      flushOriginRef.current = "scheduled-retry";
      void flushAnswersRef.current?.();
    }, delay);
  }, []);

  /**
   * Un seul flux distant actif : un appel pendant qu'un autre est en cours reçoit la
   * même promesse, qui ne se résout qu'une fois toute la file traitée.
   *
   * L'origine de cet appel (`flushOriginRef`) est lue puis immédiatement remise à
   * "external" — avant tout retour anticipé — pour qu'une valeur spéciale ne fuite
   * jamais vers un appel ultérieur sans rapport.
   * - Seule l'origine "external" (valeur par défaut : saisie, bouton manuel,
   *   navigation, fermeture) annule un minuteur de reprise en attente et remet le
   *   compteur à zéro, avant même de connaître l'issue de cet appel précis.
   * - "scheduled-retry" et "online" sont des origines automatiques : ni l'une ni
   *   l'autre ne remet le compteur à zéro ni n'annule de minuteur à l'entrée.
   * - À la résolution (si le Provider est toujours monté) : un succès complet annule
   *   un minuteur résiduel et remet le compteur à zéro ; un échec programme une seule
   *   reprise bornée.
   */
  const flushAnswers = useCallback((): Promise<FlushResult> => {
    const origin = flushOriginRef.current;
    flushOriginRef.current = "external";

    if (origin === "external") {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      retryCountRef.current = 0;
    }

    if (flushChain.current) return flushChain.current;

    const chain = runFlushChain()
      .then((res) => {
        if (!mountedRef.current) return res;
        if (res.ok) {
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          retryCountRef.current = 0;
        } else {
          scheduleRetry();
        }
        return res;
      })
      .finally(() => {
        if (flushChain.current === chain) flushChain.current = null;
      });
    flushChain.current = chain;
    return chain;
  }, [runFlushChain, scheduleRetry]);

  useEffect(() => {
    flushAnswersRef.current = flushAnswers;
  }, [flushAnswers]);

  /**
   * Retour du réseau :
   * - "mismatch" : état terminal, aucune tentative — ni flush (bloqué de toute façon
   *   par `scopeConfirmedRef`, mais on évite même l'appel inutile), ni resynchronisation
   *   de portée (rouvrir le lien est la seule issue).
   * - portée pas encore confirmée ("unconfirmed"/"offline") : retente la confirmation
   *   elle-même (`retryScopeSyncRef`) plutôt qu'un flush, qui se heurterait de toute
   *   façon au verrou de `runFlushChain` sans rien accomplir ;
   * - "confirmed" : tentative de flush immédiate, hors du budget des reprises bornées
   *   (origine "online", jamais "external") — un échec relance normalement la même
   *   échelle de reprises via `scheduleRetry`.
   */
  useEffect(() => {
    const handler = () => {
      onlineRef.current = true;
      if (scopeStatusRef.current === "mismatch") return;
      if (scopeStatusRef.current === "unconfirmed" || scopeStatusRef.current === "offline") {
        retryScopeSyncRef.current?.();
        return;
      }
      flushOriginRef.current = "online";
      void flushAnswersRef.current?.();
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, []);

  const hasPendingAnswers = useCallback(
    () => Object.keys(pendingAnswers.current).length > 0 || flushChain.current !== null,
    [],
  );

  const setAnswer = useCallback(
    (key: string, value: AnswerValue) => {
      // Portée en désaccord avec le serveur : écran déjà vidé, écritures bloquées —
      // même localement, pour ne pas ré-accumuler des réponses qui seront de toute
      // façon jetées (la session doit être rouverte via un lien à jour).
      if (scopeStatusRef.current === "mismatch") return;
      setState((prev) => ({ ...prev, answers: { ...prev.answers, [key]: value } }));
      pendingAnswers.current[key] = value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flushAnswers(), AUTOSAVE_DELAY);
    },
    [flushAnswers],
  );

  useEffect(() => {
    const handler = () => void flushAnswers();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [flushAnswers]);

  const patchFile = useCallback((slot: string, id: string, patch: Partial<FileMeta>) => {
    setState((prev) => ({
      ...prev,
      files: {
        ...prev.files,
        [slot]: (prev.files[slot] ?? []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
      },
    }));
  }, []);

  const dropFile = useCallback((slot: string, id: string) => {
    setState((prev) => ({
      ...prev,
      files: { ...prev.files, [slot]: (prev.files[slot] ?? []).filter((f) => f.id !== id) },
    }));
  }, []);

  /** Démarre réellement l'envoi d'un fichier déjà enregistré localement — factorisé
   *  entre `addFiles`, `flushQueuedFileUploads` et `retryFile`. */
  const startUpload = useCallback(
    (slot: string, meta: FileMeta, file: File) => {
      const expected = expectedScopeRef.current;
      if (!expected) {
        patchFile(slot, meta.id, {
          pending: false,
          error: "Portée de la collecte non confirmée",
          errorReason: "temporary",
        });
        return;
      }
      void collectionService
        .uploadFile(slot, file, expected, (path) => patchFile(slot, meta.id, { uploadPath: path }))
        .then((res) => {
          if (res.ok) {
            patchFile(slot, meta.id, {
              remoteId: res.data.id,
              pending: false,
              error: undefined,
              errorReason: undefined,
            });
            return;
          }
          if ("code" in res && res.code === "SESSION_MISMATCH") {
            // Écriture explicitement refusée par le serveur : la portée attendue par
            // cet onglet ne correspond plus à la session active. Ne jamais classer
            // comme une erreur de fichier ordinaire (retenter proposerait une reprise
            // contre une portée déjà invalidée, désormais bloquée de toute façon) —
            // seul `pending` est levé, le fichier redevient "Prêt", sans message ni
            // bouton « Réessayer » trompeurs ; le bandeau de portée porte l'information.
            patchFile(slot, meta.id, { pending: false });
            handleSessionMismatch();
            return;
          }
          patchFile(slot, meta.id, {
            pending: false,
            error: res.error,
            errorReason: res.reason ?? "temporary",
          });
        })
        .catch(() => {
          patchFile(slot, meta.id, {
            pending: false,
            error: "Envoi impossible, réessaie",
            errorReason: "temporary",
          });
        });
    },
    [patchFile, handleSessionMismatch],
  );

  const addFiles = useCallback(
    (slot: string, files: File[]) => {
      if (files.length === 0) return;
      if (scopeStatusRef.current === "mismatch") return;

      // Tant que la portée n'est pas confirmée, le fichier est enregistré localement
      // (visible, en attente) mais aucun import ne démarre — il sera repris par
      // `flushQueuedFileUploads` dès la confirmation.
      const willAttempt = onlineRef.current && scopeConfirmedRef.current;

      const metas: FileMeta[] = files.map((file) => {
        const meta: FileMeta = {
          id: newId(),
          name: file.name,
          size: file.size,
          type: file.type,
          addedAt: Date.now(),
          ...(willAttempt ? { pending: true } : {}),
        };
        collectionService.registerFile(meta, file);
        return meta;
      });

      setState((prev) => ({
        ...prev,
        files: { ...prev.files, [slot]: [...(prev.files[slot] ?? []), ...metas] },
      }));

      if (!willAttempt) return;

      metas.forEach((meta, index) => {
        const file = files[index];
        if (!file) return;
        startUpload(slot, meta, file);
      });
    },
    [startUpload],
  );

  /**
   * Reprend les imports de fichiers enregistrés localement pendant que la portée
   * n'était pas encore confirmée (jamais tentés : ni `pending`, ni `error`, ni
   * `remoteId`). Appelée une fois, juste après la confirmation de portée.
   */
  const flushQueuedFileUploads = useCallback(() => {
    if (!scopeConfirmedRef.current) return;
    for (const [slot, files] of Object.entries(state.files)) {
      for (const meta of files) {
        if (meta.remoteId || meta.pending || meta.error) continue;
        const file = collectionService.getFile(meta.id);
        if (!file) continue;
        patchFile(slot, meta.id, { pending: true });
        startUpload(slot, meta, file);
      }
    }
  }, [state.files, patchFile, startUpload]);

  useEffect(() => {
    flushQueuedFileUploadsRef.current = flushQueuedFileUploads;
  }, [flushQueuedFileUploads]);

  /**
   * Reprise manuelle d'un import en échec. Le blob local (s'il existe encore) est
   * transmis à `collectionService.retryUpload`, qui décide seul si une confirmation
   * sur le chemin déjà connu suffit ou si un nouveau ticket est réellement justifié
   * (absence confirmée + blob disponible) — cette fonction ne fait que relayer.
   */
  const retryFile = useCallback(
    (slot: string, id: string) => {
      // Aucun import de fichier ne doit démarrer tant que la portée n'est pas
      // confirmée par le serveur (voir `addFiles`/`flushQueuedFileUploads`).
      if (!scopeConfirmedRef.current) return;
      const expected = expectedScopeRef.current;
      if (!expected) return;
      const meta = (state.files[slot] ?? []).find((f) => f.id === id);
      if (!meta) return;
      const blob = collectionService.getFile(id);
      patchFile(slot, id, { pending: true, error: undefined, errorReason: undefined });
      void collectionService
        .retryUpload(slot, meta, blob, expected, (path) => patchFile(slot, id, { uploadPath: path }))
        .then((res) => {
          if (res.ok) {
            patchFile(slot, id, {
              remoteId: res.data.id,
              pending: false,
              error: undefined,
              errorReason: undefined,
            });
            return;
          }
          if ("code" in res && res.code === "SESSION_MISMATCH") {
            // Même principe que `startUpload` : jamais présenté comme une erreur de
            // fichier réessayable.
            patchFile(slot, id, { pending: false });
            handleSessionMismatch();
            return;
          }
          patchFile(slot, id, {
            pending: false,
            error: res.error,
            errorReason: res.reason ?? "temporary",
          });
        })
        .catch(() => {
          patchFile(slot, id, {
            pending: false,
            error: "Envoi impossible, réessaie",
            errorReason: "temporary",
          });
        });
    },
    [state.files, patchFile, handleSessionMismatch],
  );

  /**
   * Un fichier jamais confirmé côté serveur (pas de `remoteId`) n'existe que
   * localement : retrait immédiat, sans appel réseau. Un fichier déjà confirmé n'est
   * en revanche retiré de l'affichage qu'*après* confirmation serveur de sa
   * suppression — jamais avant, jamais de façon seulement optimiste — pour qu'un
   * refus (`SESSION_MISMATCH` ou toute autre erreur) laisse l'entrée strictement
   * identique à ce qu'elle était juste avant l'appel, plutôt que supprimée en
   * apparence alors qu'elle existe toujours côté serveur.
   */
  const removeFile = useCallback(
    (slot: string, id: string) => {
      if (scopeStatusRef.current === "mismatch") return;
      const meta = (state.files[slot] ?? []).find((f) => f.id === id);
      if (!meta) return;

      if (!meta.remoteId) {
        collectionService.forgetFile(id);
        dropFile(slot, id);
        return;
      }

      const expected = expectedScopeRef.current;
      if (!onlineRef.current || !expected) return;

      void collectionService.deleteFile(meta.remoteId, expected).then((res) => {
        if (res.ok) {
          collectionService.forgetFile(id);
          dropFile(slot, id);
          return;
        }
        if ("code" in res && res.code === "SESSION_MISMATCH") handleSessionMismatch();
        // Refus (portée divergente ou autre échec) : rien n'est modifié localement —
        // l'entrée reste affichée exactement comme avant cet appel.
      });
    },
    [dropFile, state.files, handleSessionMismatch],
  );

  const markSubmitted = useCallback((at: number | null) => {
    // Résolution tardive possible après démontage (même discipline que `refresh` et
    // `runFlushChain`) : aucune mise à jour React ne doit s'exécuter dans ce cas.
    if (!mountedRef.current) return;
    setState((prev) => ({ ...prev, submittedAt: at }));
    if (at !== null) {
      submittedRef.current = true;
      setRemoteStatus("submitted");
    }
  }, []);

  const refresh = useCallback(() => {
    void collectionService.snapshot().then((res) => {
      // Résolution tardive possible après démontage (voir `runFlushChain`) : aucune
      // mise à jour React ne doit s'exécuter dans ce cas.
      if (!res.ok || !mountedRef.current) return;
      onlineRef.current = true;
      setState(collectionService.fromSnapshot(res.data));
      submittedRef.current = res.data.status === "submitted";
      setRemoteStatus(submittedRef.current ? "submitted" : "online");
    });
  }, []);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const reset = useCallback(() => {
    if (scopeIdRef.current) collectionService.clear(scopeIdRef.current);
    setState(emptyState);
  }, []);

  const retryScopeSync = useCallback(() => {
    retryScopeSyncRef.current?.();
  }, []);

  const reportSessionMismatch = useCallback(() => {
    handleSessionMismatch();
  }, [handleSessionMismatch]);

  const getExpectedScope = useCallback(() => expectedScopeRef.current, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      hydrated,
      remoteStatus,
      saveStatus,
      scopeStatus,
      retryScopeSync,
      reportSessionMismatch,
      getExpectedScope,
      setAnswer,
      flushAnswers,
      hasPendingAnswers,
      addFiles,
      retryFile,
      removeFile,
      markSubmitted,
      refresh,
      reset,
    }),
    [
      state,
      hydrated,
      remoteStatus,
      saveStatus,
      scopeStatus,
      retryScopeSync,
      reportSessionMismatch,
      getExpectedScope,
      setAnswer,
      flushAnswers,
      hasPendingAnswers,
      addFiles,
      retryFile,
      removeFile,
      markSubmitted,
      refresh,
      reset,
    ],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection doit être utilisé dans <CollectionProvider>");
  return ctx;
}

export function useTextAnswer(key: string): [string, (v: string) => void] {
  const { state, setAnswer } = useCollection();
  const raw = state.answers[key];
  const value = typeof raw === "string" ? raw : "";
  return [value, (v: string) => setAnswer(key, v)];
}

export function useSingleChoice(key: string): [string | null, (v: string) => void] {
  const { state, setAnswer } = useCollection();
  const raw = state.answers[key];
  const value = typeof raw === "string" ? raw : null;
  return [value, (v: string) => setAnswer(key, v)];
}

export function useMultiChoice(key: string): [string[], (v: string) => void] {
  const { state, setAnswer } = useCollection();
  const raw = state.answers[key];
  const values = Array.isArray(raw) ? raw : [];
  const toggle = (v: string) =>
    setAnswer(key, values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return [values, toggle];
}

export function useBoolAnswer(key: string): [boolean, () => void] {
  const { state, setAnswer } = useCollection();
  const value = state.answers[key] === true;
  return [value, () => setAnswer(key, !value)];
}

export function useSlotFiles(slot: string) {
  const { state, addFiles, retryFile, removeFile } = useCollection();
  const files = state.files[slot] ?? [];
  return {
    files,
    add: (list: File[]) => addFiles(slot, list),
    retry: (id: string) => retryFile(slot, id),
    remove: (id: string) => removeFile(slot, id),
  };
}
