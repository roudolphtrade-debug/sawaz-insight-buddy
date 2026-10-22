import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  emptyReviewContent,
  normalizeReviewCharts,
  normalizeReviewContent,
  type ReviewChart,
  type ReviewContent,
  type ReviewStatus,
} from "@/lib/studio/review-content";

/**
 * Pass 3E — Sawaz Strategic Review Workflow.
 * Toutes les écritures passent par la RLS (can_write_client / is_owner) et par
 * les triggers d'immutabilité : une version publiée n'est plus modifiable, la
 * publication est réservée au rôle owner.
 * Garde-fou côté serveur : seules les métriques `valide` et les analyses
 * non-internes (jamais une note) peuvent alimenter le contenu client.
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type ReviewVersionSummary = {
  id: string;
  versionNo: number;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  publishedAt: string | null;
};

export type ReviewSummary = {
  id: string;
  clientId: string;
  projectId: string;
  projectName: string;
  collectionId: string | null;
  status: ReviewStatus;
  publishedAt: string | null;
  currentVersionId: string | null;
  versions: ReviewVersionSummary[];
};

export type EligibleMetric = {
  id: string;
  metricKey: string;
  platform: string | null;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  provenance: string;
  sourceFileName: string | null;
  confidence: number | null;
};

export type EligibleAnalysis = {
  id: string;
  type: "constat" | "hypothese" | "recommandation";
  title: string | null;
  body: string | null;
};

export type ReviewTheme = {
  name: string;
  slug: string;
  brand: Record<string, string>;
  tokens: Record<string, string>;
};

export type ReviewWorkspace = {
  role: "owner" | "analyst" | "viewer" | null;
  review: ReviewSummary;
  version: ReviewVersionSummary;
  content: ReviewContent;
  charts: ReviewChart[];
  metrics: EligibleMetric[];
  analyses: EligibleAnalysis[];
  theme: ReviewTheme;
};

async function resolveRole(supabase: { from: (t: string) => any }, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (roles.includes("owner")) return "owner" as const;
  if (roles.includes("analyst")) return "analyst" as const;
  if (roles.includes("viewer")) return "viewer" as const;
  return null;
}

async function loadEligible(supabase: any, clientId: string) {
  const [metrics, analyses, files] = await Promise.all([
    supabase
      .from("extracted_metrics")
      .select("*")
      .eq("client_id", clientId)
      .eq("review_status", "valide")
      .order("metric_key"),
    supabase
      .from("analyses")
      .select("id, type, title, body, visibility")
      .eq("client_id", clientId)
      .neq("type", "note")
      .neq("visibility", "internal"),
    supabase.from("files").select("id, original_name").eq("client_id", clientId),
  ]);

  const fileName = new Map<string, string>(
    (files.data ?? []).map((f: { id: string; original_name: string }) => [f.id, f.original_name]),
  );

  const eligibleMetrics: EligibleMetric[] = (metrics.data ?? []).map((m: any) => ({
    id: m.id,
    metricKey: m.metric_key,
    platform: m.platform,
    valueNum: m.value_num === null ? null : Number(m.value_num),
    valueText: m.value_text,
    unit: m.unit,
    periodStart: m.period_start,
    periodEnd: m.period_end,
    provenance: m.provenance,
    sourceFileName: m.source_file_id ? (fileName.get(m.source_file_id) ?? null) : null,
    confidence: m.confidence === null ? null : Number(m.confidence),
  }));

  const eligibleAnalyses: EligibleAnalysis[] = (analyses.data ?? []).map((a: any) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    body: a.body,
  }));

  return { eligibleMetrics, eligibleAnalyses };
}

function toSummary(review: any, versions: any[], projectName: string): ReviewSummary {
  return {
    id: review.id,
    clientId: review.client_id,
    projectId: review.project_id,
    projectName,
    collectionId: review.collection_id,
    status: review.status,
    publishedAt: review.published_at,
    currentVersionId: review.current_version_id,
    versions: versions
      .map((v) => ({
        id: v.id,
        versionNo: v.version_no,
        status: v.status as ReviewStatus,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
        approvedAt: v.approved_at,
        publishedAt: v.published_at,
      }))
      .sort((a, b) => b.versionNo - a.versionNo),
  };
}

export const listClientReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string }) => ({ clientId: String(input.clientId ?? "") }))
  .handler(async ({ data, context }): Promise<Result<ReviewSummary[]>> => {
    const { supabase } = context;
    const [reviews, versions, projects] = await Promise.all([
      supabase
        .from("reviews")
        .select("*")
        .eq("client_id", data.clientId)
        .order("created_at", { ascending: false }),
      supabase.from("review_versions").select("*").eq("client_id", data.clientId),
      supabase.from("projects").select("id, name").eq("client_id", data.clientId),
    ]);

    if (reviews.error) return { ok: false, error: "Lecture des reviews impossible" };
    const projectName = new Map((projects.data ?? []).map((p) => [p.id, p.name] as const));

    return {
      ok: true,
      data: (reviews.data ?? []).map((r) =>
        toSummary(
          r,
          (versions.data ?? []).filter((v) => v.review_id === r.id),
          projectName.get(r.project_id ?? "") ?? "Projet",
        ),
      ),
    };
  });

/** Crée une Review (draft) depuis une collecte/soumission + sa version 1. */
export const createReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      clientId: string;
      projectId: string;
      collectionId?: string | null;
      title?: string;
      periodLabel?: string;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<Result<{ reviewId: string; versionId: string }>> => {
    const { supabase, userId } = context;

    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        client_id: data.clientId,
        project_id: data.projectId,
        collection_id: data.collectionId ?? null,
        status: "draft",
      })
      .select("id")
      .maybeSingle();

    if (error || !review) return { ok: false, error: "Création refusée (droits insuffisants)" };

    const content = emptyReviewContent(
      data.title?.trim() || "Strategic Review",
      data.periodLabel ?? "",
    );

    const { data: version, error: vErr } = await supabase
      .from("review_versions")
      .insert({
        review_id: review.id,
        client_id: data.clientId,
        version_no: 1,
        content: content as never,
        charts: [] as never,
        status: "draft",
        created_by: userId,
      })
      .select("id")
      .maybeSingle();

    if (vErr || !version) return { ok: false, error: "Création de la version 1 refusée" };

    await supabase.from("reviews").update({ current_version_id: version.id }).eq("id", review.id);
    await supabase.from("audit_logs").insert({
      client_id: data.clientId,
      actor_type: "user",
      actor_id: userId,
      action: "review.created",
      entity_type: "review",
      entity_id: review.id,
    });

    return { ok: true, data: { reviewId: review.id, versionId: version.id } };
  });

