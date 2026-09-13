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

/* ---------- Liste complète des questions manquantes (source unique des règles) ---------- */

/**
 * YouTube
 * Source unique des règles de validation YouTube : la méthode choisie détermine
 * précisément les éléments requis. `youtubeBlocker` (utilisé côté serveur dans
 * session.server.ts) est *dérivé* de cette liste — voir plus bas — afin qu'aucune
 * condition métier ne soit jamais recopiée entre les deux.
 */
export function youtubeIssues(s: CollectionState): BlockerIssue[] {
  const issues: BlockerIssue[] = [];
  const mode = str(s, K.yt.mode);

  if (!mode) {
    issues.push({ id: "yt-mode", message: "Choisis une méthode de transmission YouTube." });
    return issues;
  }

  const exportImpossible = bool(s, K.yt.exportImpossible);

  if (mode === "export" && !exportImpossible) {
    if (readyCount(s, SLOT.ytExport) === 0) {
      issues.push({
        id: "yt-export",
        message: "Ajoute ton export YouTube ou indique que tu n'arrives pas à l'exporter.",
      });
    }
    return issues;
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
      if (readyCount(s, capture.slot) === 0 && !bool(s, capture.missingKey)) {
        issues.push({
          id: capture.id,
          message: `Ajoute la capture ${capture.label}, ou indique que tu ne trouves pas cet écran.`,
        });
      }
    }
  }

  return issues;
}

/**
 * Meta
 * Source unique des règles de validation Meta (voir la remarque de `youtubeIssues`
 * ci-dessus) : chaque question marquée Obligatoire ou Conditionnelle est contrôlée
 * dans l'ordre où elle apparaît à l'écran.
 */
export function metaIssues(s: CollectionState): BlockerIssue[] {
  const issues: BlockerIssue[] = [];

  const periode = str(s, K.meta.periode);
  const periodeAutre = (str(s, K.meta.periodeAutre) ?? "").trim();
  if (!periode) {
    issues.push({ id: "meta-periode", message: "Sélectionne la période que tu vas nous transmettre." });
  } else if (periode === "autre" && !periodeAutre) {
    issues.push({ id: "meta-periode", message: "Précise la période que tu vas nous transmettre." });
  }

  const objectifs = arr(s, K.meta.objectifs);
  if (objectifs.length === 0) {
    issues.push({ id: "meta-objectifs", message: "Sélectionne au moins un objectif de campagne Meta." });
  } else if (objectifs.includes("autre") && !(str(s, K.meta.objectifAutre) ?? "").trim()) {
    issues.push({ id: "meta-objectifs", message: "Précise l'autre objectif de campagne sélectionné." });
  }

  const destinations = arr(s, K.meta.destination);
  if (destinations.length === 0) {
    issues.push({ id: "meta-destination", message: "Sélectionne au moins une destination après le clic." });
  } else if (destinations.includes("autre-page") && !(str(s, K.meta.destinationAutre) ?? "").trim()) {
    issues.push({ id: "meta-destination", message: "Précise l'autre destination sélectionnée." });
  }

  const mode = str(s, K.meta.mode);
  if (!mode) {
    issues.push({ id: "meta-mode", message: "Choisis une méthode de transmission Meta." });
  } else {
    const exportImpossible = bool(s, K.meta.exportImpossible);
    if (mode === "export" && !exportImpossible && readyCount(s, SLOT.metaExport) === 0) {
      issues.push({
        id: "meta-export",
        message: "Ajoute ton export Meta ou indique que tu n'arrives pas à l'exporter.",
      });
    }
    if (
      (mode === "captures" || mode === "guide" || (mode === "export" && exportImpossible)) &&
      readyCount(s, SLOT.metaCaptures) === 0
    ) {
      issues.push({ id: "meta-captures", message: "Ajoute au moins une capture Meta." });
    }
  }

  const results = arr(s, K.meta.results);
  const resultsMissing = bool(s, K.meta.resultsMissing);
  if (!resultsMissing) {
    if (results.length === 0) {
      issues.push({
        id: "meta-results",
        message: "Indique ce que compte la colonne Results, ou indique que tu ne trouves pas cette donnée.",
      });
    } else if (results.includes("autre") && !(str(s, K.meta.resultsAutre) ?? "").trim()) {
      issues.push({ id: "meta-results", message: "Précise ce que compte la colonne Results." });
    } else if (results.includes("inconnu") && readyCount(s, SLOT.metaResults) === 0) {
      issues.push({
        id: "meta-results",
        message: "Ajoute une capture de la colonne Results, ou indique que tu ne trouves pas cette donnée.",
      });
    }
  }

  if (!str(s, K.meta.tracking)) {
    issues.push({ id: "meta-tracking", message: "Indique si tu connais le système de suivi Meta installé." });
  }

  return issues;
}

/* ---------- Validation du parcours (dérivée des listes ci-dessus) ---------- */

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