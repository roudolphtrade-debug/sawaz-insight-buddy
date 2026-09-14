import { K, SLOT } from "./keys";
import type { CollectionState } from "./types";

/**
 * Une question obligatoire non satisfaite, identifiée par un `id` stable (utilisé
 * comme ancre DOM par les pages pour scroller/focaliser la question concernée).
 */
export type BlockerIssue = { id: string; message: string };

export type ItemStatus = "transmis" | "partiel" | "indisponible" | "facultatif" | "attente";

export type SummaryItem = {
  label: string;
  status: ItemStatus;
  detail?: string;
};

export type SectionSummary = {
  title: string;
  items: SummaryItem[];
};

export const STATUS_LABEL: Record<ItemStatus, string> = {
  transmis: "Transmis",
  partiel: "Partiel",
  indisponible: "Non disponible",
  facultatif: "Facultatif non transmis",
  attente: "En attente",
};

const count = (s: CollectionState, slot: string) => (s.files[slot] ?? []).length;
/**
 * Comme `count`, mais un fichier ne compte comme réellement transmis que s'il possède
 * un `remoteId` (confirmé côté serveur), n'est pas `pending` et ne porte aucune
 * `error` — réservé aux fonctions de blocage (`youtubeBlocker`/`metaBlocker`), qui
 * partagent ce module avec le serveur (`session.server.ts`). Un fichier local en
 * attente de confirmation de portée, neutralisé après un `SESSION_MISMATCH`, ou dont
 * l'import n'a simplement jamais été confirmé par le serveur, ne satisfait jamais ce
 * décompte, même s'il n'est ni `pending` ni en `error` à cet instant.
 * Les récapitulatifs d'affichage (`*Summary`) continuent d'utiliser `count` tel quel.
 */
const readyCount = (s: CollectionState, slot: string) =>
  (s.files[slot] ?? []).filter((f) => Boolean(f.remoteId) && !f.pending && !f.error).length;
const bool = (s: CollectionState, key: string) => s.answers[key] === true;
const str = (s: CollectionState, key: string) =>
  typeof s.answers[key] === "string" ? (s.answers[key] as string) : null;
const arr = (s: CollectionState, key: string) =>
  Array.isArray(s.answers[key]) ? (s.answers[key] as string[]) : [];

const filesDetail = (n: number) => (n === 1 ? "1 fichier" : `${n} fichiers`);

/* ---------- YouTube ---------- */

export function youtubeSummary(s: CollectionState): SectionSummary {
  const mode = str(s, K.yt.mode);
  const items: SummaryItem[] = [];

  items.push({
    label: "Méthode de transmission",
    status: mode ? "transmis" : "attente",
    ...(mode
      ? {
          detail:
            mode === "export"
              ? "Export YouTube Studio"
              : mode === "captures"
                ? "Captures d'écran"
                : "Procédure guidée",
        }
      : {}),
  });

  const exportCount = count(s, SLOT.ytExport);
  const impossible = bool(s, K.yt.exportImpossible);
  if (mode === "export") {
    items.push({
      label: "Export YouTube (365 jours)",
      status: exportCount > 0 ? "transmis" : impossible ? "indisponible" : "attente",
      ...(exportCount > 0 ? { detail: filesDetail(exportCount) } : {}),
    });
  }

  if (mode === "captures" || mode === "guide" || (mode === "export" && impossible)) {
    const captures: Array<[string, string, string]> = [
      ["Capture Overview — Vue d'ensemble", SLOT.ytOverview, K.yt.missingOverview],
      ["Capture Content — Contenu", SLOT.ytContent, K.yt.missingContent],
      ["Capture Audience", SLOT.ytAudience, K.yt.missingAudience],
    ];
    for (const [label, slot, missingKey] of captures) {
      const n = count(s, slot);
      items.push({
        label,
        status: n > 0 ? "transmis" : bool(s, missingKey) ? "indisponible" : "attente",
        ...(n > 0 ? { detail: filesDetail(n) } : {}),
      });
    }
  }

  return { title: "YouTube", items };
}

/* ---------- Contenus ---------- */

