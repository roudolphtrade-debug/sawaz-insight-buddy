/**
 * Qualification métier des réponses (Sawaz Pilot) : couche de présentation pure,
 * sans dépendance serveur ni navigateur, testée indépendamment de React.
 *
 * La qualification (table `submission_qualifications`, Sawaz Core) est une décision
 * Sawaz distincte de la donnée brute : elle n'est jamais fusionnée avec la
 * submission, seulement juxtaposée dans une vue applicative `submission + qualification`.
 */

export const CLASSIFICATIONS = ["reference", "historical", "draft", "test", "excluded"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const ATTRIBUTION_SOURCES = ["technical", "manual_sawaz", "unknown"] as const;
export type AttributionSource = (typeof ATTRIBUTION_SOURCES)[number];

export type StudioQualification = {
  id: string;
  classification: Classification;
  includedInAnalysis: boolean;
  respondentLabel: string | null;
  attributionSource: AttributionSource;
  reason: string | null;
  qualifiedBy: string | null;
  qualifiedAt: string;
};

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  reference: "Référence",
  historical: "Historique",
  draft: "Brouillon",
  test: "Test",
  excluded: "Exclue",
};

/** Libellé d'une réponse sans qualification (ou qualification illisible). */
export const UNQUALIFIED_LABEL = "À qualifier";

export const ATTRIBUTION_LABEL: Record<AttributionSource, string> = {
  technical: "Identité technique",
  manual_sawaz: "Attribution Sawaz",
  unknown: "Source inconnue",
};

export const SUBMISSION_STATUS_LABEL: Record<string, string> = {
  submitted: "Soumise",
  working: "En cours",
};

export const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  analyst: "Analyste",
  viewer: "Lecteur",
};

export function roleLabel(role: string | null): string {
  return role ? (ROLE_LABEL[role] ?? "Rôle inconnu") : "Aucun rôle";
}

export function submissionStatusLabel(status: string): string {
  return SUBMISSION_STATUS_LABEL[status] ?? "Statut inconnu";
}

const isClassification = (value: unknown): value is Classification =>
  typeof value === "string" && (CLASSIFICATIONS as readonly string[]).includes(value);

const isAttributionSource = (value: unknown): value is AttributionSource =>
  typeof value === "string" && (ATTRIBUTION_SOURCES as readonly string[]).includes(value);

const optionalText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/**
 * Relit une ligne `submission_qualifications` reçue de la base (la table n'apparaît
 * pas encore dans les types générés). Une ligne incomplète ou incohérente est
 * ignorée : la réponse s'affiche alors « À qualifier », jamais comme une référence.
 */
export function parseQualificationRow(
  raw: unknown,
): (StudioQualification & { submissionId: string }) | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = row["id"];
  const submissionId = row["submission_id"];
  const qualifiedAt = row["qualified_at"];
  if (
    typeof id !== "string" ||
    typeof submissionId !== "string" ||
    typeof qualifiedAt !== "string"
  ) {
    return null;
  }
  if (!isClassification(row["classification"]) || !isAttributionSource(row["attribution_source"])) {
    return null;
  }
  const classification = row["classification"];
  const includedInAnalysis = row["included_in_analysis"] === true;
  // Mêmes invariants que les contraintes de la base.
  if (classification === "reference" && !includedInAnalysis) return null;
  if (["test", "excluded", "draft"].includes(classification) && includedInAnalysis) return null;
  return {
    id,
    submissionId,
    classification,
    includedInAnalysis,
    respondentLabel: optionalText(row["respondent_label"]),
    attributionSource: row["attribution_source"],
    reason: optionalText(row["reason"]),
    qualifiedBy: typeof row["qualified_by"] === "string" ? row["qualified_by"] : null,
    qualifiedAt,
  };
}

export function qualificationLabel(qualification: StudioQualification | null): string {
  return qualification ? CLASSIFICATION_LABEL[qualification.classification] : UNQUALIFIED_LABEL;
}

/** Vue applicative minimale requise par les calculs ci-dessous. */
export type QualifiedSubmission = {
  id: string;
  status: string;
  submittedAt: string | null;
  updatedAt: string;
  answers: readonly unknown[];
  files: readonly unknown[];
  qualification: StudioQualification | null;
};

/** Seule une qualification explicite `included_in_analysis = true` alimente le corpus. */
export function isInActiveCorpus(submission: Pick<QualifiedSubmission, "qualification">): boolean {
  return submission.qualification?.includedInAnalysis === true;
}

const byMostRecent = <T extends Pick<QualifiedSubmission, "submittedAt" | "updatedAt">>(
  a: T,
  b: T,
) => (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt);