export const getReviewWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reviewId: string; versionId?: string | null }) => input)
  .handler(async ({ data, context }): Promise<Result<ReviewWorkspace>> => {
    const { supabase, userId } = context;
    const role = await resolveRole(supabase as never, userId);

    const { data: review } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", data.reviewId)
      .maybeSingle();
    if (!review) return { ok: false, error: "Review introuvable ou accès refusé" };

    const [versionsRes, projectRes, clientRes] = await Promise.all([
      supabase.from("review_versions").select("*").eq("review_id", review.id),
      supabase.from("projects").select("name").eq("id", review.project_id ?? "").maybeSingle(),
      supabase
        .from("clients")
        .select("name, slug, brand, theme_tokens")
        .eq("id", review.client_id)
        .maybeSingle(),
    ]);

    const versions = (versionsRes.data ?? []).sort((a, b) => b.version_no - a.version_no);
    const target =
      versions.find((v) => v.id === data.versionId) ??
      versions.find((v) => v.id === review.current_version_id) ??
      versions[0];
    if (!target) return { ok: false, error: "Aucune version disponible" };

    const { eligibleMetrics, eligibleAnalyses } = await loadEligible(supabase, review.client_id);
    const metricIds = eligibleMetrics.map((m) => m.id);
    const analysisIds = eligibleAnalyses.map((a) => a.id);

    const summary = toSummary(review, versions, projectRes.data?.name ?? "Projet");
    const version = summary.versions.find((v) => v.id === target.id)!;

    return {
      ok: true,
      data: {
        role,
        review: summary,
        version,
        content: normalizeReviewContent(target.content, {
          allowedMetricIds: metricIds,
          allowedAnalysisIds: analysisIds,
        }),
        charts: normalizeReviewCharts(target.charts, metricIds),
        metrics: eligibleMetrics,
        analyses: eligibleAnalyses,
        theme: {
          name: clientRes.data?.name ?? "Client",
          slug: clientRes.data?.slug ?? "",
          brand: (clientRes.data?.brand ?? {}) as Record<string, string>,
          tokens: (clientRes.data?.theme_tokens ?? {}) as Record<string, string>,
        },
      },
    };
  });

/**
 * Enregistre le contenu d'une version.
 * Si la version ciblée est publiée/archivée, une nouvelle version version_no + 1
 * est créée en draft : une version publiée reste immuable.
 */
