import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Results Studio — lecture et écriture des données réelles (Pass 3D).
 * Toutes les requêtes passent par le client authentifié : la RLS s'applique en tant
 * qu'utilisateur Sawaz (isolation tenant via has_client_access / can_write_client).
 * Aucun dataset client n'est codé en dur.
 */

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string };
type Result<T> = Ok<T> | Err;

export type StudioRole = "owner" | "analyst" | "viewer" | null;

export type StudioClient = {
  id: string;
  slug: string;
  name: string;
  sector: string | null;
  isDemo: boolean;
  projects: number;
  collections: number;
  submissions: number;
  submitted: number;
  files: number;
  metricsToReview: number;
  reviewPublished: boolean;
};

export type AnswerValue = string | number | boolean | string[] | null;
export type StudioAnswer = { key: string; value: AnswerValue; notFound: boolean };

export type StudioFile = {
  id: string;
  slot: string;
  name: string;
  size: number;
  mime: string;
  uploadedAt: string;
  scanStatus: string;
  isImage: boolean;
};

export type StudioSubmission = {
  id: string;
  collectionId: string;
  projectName: string;
  status: string;
  submittedAt: string | null;
  updatedAt: string;
  respondent: string | null;
  respondentEmail: string | null;
  answers: StudioAnswer[];
  files: StudioFile[];
};

export type StudioMetric = {
  id: string;
  submissionId: string;
  metricKey: string;
  platform: string | null;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  provenance: string;
  sourceFileId: string | null;
  sourceFileName: string | null;
  confidence: number | null;
  reviewStatus: "a_verifier" | "valide" | "rejete";
  originalValueNum: number | null;
  originalValueText: string | null;
  reviewNote: string | null;
  correctedAt: string | null;
};

export type StudioAnalysis = {
  id: string;
  type: "constat" | "hypothese" | "recommandation" | "note";
  title: string | null;
  body: string | null;
  visibility: string;
  collectionId: string | null;
  submissionId: string | null;
  updatedAt: string;
};

export type StudioDossier = {
  client: { id: string; slug: string; name: string; sector: string | null };
  projects: { id: string; name: string; periodLabel: string | null; status: string }[];
  collections: { id: string; projectId: string; status: string; openedAt: string | null }[];
  submissions: StudioSubmission[];
  metrics: StudioMetric[];
  analyses: StudioAnalysis[];
  role: StudioRole;
};

const IMAGE_MIME = /^image\//;

async function resolveRole(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<StudioRole> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (roles.includes("owner")) return "owner";
  if (roles.includes("analyst")) return "analyst";
  if (roles.includes("viewer")) return "viewer";
  return null;
}

/**
 * Rattache le compte authentifié à `public.users` et attribue le rôle owner
 * au tout premier utilisateur (amorçage de l'espace interne Sawaz).
 */
export const studioBootstrap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Result<{ role: StudioRole; email: string }>> => {
    const { userId, claims } = context;
    const email = String((claims as { email?: string }).email ?? "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin
      .from("users")
      .upsert({ id: userId, email, is_active: true }, { onConflict: "id" });

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) === 0) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "owner" });
    }

    const role = await resolveRole(supabaseAdmin as never, userId);
    return { ok: true, data: { role, email } };
  });