export function contenusSummary(s: CollectionState): SectionSummary {
  const membres = str(s, K.contenus.membresVideos);
  const detail = str(s, K.contenus.membresDetail) ?? "";
  const traffic = str(s, K.contenus.traffic);
  const newRet = str(s, K.contenus.newReturning);
  const vip = count(s, SLOT.guideVip);
  const dix = count(s, SLOT.dixVideos);

  const items: SummaryItem[] = [
    {
      label: "Vidéos destinées aux membres",
      status: !membres
        ? "attente"
        : membres === "inconnu"
          ? "indisponible"
          : membres === "oui" && detail.trim() === ""
            ? "partiel"
            : "transmis",
    },
    {
      label: "Zoom Guide VIP (facultatif)",
      status:
        vip > 0 ? "transmis" : bool(s, K.contenus.guideVipMissing) ? "indisponible" : "facultatif",
      ...(vip > 0 ? { detail: filesDetail(vip) } : {}),
    },
    {
      label: "Captures des 10 vidéos (facultatif)",
      status:
        dix > 0 ? "transmis" : bool(s, K.contenus.skipDixVideos) ? "indisponible" : "facultatif",
      ...(dix > 0 ? { detail: filesDetail(dix) } : {}),
    },
    {
      label: "Traffic Sources",
      status: !traffic
        ? "attente"
        : traffic === "oui"
          ? count(s, SLOT.traffic) > 0
            ? "transmis"
            : "partiel"
          : "indisponible",
    },
    {
      label: "New vs Returning Viewers",
      status: !newRet
        ? "attente"
        : newRet === "oui"
          ? count(s, SLOT.newReturning) > 0
            ? "transmis"
            : "partiel"
          : "indisponible",
    },
  ];

  return { title: "Contenus YouTube", items };
}

/* ---------- Meta ---------- */

export function metaSummary(s: CollectionState): SectionSummary {
  const periode = str(s, K.meta.periode);
  const periodeAutre = (str(s, K.meta.periodeAutre) ?? "").trim();
  const objectifs = arr(s, K.meta.objectifs);
  const destination = arr(s, K.meta.destination);
  const mode = str(s, K.meta.mode);
  const impossible = bool(s, K.meta.exportImpossible);
  const results = arr(s, K.meta.results);
  const tracking = str(s, K.meta.tracking);

  const items: SummaryItem[] = [
    {
      label: "Période transmise",
      status: !periode
        ? "attente"
        : periode === "autre" && periodeAutre === ""
          ? "partiel"
          : "transmis",
    },
    {
      label: "Objectifs de campagne",
      status:
        objectifs.length === 0
          ? "attente"
          : objectifs.includes("inconnu")
            ? "indisponible"
            : objectifs.includes("autre") && (str(s, K.meta.objectifAutre) ?? "").trim() === ""
              ? "partiel"
              : "transmis",
    },
    {
      label: "Destination après le clic",
      status:
        destination.length === 0
          ? "attente"
          : destination.includes("inconnu")
            ? "indisponible"
            : destination.includes("autre-page") &&
                (str(s, K.meta.destinationAutre) ?? "").trim() === ""
              ? "partiel"
              : "transmis",
    },
    {
      label: "Méthode de transmission Meta",
      status: mode ? "transmis" : "attente",
    },
  ];

  if (mode === "export") {
    const n = count(s, SLOT.metaExport);
    items.push({
      label: "Export Meta",
      status: n > 0 ? "transmis" : impossible ? "indisponible" : "attente",
      ...(n > 0 ? { detail: filesDetail(n) } : {}),
    });
  }
  if (mode === "captures" || mode === "guide" || (mode === "export" && impossible)) {
    const n = count(s, SLOT.metaCaptures);
    items.push({
      label: "Captures Meta",
      status: n > 0 ? "transmis" : "attente",
      ...(n > 0 ? { detail: filesDetail(n) } : {}),
    });
  }

  const resultsCapture = count(s, SLOT.metaResults);
  items.push({
    label: "Results — Résultats",
    status:
      results.length === 0
        ? bool(s, K.meta.resultsMissing)
          ? "indisponible"
          : "attente"
        : results.includes("inconnu")
          ? resultsCapture > 0
            ? "transmis"
            : "partiel"
          : results.includes("autre") && (str(s, K.meta.resultsAutre) ?? "").trim() === ""
            ? "partiel"
            : "transmis",
  });

  items.push({
    label: "Suivi Meta sur la landing page",
    status: !tracking ? "attente" : tracking === "inconnu" ? "indisponible" : "transmis",
  });

  return { title: "Meta", items };
}

