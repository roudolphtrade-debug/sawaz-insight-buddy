/**
 * Pass 3E — Strategic Review : structure de contenu d'une version.
 * Module client-safe (aucun accès serveur) : types + normalisation partagés
 * entre le builder interne et la Preview client.
 */

export type ReviewBlockKind = "fait" | "interpretation" | "hypothese" | "recommandation";

export type ReviewBlock = {
  id: string;
  kind: ReviewBlockKind;
  title: string;
  body: string;
  /** Traçabilité : métriques validées à l'origine du bloc. */
  sourceMetricIds: string[];
  /** Analyse interne (constat/hypothèse/recommandation) reprise, jamais une note. */
  analysisId?: string | null;
};

export type ReviewAction = {
  id: string;
  label: string;
  detail: string;
  owner: "sawaz" | "client" | "partage";
  horizon: string;
};

export type ReviewChart = {
  id: string;
  title: string;
  type: "bar" | "line";
  /** Provenance : métriques validées uniquement. */
  sourceMetricIds: string[];
  periodStart: string | null;
  periodEnd: string | null;
  generatedAt: string;
  points: { label: string; value: number; unit?: string | null; metricId?: string | undefined }[];
};

export type ReviewCtaType = "aucun" | "etape_suivante" | "contact" | "rendez_vous" | "personnalise";

export type ReviewCta = {
  type: ReviewCtaType;
  label: string;
  url: string;
  helper: string;
};

export type ReviewContent = {
  title: string;
  periodLabel: string;
  executiveSummary: string;
  blocks: ReviewBlock[];
  actions: ReviewAction[];
  cta: ReviewCta;
};

export const BLOCK_LABEL: Record<ReviewBlockKind, string> = {
  fait: "Fait observé",
  interpretation: "Interprétation",
  hypothese: "Hypothèse",
  recommandation: "Recommandation",
};

export const BLOCK_HINT: Record<ReviewBlockKind, string> = {
  fait: "Mesuré, non discutable — issu d'une métrique validée.",
  interpretation: "Lecture argumentée d'un fait, assumée par Sawaz.",
  hypothese: "Piste à confirmer, encore incertaine.",
  recommandation: "Action proposée, dérivée des faits et interprétations.",
};

export const CTA_LABEL: Record<ReviewCtaType, string> = {
  aucun: "Aucun CTA",
  etape_suivante: "Étape suivante",
  contact: "Contacter Sawaz",
  rendez_vous: "Planifier un échange",
  personnalise: "Personnalisé",
};

export const BLOCK_KINDS: ReviewBlockKind[] = [
  "fait",
  "interpretation",
  "hypothese",
  "recommandation",
];

export const EMPTY_CTA: ReviewCta = { type: "aucun", label: "", url: "", helper: "" };

export function emptyReviewContent(title: string, periodLabel = ""): ReviewContent {
  return {
    title,
    periodLabel,
    executiveSummary: "",
    blocks: [],
    actions: [],
    cta: EMPTY_CTA,
  };
}

const isKind = (v: unknown): v is ReviewBlockKind =>
  typeof v === "string" && (BLOCK_KINDS as string[]).includes(v);

/**
 * Normalise un contenu venant de la base ou du client.
 * `allowedMetricIds` / `allowedAnalysisIds` : garde-fou anti-fuite — toute
 * référence à une métrique non validée ou à une analyse interne est retirée.
 */