export const listStudioClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }): Promise<Result<{ role: StudioRole; clients: StudioClient[] }>> => {
      const { supabase, userId } = context;
      const role = await resolveRole(supabase as never, userId);

      const { data: clients, error } = await supabase
        .from("clients")
        .select("id, slug, name, sector, is_demo")
        .is("archived_at", null)
        .order("name");

      if (error) return { ok: false, error: "Lecture des clients impossible" };

      const ids = (clients ?? []).map((c) => c.id);
      if (ids.length === 0) return { ok: true, data: { role, clients: [] } };

      const [projects, collections, submissions, files, metrics, reviews] = await Promise.all([
        supabase.from("projects").select("id, client_id").in("client_id", ids),
        supabase.from("collections").select("id, client_id").in("client_id", ids),
        supabase.from("submissions").select("id, client_id, status").in("client_id", ids),
        supabase.from("files").select("id, client_id").in("client_id", ids),
        supabase
          .from("extracted_metrics")
          .select("id, client_id, review_status")
          .in("client_id", ids),
        supabase.from("reviews").select("id, client_id, status").in("client_id", ids),
      ]);

      const count = (rows: { client_id: string }[] | null, id: string) =>
        (rows ?? []).filter((r) => r.client_id === id).length;

      return {
        ok: true,
        data: {
          role,
          clients: (clients ?? []).map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            sector: c.sector,
            isDemo: c.is_demo,
            projects: count(projects.data, c.id),
            collections: count(collections.data, c.id),
            submissions: count(submissions.data, c.id),
            submitted: (submissions.data ?? []).filter(
              (s) => s.client_id === c.id && s.status === "submitted",
            ).length,
            files: count(files.data, c.id),
            metricsToReview: (metrics.data ?? []).filter(
              (m) => m.client_id === c.id && m.review_status === "a_verifier",
            ).length,
            reviewPublished: (reviews.data ?? []).some(
              (r) => r.client_id === c.id && r.status === "published",
            ),
          })),
        },
      };
    },
  );

export const getStudioDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientSlug: string }) => ({
    clientSlug: String(input.clientSlug ?? ""),
  }))
  .handler(async ({ data, context }): Promise<Result<StudioDossier>> => {
    const { supabase, userId } = context;
    const role = await resolveRole(supabase as never, userId);

    const { data: client } = await supabase
      .from("clients")
      .select("id, slug, name, sector")
      .eq("slug", data.clientSlug)
      .maybeSingle();

    if (!client) return { ok: false, error: "Client introuvable ou accès refusé" };

    const [projects, collections, submissions, answers, files, metrics, analyses, recipients] =
      await Promise.all([
        supabase
          .from("projects")
          .select("id, name, period_label, status")
          .eq("client_id", client.id)
          .order("created_at"),
        supabase
          .from("collections")
          .select("id, project_id, status, opened_at")
          .eq("client_id", client.id),
        supabase
          .from("submissions")
          .select("id, collection_id, status, submitted_at, updated_at, submitted_by_contact_id")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("answers")
          .select("submission_id, question_key, value, not_found")
          .eq("client_id", client.id),
        supabase
          .from("files")
          .select(
            "id, submission_id, slot_key, original_name, size_bytes, mime, uploaded_at, scan_status",
          )
          .eq("client_id", client.id),
        supabase
          .from("extracted_metrics")
          .select("*")
          .eq("client_id", client.id)
          .order("metric_key"),
        supabase
          .from("analyses")
          .select("id, type, title, body, visibility, collection_id, submission_id, updated_at")
          .eq("client_id", client.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("collection_recipients")
          .select("collection_id, contacts(name, email)")
          .eq("client_id", client.id),
      ]);

    const fileById = new Map(
      (files.data ?? []).map((f) => [f.id, f.original_name as string] as const),
    );

    const contactByCollection = new Map<string, { name: string; email: string }>();
    for (const r of recipients.data ?? []) {
      const c = (r as { contacts: { name: string; email: string } | null }).contacts;
      if (c) contactByCollection.set(r.collection_id, c);
    }

    const projectByCollection = new Map(
      (collections.data ?? []).map((c) => [c.id, c.project_id] as const),
    );
    const projectName = new Map((projects.data ?? []).map((p) => [p.id, p.name] as const));

    return {
      ok: true,
      data: {
        client,
        role,
        projects: (projects.data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          periodLabel: p.period_label,
          status: p.status,
        })),
        collections: (collections.data ?? []).map((c) => ({
          id: c.id,
          projectId: c.project_id ?? "",
          status: c.status,
          openedAt: c.opened_at,
        })),
        submissions: (submissions.data ?? []).map((s) => {
          const contact = contactByCollection.get(s.collection_id) ?? null;
          const projectId = projectByCollection.get(s.collection_id);
          return {
            id: s.id,
            collectionId: s.collection_id,
            projectName: (projectId ? projectName.get(projectId) : null) ?? "Projet",
            status: s.status,
            submittedAt: s.submitted_at,
            updatedAt: s.updated_at,
            respondent: contact?.name ?? null,
            respondentEmail: contact?.email ?? null,
            answers: (answers.data ?? [])
              .filter((a) => a.submission_id === s.id)
              .map((a) => ({
                key: a.question_key,
                value: a.value as AnswerValue,
                notFound: a.not_found,
              })),
            files: (files.data ?? [])
              .filter((f) => f.submission_id === s.id)
              .map((f) => ({
                id: f.id,
                slot: f.slot_key,
                name: f.original_name,
                size: Number(f.size_bytes ?? 0),
                mime: f.mime ?? "",
                uploadedAt: f.uploaded_at,
                scanStatus: f.scan_status,
                isImage: IMAGE_MIME.test(f.mime ?? ""),
              })),
          };
        }),
        metrics: (metrics.data ?? []).map((m) => ({
          id: m.id,
          submissionId: m.submission_id ?? "",
          metricKey: m.metric_key,
          platform: m.platform,
          valueNum: m.value_num === null ? null : Number(m.value_num),
          valueText: m.value_text,
          unit: m.unit,
          periodStart: m.period_start,
          periodEnd: m.period_end,
          provenance: m.provenance,
          sourceFileId: m.source_file_id,
          sourceFileName: m.source_file_id ? (fileById.get(m.source_file_id) ?? null) : null,
          confidence: m.confidence === null ? null : Number(m.confidence),
          reviewStatus: m.review_status as StudioMetric["reviewStatus"],
          originalValueNum: m.original_value_num === null ? null : Number(m.original_value_num),
          originalValueText: m.original_value_text,
          reviewNote: m.review_note,
          correctedAt: m.corrected_at,
        })),
        analyses: (analyses.data ?? []).map((a) => ({
          id: a.id,
          type: a.type as StudioAnalysis["type"],
          title: a.title,
          body: a.body,
          visibility: a.visibility,
          collectionId: a.collection_id,
          submissionId: a.submission_id,
          updatedAt: a.updated_at,
        })),
      },
    };
  });