export function allSummaries(s: CollectionState): SectionSummary[] {
  return [youtubeSummary(s), contenusSummary(s), metaSummary(s)];
}

/* ---------- Exigences obligatoires (source unique des règles) ---------- */

/**
 * Une exigence obligatoire actuellement applicable (dépend des réponses déjà données,
 * ex. le mode de transmission choisi), et si elle est satisfaite ou non à cet instant.
 * `youtubeIssues`/`youtubeBlocker`/`youtubeRequirementSummary` — et leurs équivalents
 * Meta — sont tous les trois *dérivés* de ces listes, jamais recopiés : c'est ici, et
 * uniquement ici, que vit chaque condition métier.
 */
type Check = { id: string; message: string; satisfied: boolean };

/**
 * YouTube
 * La méthode choisie détermine précisément les éléments requis.
 */
function youtubeChecks(s: CollectionState): Check[] {
  const checks: Check[] = [];
  const mode = str(s, K.yt.mode);

  checks.push({
    id: "yt-mode",
    message: "Choisis une méthode de transmission YouTube.",
    satisfied: Boolean(mode),
  });
  if (!mode) return checks;

  const exportImpossible = bool(s, K.yt.exportImpossible);

  if (mode === "export" && !exportImpossible) {
    checks.push({
      id: "yt-export",
      message: "Ajoute ton export YouTube ou indique que tu n'arrives pas à l'exporter.",
      satisfied: readyCount(s, SLOT.ytExport) > 0,
    });
    return checks;
  }

  if (mode === "captures" || mode === "guide" || (mode === "export" && exportImpossible)) {
    const captures: Array<{ id: string; slot: string; missingKey: string; label: string }> = [
      {
        id: "yt-capture-overview",
        slot: SLOT.ytOverview,
        missingKey: K.yt.missingOverview,
        label: "Overview — Vue d'ensemble",
      },
      {
        id: "yt-capture-content",
        slot: SLOT.ytContent,
        missingKey: K.yt.missingContent,
        label: "Content — Contenu",
      },
      {
        id: "yt-capture-audience",
        slot: SLOT.ytAudience,
        missingKey: K.yt.missingAudience,
        label: "Audience",
      },
    ];

    for (const capture of captures) {
      checks.push({
        id: capture.id,
        message: `Ajoute la capture ${capture.label}, ou indique que tu ne trouves pas cet écran.`,
        satisfied: readyCount(s, capture.slot) > 0 || bool(s, capture.missingKey),
      });
    }
  }

  return checks;
}

/**
 * Meta
 * Chaque question marquée Obligatoire ou Conditionnelle est contrôlée dans l'ordre où
 * elle apparaît à l'écran.
 */