export const saveReviewVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { versionId: string; content: unknown; charts: unknown }) => input,
  )
  .handler(
    async ({ data, context }): Promise<Result<{ versionId: string; forked: boolean }>> => {
      const { supabase, userId } = context;

      const { data: current } = await supabase
        .from("review_versions")
        .select("*")
        .eq("id", data.versionId)
        .maybeSingle();
      if (!current) return { ok: false, error: "Version introuvable ou accès refusé" };

      const { eligibleMetrics, eligibleAnalyses } = await loadEligible(
        supabase,
        current.client_id,
      );
      const metricIds = eligibleMetrics.map((m) => m.id);
      const content = normalizeReviewContent(data.content, {
        allowedMetricIds: metricIds,
        allowedAnalysisIds: eligibleAnalyses.map((a) => a.id),
      });
      const charts = normalizeReviewCharts(data.charts, metricIds);

      const immutable = current.status === "published" || current.status === "archived";

      if (immutable) {
        const { data: siblings } = await supabase
          .from("review_versions")
          .select("version_no")
          .eq("review_id", current.review_id);
        const next = Math.max(...(siblings ?? []).map((v) => v.version_no), 0) + 1;

        const { data: created, error } = await supabase
          .from("review_versions")
          .insert({
            review_id: current.review_id,
            client_id: current.client_id,
            version_no: next,
            content: content as never,
            charts: charts as never,
            status: "draft",
            created_by: userId,
          })
          .select("id")
          .maybeSingle();

        if (error || !created) return { ok: false, error: "Nouvelle version refusée" };

        await supabase.from("audit_logs").insert({
          client_id: current.client_id,
          actor_type: "user",
          actor_id: userId,
          action: "review_version.forked",
          entity_type: "review_version",
          entity_id: created.id,
          metadata: { from_version: current.version_no, to_version: next } as never,
        });

        return { ok: true, data: { versionId: created.id, forked: true } };
      }

      const { error } = await supabase
        .from("review_versions")
        .update({ content: content as never, charts: charts as never })
        .eq("id", current.id);

      if (error) return { ok: false, error: "Enregistrement refusé (droits insuffisants)" };

      await supabase.from("audit_logs").insert({
        client_id: current.client_id,
        actor_type: "user",
        actor_id: userId,
        action: "review_version.saved",
        entity_type: "review_version",
        entity_id: current.id,
      });

      return { ok: true, data: { versionId: current.id, forked: false } };
    },
  );

const ALLOWED: Record<string, string[]> = {
  draft: ["in_review"],
  in_review: ["approved", "draft"],
  approved: ["published", "in_review"],
  published: ["archived"],
  archived: [],
};

/** Workflow Draft → In Review → Approved → Published (publication : owner uniquement). */
export const transitionReviewVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { versionId: string; to: ReviewStatus }) => input)
  .handler(
    async ({
      data,
      context,
    }): Promise<Result<{ status: ReviewStatus; access: { url: string; notified: string[] } | null }>> => {
    const { supabase, userId } = context;
    const role = await resolveRole(supabase as never, userId);

    const { data: version } = await supabase
      .from("review_versions")
      .select("*")
      .eq("id", data.versionId)
      .maybeSingle();
    if (!version) return { ok: false, error: "Version introuvable ou accès refusé" };

    if (!(ALLOWED[version.status] ?? []).includes(data.to)) {
      return { ok: false, error: `Transition ${version.status} → ${data.to} non autorisée` };
    }
    if ((data.to === "published" || data.to === "archived") && role !== "owner") {
      return { ok: false, error: "Publication réservée au rôle owner" };
    }

    const patch: Record<string, unknown> = { status: data.to };
    if (data.to === "approved") {
      patch['approved_by'] = userId;
      patch['approved_at'] = new Date().toISOString();
    }
    if (data.to === "published") patch['published_at'] = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("review_versions")
      .update(patch as never)
      .eq("id", version.id)
      .select("*")
      .maybeSingle();

    if (error || !updated) return { ok: false, error: "Transition refusée (droits insuffisants)" };

    const reviewPatch: Record<string, unknown> = { status: data.to, current_version_id: version.id };
    if (data.to === "published") reviewPatch['published_at'] = updated.published_at;
    await supabase.from("reviews").update(reviewPatch as never).eq("id", version.review_id);

    await supabase.from("audit_logs").insert({
      client_id: version.client_id,
      actor_type: "user",
      actor_id: userId,
      action: `review_version.${data.to}`,
      entity_type: "review_version",
      entity_id: version.id,
      metadata: { from: version.status, to: data.to, version_no: version.version_no } as never,
    });

    // Pass 3F — la publication ouvre l'accès client : lien sécurisé + notification idempotente.
    let access: { url: string; notified: string[] } | null = null;
    if (data.to === "published") {
      const link = await import("@/lib/review-access/review-link.server");
      const content = normalizeReviewContent(updated.content, {
        allowedMetricIds: [],
        allowedAnalysisIds: [],
      });
      const issued = await link.issueReviewLink({
        clientId: version.client_id,
        reviewId: version.review_id,
        versionId: version.id,
        createdBy: userId,
      });
      const outcomes = await link.notifyReviewPublished({
        clientId: version.client_id,
        versionId: version.id,
        reviewTitle: content.title || "Strategic Review",
        periodLabel: content.periodLabel,
        url: issued.url,
      });
      access = { url: issued.url, notified: outcomes.filter((o) => o.sent).map((o) => o.recipient) };
    }

    if (data.to === "archived") {
      const link = await import("@/lib/review-access/review-link.server");
      await link.revokeReviewLinks(version.review_id, userId);
    }

      return { ok: true, data: { status: data.to, access } };
    },
  );