/** URL de téléchargement signée (5 min) — le bucket reste privé. */
export const getStudioFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileId: string }) => ({ fileId: String(input.fileId ?? "") }))
  .handler(async ({ data, context }): Promise<Result<{ url: string; name: string }>> => {
    // La lecture passe par la RLS : un fichier hors périmètre est invisible.
    const { data: file } = await context.supabase
      .from("files")
      .select("id, storage_path, original_name")
      .eq("id", data.fileId)
      .maybeSingle();

    if (!file) return { ok: false, error: "Fichier introuvable ou accès refusé" };

    const { data: signed, error } = await context.supabase.storage
      .from("collection-files")
      .createSignedUrl(file.storage_path, 300);

    if (error || !signed) return { ok: false, error: "Lien de téléchargement indisponible" };
    return { ok: true, data: { url: signed.signedUrl, name: file.original_name } };
  });

export const saveStudioAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      clientId: string;
      submissionId?: string | null;
      type: StudioAnalysis["type"];
      title: string;
      body: string;
      visibility: "internal" | "client";
    }) => input,
  )
  .handler(async ({ data, context }): Promise<Result<StudioAnalysis>> => {
    const { supabase, userId } = context;
    // Une note interne ne peut jamais être marquée visible côté client.
    const visibility = data.type === "note" ? "internal" : data.visibility;

    const payload = {
      client_id: data.clientId,
      submission_id: data.submissionId ?? null,
      author_user_id: userId,
      type: data.type,
      title: data.title,
      body: data.body,
      visibility,
    };

    const query = data.id
      ? supabase.from("analyses").update(payload).eq("id", data.id)
      : supabase.from("analyses").insert(payload);

    const { data: row, error } = await query
      .select("id, type, title, body, visibility, collection_id, submission_id, updated_at")
      .maybeSingle();

    if (error || !row) return { ok: false, error: "Enregistrement refusé (droits insuffisants)" };

    await supabase.from("audit_logs").insert({
      client_id: data.clientId,
      actor_type: "user",
      actor_id: userId,
      action: data.id ? "analysis.updated" : "analysis.created",
      entity_type: "analysis",
      entity_id: row.id,
      metadata: { type: data.type, visibility } as never,
    });

    return {
      ok: true,
      data: {
        id: row.id,
        type: row.type as StudioAnalysis["type"],
        title: row.title,
        body: row.body,
        visibility: row.visibility,
        collectionId: row.collection_id,
        submissionId: row.submission_id,
        updatedAt: row.updated_at,
      },
    };
  });