function metaChecks(s: CollectionState): Check[] {
  const checks: Check[] = [];

  const periode = str(s, K.meta.periode);
  const periodeAutre = (str(s, K.meta.periodeAutre) ?? "").trim();
  checks.push({
    id: "meta-periode",
    message: !periode
      ? "Sélectionne la période que tu vas nous transmettre."
      : "Précise la période que tu vas nous transmettre.",
    satisfied: Boolean(periode) && !(periode === "autre" && !periodeAutre),
  });

  const objectifs = arr(s, K.meta.objectifs);
  checks.push({
    id: "meta-objectifs",
    message:
      objectifs.length === 0
        ? "Sélectionne au moins un objectif de campagne Meta."
        : "Précise l'autre objectif de campagne sélectionné.",
    satisfied:
      objectifs.length > 0 &&
      !(objectifs.includes("autre") && !(str(s, K.meta.objectifAutre) ?? "").trim()),
  });

  const destinations = arr(s, K.meta.destination);
  checks.push({
    id: "meta-destination",
    message:
      destinations.length === 0
        ? "Sélectionne au moins une destination après le clic."
        : "Précise l'autre destination sélectionnée.",
    satisfied:
      destinations.length > 0 &&
      !(destinations.includes("autre-page") && !(str(s, K.meta.destinationAutre) ?? "").trim()),
  });

  const mode = str(s, K.meta.mode);
  checks.push({
    id: "meta-mode",
    message: "Choisis une méthode de transmission Meta.",
    satisfied: Boolean(mode),
  });

  if (mode) {
    const exportImpossible = bool(s, K.meta.exportImpossible);
    if (mode === "export" && !exportImpossible) {
      checks.push({
        id: "meta-export",
        message: "Ajoute ton export Meta ou indique que tu n'arrives pas à l'exporter.",
        satisfied: readyCount(s, SLOT.metaExport) > 0,
      });
    }
    if (mode === "captures" || mode === "guide" || (mode === "export" && exportImpossible)) {
      checks.push({
        id: "meta-captures",
        message: "Ajoute au moins une capture Meta.",
        satisfied: readyCount(s, SLOT.metaCaptures) > 0,
      });
    }
  }

  const results = arr(s, K.meta.results);
  const resultsMissing = bool(s, K.meta.resultsMissing);
  if (!resultsMissing) {
    const autreOk = !(results.includes("autre") && !(str(s, K.meta.resultsAutre) ?? "").trim());
    const inconnuOk = !(results.includes("inconnu") && readyCount(s, SLOT.metaResults) === 0);
    checks.push({
      id: "meta-results",
      message:
        results.length === 0
          ? "Indique ce que compte la colonne Results, ou indique que tu ne trouves pas cette donnée."
          : !autreOk
            ? "Précise ce que compte la colonne Results."
            : "Ajoute une capture de la colonne Results, ou indique que tu ne trouves pas cette donnée.",
      satisfied: results.length > 0 && autreOk && inconnuOk,
    });
  }

  checks.push({
    id: "meta-tracking",
    message: "Indique si tu connais le système de suivi Meta installé.",
    satisfied: Boolean(str(s, K.meta.tracking)),
  });

  return checks;
}

/** Nombre d'exigences obligatoires actuellement applicables, et combien sont
 *  satisfaites — sert au calcul de progression centralisé (`collectionProgress`) et au
 *  statut par section affiché dans `ProgressBar`. */
export type RequirementSummary = { applicable: number; satisfied: number };

const summarize = (checks: Check[]): RequirementSummary => ({
  applicable: checks.length,
  satisfied: checks.filter((c) => c.satisfied).length,
});

export function youtubeRequirementSummary(s: CollectionState): RequirementSummary {
  return summarize(youtubeChecks(s));
}

export function metaRequirementSummary(s: CollectionState): RequirementSummary {
  return summarize(metaChecks(s));
}

/**
 * Liste complète des questions manquantes (résumé d'erreurs) : mêmes règles que
 * `youtubeChecks` ci-dessus, filtrées aux exigences non satisfaites.
 */
export function youtubeIssues(s: CollectionState): BlockerIssue[] {
  return youtubeChecks(s)
    .filter((c) => !c.satisfied)
    .map(({ id, message }) => ({ id, message }));
}

export function metaIssues(s: CollectionState): BlockerIssue[] {
  return metaChecks(s)
    .filter((c) => !c.satisfied)
    .map(({ id, message }) => ({ id, message }));
}

/**
 * YouTube — dérivé de `youtubeIssues` : ne renvoie que la première question manquante
 * (même ordre de priorité), pour l'usage côté serveur (session.server.ts) où un seul
 * message suffit à bloquer la soumission. Aucune condition métier n'est recopiée ici.
 */
export function youtubeBlocker(s: CollectionState): string | null {
  return youtubeIssues(s)[0]?.message ?? null;
}