/** Corpus actif d'abord, historique ensuite ; chaque groupe du plus récent au plus ancien. */
export function partitionSubmissions<T extends QualifiedSubmission>(submissions: readonly T[]) {
  const active = submissions.filter(isInActiveCorpus).sort(byMostRecent);
  const history = submissions.filter((s) => !isInActiveCorpus(s)).sort(byMostRecent);
  return { active, history };
}

export type Respondent = { label: string; attributionSource: AttributionSource };

export type ActiveCorpus = {
  references: number;
  respondents: Respondent[];
  documents: number;
  lastReferenceAt: string | null;
  /** Historique, essais et réponses non retenues : jamais comptés dans le corpus. */
  historyCount: number;
  historyByLabel: { label: string; count: number }[];
};

/** KPI du dossier : uniquement les submissions incluses dans l'analyse. */
export function activeCorpus(submissions: readonly QualifiedSubmission[]): ActiveCorpus {
  const { active, history } = partitionSubmissions(submissions);

  const respondents: Respondent[] = [];
  for (const s of active) {
    const label = s.qualification?.respondentLabel;
    if (!label || respondents.some((r) => r.label === label)) continue;
    respondents.push({ label, attributionSource: s.qualification?.attributionSource ?? "unknown" });
  }

  const counts = new Map<string, number>();
  for (const s of history) {
    const label = qualificationLabel(s.qualification);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return {
    references: active.length,
    respondents,
    documents: active.reduce((total, s) => total + s.files.length, 0),
    lastReferenceAt: active.find((s) => s.submittedAt)?.submittedAt ?? null,
    historyCount: history.length,
    historyByLabel: [...counts].map(([label, count]) => ({ label, count })),
  };
}

/* ---------- Documents ---------- */

export type FileGroupId = "youtube" | "meta" | "autres";

export const FILE_GROUP_LABEL: Record<FileGroupId, string> = {
  youtube: "YouTube",
  meta: "Meta",
  autres: "Autres",
};

/** Emplacements YouTube (`yt.*`, contenus `c.*`) et Meta (`m.*`) ; le reste en « Autres ». */
export function fileGroupOf(slot: string): FileGroupId {
  if (slot.startsWith("yt.") || slot.startsWith("c.")) return "youtube";
  if (slot.startsWith("m.")) return "meta";
  return "autres";
}

export function groupFiles<T extends { slot: string }>(files: readonly T[]) {
  return (["youtube", "meta", "autres"] as const)
    .map((id) => ({
      id,
      label: FILE_GROUP_LABEL[id],
      files: files.filter((f) => fileGroupOf(f.slot) === id),
    }))
    .filter((group) => group.files.length > 0);
}

const SLOT_LABEL: Record<string, string> = {
  "yt.export": "Export",
  "yt.capture.overview": "Vue d’ensemble",
  "yt.capture.content": "Contenu",
  "yt.capture.audience": "Audience",
  "c.guideVip": "Guide VIP",
  "c.dixVideos": "10 vidéos récentes",
  "c.traffic": "Sources de trafic",
  "c.newReturning": "Nouveaux et récurrents",
  "m.export": "Export",
  "m.captures": "Captures",
  "m.results": "Résultats",
};

/** Libellé de l'emplacement, sans la plateforme (déjà portée par le groupe). */
export function slotLabel(slot: string): string {
  return SLOT_LABEL[slot] ?? "Document";
}

/* ---------- Formats ---------- */

const parisDate = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const parisTime = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
});

/** « 21 oct. 2026 · 13:39 », heure de Paris. */
export function formatParisDateTime(value: string | null): string {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return `${parisDate.format(date)} · ${parisTime.format(date)}`;
}

/** « 1,2 Mo », « 340 Ko ». */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return "Taille inconnue";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

/* ---------- Restitutions ---------- */

/**
 * Restitutions de la même mission et de la même collecte : la plus récente reste dans
 * le parcours principal, les autres sont présentées comme historique (jamais fusionnées
 * ni supprimées). Ordre d'entrée conservé à défaut de date de création.
 */
export function splitReviews<
  T extends { projectId: string; collectionId: string | null; createdAt: string | null },
>(reviews: readonly T[]) {
  const sorted = [...reviews].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const seen = new Set<string>();
  const primary: T[] = [];
  const older: T[] = [];
  for (const review of sorted) {
    const key = `${review.projectId}|${review.collectionId ?? "-"}`;
    if (seen.has(key)) older.push(review);
    else {
      seen.add(key);
      primary.push(review);
    }
  }
  return { primary, older };
}