export function normalizeReviewContent(
  raw: unknown,
  opts?: { allowedMetricIds?: string[]; allowedAnalysisIds?: string[] },
): ReviewContent {
  const r = (raw ?? {}) as Partial<ReviewContent>;
  const metricOk = opts?.allowedMetricIds ? new Set(opts.allowedMetricIds) : null;
  const analysisOk = opts?.allowedAnalysisIds ? new Set(opts.allowedAnalysisIds) : null;
  const keepMetrics = (ids: unknown) =>
    (Array.isArray(ids) ? ids : [])
      .map(String)
      .filter((id) => (metricOk ? metricOk.has(id) : true));

  const ctaRaw = (r.cta ?? EMPTY_CTA) as ReviewCta;
  const ctaType: ReviewCtaType = (
    ["aucun", "etape_suivante", "contact", "rendez_vous", "personnalise"] as string[]
  ).includes(ctaRaw.type)
    ? ctaRaw.type
    : "aucun";

  return {
    title: String(r.title ?? ""),
    periodLabel: String(r.periodLabel ?? ""),
    executiveSummary: String(r.executiveSummary ?? ""),
    blocks: (Array.isArray(r.blocks) ? r.blocks : [])
      .filter((b) => isKind((b as ReviewBlock)?.kind))
      .map((b) => {
        const block = b as ReviewBlock;
        const analysisId = block.analysisId ?? null;
        return {
          id: String(block.id ?? crypto.randomUUID()),
          kind: block.kind,
          title: String(block.title ?? ""),
          body: String(block.body ?? ""),
          sourceMetricIds: keepMetrics(block.sourceMetricIds),
          analysisId: analysisId && (!analysisOk || analysisOk.has(analysisId)) ? analysisId : null,
        };
      }),
    actions: (Array.isArray(r.actions) ? r.actions : []).map((a) => {
      const action = a as ReviewAction;
      return {
        id: String(action.id ?? crypto.randomUUID()),
        label: String(action.label ?? ""),
        detail: String(action.detail ?? ""),
        owner: (["sawaz", "client", "partage"] as string[]).includes(action.owner)
          ? action.owner
          : "sawaz",
        horizon: String(action.horizon ?? ""),
      };
    }),
    cta: {
      type: ctaType,
      label: String(ctaRaw.label ?? ""),
      url: String(ctaRaw.url ?? ""),
      helper: String(ctaRaw.helper ?? ""),
    },
  };
}

export function normalizeReviewCharts(raw: unknown, allowedMetricIds?: string[]): ReviewChart[] {
  const metricOk = allowedMetricIds ? new Set(allowedMetricIds) : null;
  return (Array.isArray(raw) ? raw : [])
    .map((c) => {
      const chart = c as ReviewChart;
      const sources = (Array.isArray(chart.sourceMetricIds) ? chart.sourceMetricIds : [])
        .map(String)
        .filter((id) => (metricOk ? metricOk.has(id) : true));
      return {
        id: String(chart.id ?? crypto.randomUUID()),
        title: String(chart.title ?? ""),
        type: chart.type === "line" ? ("line" as const) : ("bar" as const),
        sourceMetricIds: sources,
        periodStart: chart.periodStart ?? null,
        periodEnd: chart.periodEnd ?? null,
        generatedAt: String(chart.generatedAt ?? new Date().toISOString()),
        points: (Array.isArray(chart.points) ? chart.points : [])
          .filter((p) => !metricOk || !p.metricId || metricOk.has(String(p.metricId)))
          .map((p) => ({
            label: String(p.label ?? ""),
            value: Number(p.value ?? 0),
            unit: p.unit ?? null,
            metricId: p.metricId ? String(p.metricId) : undefined,
          })),
      };
    })
    .filter((c) => c.sourceMetricIds.length > 0 && c.points.length > 0);
}

export type ReviewStatus = "draft" | "in_review" | "approved" | "published" | "archived";

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  draft: "Brouillon",
  in_review: "En revue",
  approved: "Approuvée",
  published: "Publiée",
  archived: "Archivée",
};

/** Transitions autorisées du workflow éditorial. */
export const NEXT_STATUS: Record<ReviewStatus, ReviewStatus[]> = {
  draft: ["in_review"],
  in_review: ["approved", "draft"],
  approved: ["published", "in_review"],
  published: ["archived"],
  archived: [],
};