/**
 * Meta — dérivé de `metaIssues`, voir la remarque de `youtubeBlocker` ci-dessus.
 */
export function metaBlocker(s: CollectionState): string | null {
  return metaIssues(s)[0]?.message ?? null;
}

/* ---------- Progression réelle et statut par section ---------- */

/** Exigences YouTube + Meta réellement applicables et satisfaites (Contenus n'a aucune
 *  exigence obligatoire, donc ne contribue jamais à ce total) — indépendant de toute
 *  consultation de page, utilisé à la fois pour `remaining` (« X exigences restantes »)
 *  et comme composante du calcul hybride ci-dessous. */
function requirementTotals(s: CollectionState): RequirementSummary {
  const yt = youtubeRequirementSummary(s);
  const meta = metaRequirementSummary(s);
  return { applicable: yt.applicable + meta.applicable, satisfied: yt.satisfied + meta.satisfied };
}

export type CollectionProgress = RequirementSummary & {
  /** `applicable - satisfied`, strictement les exigences YouTube/Meta encore
   *  manquantes — jamais masqué par le calcul hybride ci-dessous. */
  remaining: number;
  /** Jamais 100 tant que `remaining > 0` ou que la collecte n'a pas été réellement
   *  transmise (voir le clamp ci-dessous) : le calcul hybride ne masque jamais une
   *  réponse obligatoire manquante. */
  percent: number;
};

/**
 * Barème du modèle hybride — 100 points au total, répartis par étape :
 * - Introduction : 20 points dès sa consultation réelle (binaire).
 * - YouTube / Meta : 20 points chacune, au prorata de leurs exigences applicables
 *   satisfaites (continu — voir `youtubeRequirementSummary`/`metaRequirementSummary`).
 * - Contenus (facultatif) : 10 points dès sa consultation, 20 seulement après
 *   validation explicite (clic sur « Continuer vers Meta » — jamais la simple
 *   consultation, voir `contenusSectionState`) — jamais additifs (10 *ou* 20).
 * - Validation : 10 points dès sa consultation, 20 seulement après transmission
 *   réussie (`submittedAt`) — jamais additifs, même logique que Contenus.
 *
 * Exemple attendu : tout satisfait mais pas encore transmis (Introduction 20 + YouTube
 * 20 + Contenus 20 + Meta 20 + Validation consultée 10) = 90 % ; une fois transmis,
 * Validation passe à 20 = 100 %.
 */
const WEIGHT_BINARY = 20;
const WEIGHT_PROPORTIONAL = 20;
const WEIGHT_VISITED_ONLY = 10;
const WEIGHT_COMPLETED = 20;

/**
 * Calcul centralisé, unique source de la progression affichée — modèle hybride :
 * remplace l'ancien calcul fondé uniquement sur les exigences YouTube/Meta (qui restait
 * à 0 % tant qu'aucune de ces deux sections n'avait progressé, même après une lecture
 * réelle de l'introduction). Les champs `*Visited`/`contenusCompleted` sont les mêmes
 * signaux d'interface purs que `markVisited`/`markCompleted` dans le store — jamais
 * dérivés des réponses elles-mêmes. Une simple consultation de Contenus ou de
 * Validation ne suffit jamais à leur poids plein (voir le barème ci-dessus), pour ne
 * jamais rendre artificiellement obligatoires les questions facultatives de Contenus
 * tout en évitant qu'une simple ouverture de page gonfle la jauge comme une vraie
 * validation.
 */