export const deleteStudioAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; clientId: string }) => input)
  .handler(async ({ data, context }): Promise<Result<{ deleted: true }>> => {
    const { error } = await context.supabase.from("analyses").delete().eq("id", data.id);
    if (error) return { ok: false, error: "Suppression refusée" };
    await context.supabase.from("audit_logs").insert({
      client_id: data.clientId,
      actor_type: "user",
      actor_id: context.userId,
      action: "analysis.deleted",
      entity_type: "analysis",
      entity_id: data.id,
    });
    return { ok: true, data: { deleted: true } };
  });

/** Revue humaine traçable d'une métrique extraite. */
export const reviewStudioMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      reviewStatus: "a_verifier" | "valide" | "rejete";
      valueNum?: number | null;
      valueText?: string | null;
      note?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<Result<StudioMetric>> => {
    const { supabase, userId } = context;

    const { data: current } = await supabase
      .from("extracted_metrics")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!current) return { ok: false, error: "Métrique introuvable ou accès refusé" };

    const changesValue =
      (data.valueNum !== undefined && Number(data.valueNum) !== Number(current.value_num)) ||
      (data.valueText !== undefined && data.valueText !== current.value_text);

    const patch: Record<string, unknown> = {
      review_status: data.reviewStatus,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: data.note ?? current.review_note,
    };

    if (changesValue) {
      // La valeur d'origine n'est capturée qu'à la première correction.
      if (current.original_value_num === null && current.original_value_text === null) {
        patch['original_value_num'] = current.value_num;
        patch['original_value_text'] = current.value_text;
      }
      if (data.valueNum !== undefined) patch['value_num'] = data.valueNum;
      if (data.valueText !== undefined) patch['value_text'] = data.valueText;
      patch['corrected_by'] = userId;
      patch['corrected_at'] = new Date().toISOString();
      patch['provenance'] = 'manual';
    }

    const { data: row, error } = await supabase
      .from("extracted_metrics")
      .update(patch as never)
      .eq("id", data.id)
      .select("*")
      .maybeSingle();

    if (error || !row) return { ok: false, error: "Revue refusée (droits insuffisants)" };

    await supabase.from("audit_logs").insert({
      client_id: row.client_id,
      actor_type: "user",
      actor_id: userId,
      action: changesValue ? "metric.corrected" : "metric.reviewed",
      entity_type: "extracted_metric",
      entity_id: row.id,
      metadata: {
        review_status: data.reviewStatus,
        from: { value_num: current.value_num, value_text: current.value_text },
        to: { value_num: row.value_num, value_text: row.value_text },
      } as never,
    });

    return {
      ok: true,
      data: {
        id: row.id,
        submissionId: row.submission_id ?? "",
        metricKey: row.metric_key,
        platform: row.platform,
        valueNum: row.value_num === null ? null : Number(row.value_num),
        valueText: row.value_text,
        unit: row.unit,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        provenance: row.provenance,
        sourceFileId: row.source_file_id,
        sourceFileName: null,
        confidence: row.confidence === null ? null : Number(row.confidence),
        reviewStatus: row.review_status as StudioMetric["reviewStatus"],
        originalValueNum: row.original_value_num === null ? null : Number(row.original_value_num),
        originalValueText: row.original_value_text,
        reviewNote: row.review_note,
        correctedAt: row.corrected_at,
      },
    };
  });