export function collectionProgress(
  s: CollectionState,
  progress: {
    introductionVisited: boolean;
    contenusVisited: boolean;
    contenusCompleted: boolean;
    validationVisited: boolean;
  },
): CollectionProgress {
  const yt = youtubeRequirementSummary(s);
  const meta = metaRequirementSummary(s);
  const { applicable, satisfied } = requirementTotals(s);
  const remaining = applicable - satisfied;
  const submitted = s.submittedAt !== null;

  const introPoints = progress.introductionVisited ? WEIGHT_BINARY : 0;
  const ytPoints = yt.applicable > 0 ? WEIGHT_PROPORTIONAL * (yt.satisfied / yt.applicable) : 0;
  const contenusPoints = progress.contenusCompleted
    ? WEIGHT_COMPLETED
    : progress.contenusVisited
      ? WEIGHT_VISITED_ONLY
      : 0;
  const metaPoints = meta.applicable > 0 ? WEIGHT_PROPORTIONAL * (meta.satisfied / meta.applicable) : 0;
  const validationPoints = submitted
    ? WEIGHT_COMPLETED
    : progress.validationVisited
      ? WEIGHT_VISITED_ONLY
      : 0;

  const rawPercent = Math.floor(introPoints + ytPoints + contenusPoints + metaPoints + validationPoints);
  const percent = submitted && remaining === 0 ? 100 : Math.min(rawPercent, 99);
  return { applicable, satisfied, remaining, percent };
}

export type SectionState = "not-started" | "in-progress" | "done" | "needs-correction";

/**
 * YouTube / Meta : le statut dépend des exigences réellement satisfaites, et de
 * `attemptedInvalid` — un signal d'interface pur (jamais dérivé de l'état des
 * réponses lui-même) indiquant qu'une tentative de progression a déjà échoué sur
 * cette section. Sans nouvelle tentative bloquée, une section incomplète reste
 * simplement « En cours », jamais « À corriger ».
 */
function requirementSectionState(
  { applicable, satisfied }: RequirementSummary,
  attemptedInvalid: boolean,
): SectionState {
  if (satisfied >= applicable) return "done";
  if (attemptedInvalid) return "needs-correction";
  return satisfied > 0 ? "in-progress" : "not-started";
}

export function youtubeSectionState(s: CollectionState, attemptedInvalid: boolean): SectionState {
  return requirementSectionState(youtubeRequirementSummary(s), attemptedInvalid);
}

export function metaSectionState(s: CollectionState, attemptedInvalid: boolean): SectionState {
  return requirementSectionState(metaRequirementSummary(s), attemptedInvalid);
}

/**
 * Contenus : aucune exigence obligatoire n'y bloque jamais rien (voir `contenusSummary`
 * plus haut, toutes optionnelles), donc pas de notion de section « à corriger » ici —
 * mais une simple consultation (`visited`) ne vaut pas validation. Comme ses questions
 * sont facultatives, il n'existe pas de critère de complétion basé sur les réponses :
 * l'étape ne devient « Terminée » qu'après un clic explicite sur « Continuer vers Meta »
 * (`completed`, voir `markCompleted` dans le store) — ouvrir la page marque seulement
 * « En cours ». Jamais déduit des réponses elles-mêmes ni d'un index de page.
 */
export function contenusSectionState(visited: boolean, completed: boolean): SectionState {
  if (completed) return "done";
  return visited ? "in-progress" : "not-started";
}

/**
 * Introduction : page purement informative, sans réponse propre. « Terminée » dès sa
 * consultation réelle (`visited`, même signal que `collectionProgress`) — jamais déduit
 * de l'avancement d'une autre section ni de la position de la page courante.
 */
export function introductionSectionState(visited: boolean): SectionState {
  return visited ? "done" : "not-started";
}

/**
 * Validation : « Terminée » seulement une fois réellement transmise au serveur (voir
 * `state.submittedAt`) — avoir simplement rempli toutes les exigences ne suffit pas
 * tant que l'envoi n'a pas eu lieu. « En cours » dépend d'avoir réellement consulté
 * cette étape (`visited`, un signal d'interface pur — voir `markVisited` dans le
 * store), jamais du seul avancement de YouTube/Meta : sans ce garde-fou, remplir une
 * autre section suffisait à afficher « En cours » ici alors que Validation n'avait
 * jamais été ouverte.
 */
export function validationSectionState(
  s: CollectionState,
  attemptedInvalid: boolean,
  visited: boolean,
): SectionState {
  if (s.submittedAt !== null) return "done";
  const { applicable, satisfied } = requirementTotals(s);
  if (applicable > satisfied && attemptedInvalid) return "needs-correction";
  return visited ? "in-progress" : "not-started";
}