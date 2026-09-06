import { createHash, randomBytes } from "node:crypto";

import { getRequest, setResponseHeader } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logSecurityEvent } from "@/lib/observability/server-log";
import { callerSubject, enforceRateLimit } from "@/lib/security/rate-limit.server";
import {
  renderReviewPublishedEmail,
  resolveEmailProvider,
} from "@/lib/notifications/email.server";
import type { ReviewClientPayload } from "@/lib/review-access/review-client";
import {
  normalizeReviewCharts,
  normalizeReviewContent,
} from "@/lib/studio/review-content";

/**
 * Pass 3F ÔÇö Publication d'une Strategic Review et acc├¿s client.
 * Le secret du lien n'existe qu'une fois, en m├®moire : la base ne conserve
 * qu'un SHA-256. Apr├¿s validation, une session temporaire (cookie httpOnly)
 * remplace le secret, qui dispara├«t de l'URL.
 */

export const REVIEW_SESSION_COOKIE = "sawaz_review_session";
export const REVIEW_SESSION_TTL_HOURS = 8;
export const REVIEW_LINK_TTL_DAYS = 60;

export class ReviewAccessError extends Error {
  override name = "ReviewAccessError";
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function newSecret() {
  return randomBytes(32).toString("base64url");
}

function readCookie(name: string): string | null {
  const header = getRequest()?.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function setSessionCookie(secret: string, maxAgeSeconds: number) {
  setResponseHeader(
    "Set-Cookie",
    `${REVIEW_SESSION_COOKIE}=${encodeURIComponent(secret)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAgeSeconds}`,
  );
}

function hashIp() {
  const req = getRequest();
  const ip =
    req?.headers.get("cf-connecting-ip") ??
    req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  return ip ? sha256(ip) : null;
}

export function originUrl() {
  const req = getRequest();
  const origin = req?.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  try {
    return new URL(req!.url).origin;
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/* ├ëmission / rotation / r├®vocation du lien                            */
/* ------------------------------------------------------------------ */

export type IssuedLink = { linkId: string; token: string; url: string; expiresAt: string };

/**
 * Cr├®e (ou renouvelle) le lien d'acc├¿s d'une version publi├®e.
 * Les liens actifs de la m├¬me review sont r├®voqu├®s : une rotation invalide
 * imm├®diatement l'ancien secret et les sessions ouvertes.
 */
export async function issueReviewLink(input: {
  clientId: string;
  reviewId: string;
  versionId: string;
  createdBy: string | null;
}): Promise<IssuedLink> {
  const versionIds = await reviewVersionIds(input.reviewId);
  await revokeActiveLinks(versionIds, "rotation");

  const token = newSecret();
  const expiresAt = new Date(
    Date.now() + REVIEW_LINK_TTL_DAYS * 24 * 3600 * 1000,
  ).toISOString();

  const { data, error } = await supabaseAdmin
    .from("secure_links")
    .insert({
      client_id: input.clientId,
      scope: "review",
      target_id: input.versionId,
      token_hash: sha256(token),
      expires_at: expiresAt,
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (error || !data) throw new ReviewAccessError("Cr├®ation du lien impossible");

  await supabaseAdmin.from("audit_logs").insert({
    client_id: input.clientId,
    actor_type: input.createdBy ? "user" : "system",
    actor_id: input.createdBy,
    action: "review_link.issued",
    entity_type: "secure_link",
    entity_id: data.id,
    metadata: { review_version_id: input.versionId } as never,
  });

  return {
    linkId: data.id,
    token,
    url: `${originUrl()}/review/${token}`,
    expiresAt,
  };
}

async function reviewVersionIds(reviewId: string) {
  const { data } = await supabaseAdmin
    .from("review_versions")
    .select("id")
    .eq("review_id", reviewId);
  return (data ?? []).map((v) => v.id);
}

async function revokeActiveLinks(versionIds: string[], reason: string) {
  if (versionIds.length === 0) return;
  const now = new Date().toISOString();
  const { data: links } = await supabaseAdmin
    .from("secure_links")
    .select("id")
    .eq("scope", "review")
    .in("target_id", versionIds)
    .is("revoked_at", null);

  const ids = (links ?? []).map((l) => l.id);
  if (ids.length === 0) return;

  await supabaseAdmin.from("secure_links").update({ revoked_at: now }).in("id", ids);
  await supabaseAdmin.from("link_sessions").update({ revoked_at: now }).in("secure_link_id", ids);
  console.info("[review-link] r├®vocation", reason, ids.length);
}

export async function revokeReviewLinks(reviewId: string, actorId: string | null) {
  const versionIds = await reviewVersionIds(reviewId);
  await revokeActiveLinks(versionIds, "manuelle");
  const { data: review } = await supabaseAdmin
    .from("reviews")
    .select("client_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (review) {
    await supabaseAdmin.from("audit_logs").insert({
      client_id: review.client_id,
      actor_type: actorId ? "user" : "system",
      actor_id: actorId,
      action: "review_link.revoked",
      entity_type: "review",
      entity_id: reviewId,
    });
  }
}

/* ------------------------------------------------------------------ */
/* Notification transactionnelle idempotente                           */
/* ------------------------------------------------------------------ */

export type NotifyOutcome = { recipient: string; created: boolean; sent: boolean };

/**
 * File une notification ┬½ Strategic Review disponible ┬╗ par destinataire.
 * `notifications.idempotency_key` (unique, d├®riv├®e du review_version_id et du
 * destinataire) garantit qu'une republication de la m├¬me version n'envoie pas
 * un second email.
 */
export async function notifyReviewPublished(input: {
  clientId: string;
  versionId: string;
  reviewTitle: string;
  periodLabel: string;
  url: string;
  recipients?: string[] | undefined;
}): Promise<NotifyOutcome[]> {
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("name, brand, theme_tokens")
    .eq("id", input.clientId)
    .maybeSingle();

  const brand = (client?.brand ?? {}) as Record<string, string>;
  const tokens = (client?.theme_tokens ?? {}) as Record<string, string>;
  const tenant = {
    name: client?.name ?? "Client",
    primary: tokens['primary'] ?? brand['primary'] ?? "#FABA07",
    logoUrl: brand['logoUrl'] ?? null,
  };

  const { data: contacts } = await supabaseAdmin
    .from("contacts")
    .select("name, email, is_primary")
    .eq("client_id", input.clientId)
    .is("archived_at", null);

  let targets = (contacts ?? []).map((c) => ({ name: c.name, email: c.email }));
  if (input.recipients?.length) {
    const allow = new Set(input.recipients.map((r) => r.toLowerCase()));
    targets = targets.filter((t) => allow.has(t.email.toLowerCase()));
  } else {
    const primary = (contacts ?? []).filter((c) => c.is_primary);
    if (primary.length > 0) targets = primary.map((c) => ({ name: c.name, email: c.email }));
  }

  const provider = resolveEmailProvider();
  const results: NotifyOutcome[] = [];

  for (const target of targets) {
    const { data: created, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        client_id: input.clientId,
        type: "review.published",
        channel: "email",
        recipient: target.email,
        related_type: "review_version",
        related_id: input.versionId,
        review_version_id: input.versionId,
        idempotency_key: "auto", // recalcul├®e par le trigger build_notification_idempotency_key
        payload: {
          reviewTitle: input.reviewTitle,
          periodLabel: input.periodLabel,
          tenant: tenant.name,
        } as never,
      })
      .select("id")
      .maybeSingle();

    if (error || !created) {
      // Cl├® d'idempotence d├®j├á pr├®sente : la notification a d├®j├á ├®t├® trait├®e.
      results.push({ recipient: target.email, created: false, sent: false });
      continue;
    }

    const mail = renderReviewPublishedEmail({
      tenantName: tenant.name,
      primary: tenant.primary,
      logoUrl: tenant.logoUrl,
      recipientName: target.name,
      reviewTitle: input.reviewTitle,
      periodLabel: input.periodLabel,
      url: input.url,
    });

    const sent = await provider.send({
      to: target.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tenant,
    });

    await supabaseAdmin
      .from("notifications")
      .update(
        sent.ok
          ? { status: "sent", sent_at: new Date().toISOString(), attempts: 1 }
          : { status: "failed", attempts: 1 },
      )
      .eq("id", created.id);

    results.push({ recipient: target.email, created: true, sent: sent.ok });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/* Session client                                                      */
/* ------------------------------------------------------------------ */

export type ReviewSession = { sessionId: string; linkId: string; clientId: string; versionId: string };

/** Valide le secret, ouvre une session temporaire, puis le secret peut dispara├«tre de l'URL. */
export async function openReviewSession(token: string): Promise<ReviewSession> {
  await enforceRateLimit("reviewLink", callerSubject("review-link"));
  if (!token) {
    logSecurityEvent("review", "link.invalid_token");
    throw new ReviewAccessError("Lien invalide");
  }

  const { data: link } = await supabaseAdmin
    .from("secure_links")
    .select("id, client_id, target_id, expires_at, revoked_at, max_uses, use_count")
    .eq("token_hash", sha256(token))
    .eq("scope", "review")
    .maybeSingle();

  if (!link) throw new ReviewAccessError("Lien invalide");
  if (link.revoked_at) throw new ReviewAccessError("Lien r├®voqu├®");
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    throw new ReviewAccessError("Lien expir├®");
  }
  if (link.use_count >= link.max_uses) throw new ReviewAccessError("Lien ├®puis├®");

  const secret = newSecret();
  const { data: session, error } = await supabaseAdmin
    .from("link_sessions")
    .insert({
      secure_link_id: link.id,
      client_id: link.client_id,
      session_token_hash: sha256(secret),
      expires_at: new Date(Date.now() + REVIEW_SESSION_TTL_HOURS * 3600 * 1000).toISOString(),
      created_ip_hash: hashIp(),
    })
    .select("id")
    .single();

  if (error || !session) throw new ReviewAccessError("Session impossible ├á cr├®er");

  await supabaseAdmin
    .from("secure_links")
    .update({ use_count: link.use_count + 1, last_used_at: new Date().toISOString() })
    .eq("id", link.id);

  setSessionCookie(secret, REVIEW_SESSION_TTL_HOURS * 3600);

  await supabaseAdmin.from("audit_logs").insert({
    client_id: link.client_id,
    actor_type: "link",
    actor_id: link.id,
    action: "review.opened",
    entity_type: "review_version",
    entity_id: link.target_id,
    ip_hash: hashIp(),
  });

  return {
    sessionId: session.id,
    linkId: link.id,
    clientId: link.client_id,
    versionId: link.target_id,
  };
}

export async function requireReviewSession(): Promise<ReviewSession> {
  const secret = readCookie(REVIEW_SESSION_COOKIE);
  if (!secret) throw new ReviewAccessError("Aucune session");

  const { data } = await supabaseAdmin
    .from("link_sessions")
    .select(
      "id, client_id, secure_link_id, expires_at, revoked_at, secure_links!inner(target_id, scope, revoked_at, expires_at)",
    )
    .eq("session_token_hash", sha256(secret))
    .maybeSingle();

  if (!data) throw new ReviewAccessError("Session invalide");
  if (data.revoked_at) throw new ReviewAccessError("Session r├®voqu├®e");
  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new ReviewAccessError("Session expir├®e");
  }

  const link = data.secure_links as unknown as {
    target_id: string;
    scope: string;
    revoked_at: string | null;
    expires_at: string | null;
  };
  if (link.scope !== "review") throw new ReviewAccessError("Session invalide");
  if (link.revoked_at) throw new ReviewAccessError("Lien r├®voqu├®");
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    throw new ReviewAccessError("Lien expir├®");
  }

  return {
    sessionId: data.id,
    linkId: data.secure_link_id,
    clientId: data.client_id,
    versionId: link.target_id,
  };
}

/**
 * Charge UNIQUEMENT la version publi├®e cibl├®e par le lien.
 * Le contenu est re-normalis├® c├┤t├® serveur : toute r├®f├®rence ├á une m├®trique
 * non valid├®e ou ├á une analyse interne est retir├®e avant de sortir du serveur.
 */
export async function loadPublishedReview(session: ReviewSession): Promise<ReviewClientPayload> {
  const { data: version } = await supabaseAdmin
    .from("review_versions")
    .select("id, review_id, client_id, version_no, status, content, charts, published_at")
    .eq("id", session.versionId)
    .maybeSingle();

  if (!version) throw new ReviewAccessError("Restitution introuvable");
  if (version.client_id !== session.clientId) throw new ReviewAccessError("Acc├¿s refus├®");
  if (version.status !== "published") throw new ReviewAccessError("Restitution non publi├®e");

  const [metricsRes, analysesRes, clientRes] = await Promise.all([
    supabaseAdmin
      .from("extracted_metrics")
      .select("id")
      .eq("client_id", version.client_id)
      .eq("review_status", "valide"),
    supabaseAdmin
      .from("analyses")
      .select("id")
      .eq("client_id", version.client_id)
      .neq("type", "note")
      .neq("visibility", "internal"),
    supabaseAdmin
      .from("clients")
      .select("name, brand, theme_tokens")
      .eq("id", version.client_id)
      .maybeSingle(),
  ]);

  const allowedMetricIds = (metricsRes.data ?? []).map((m) => m.id);
  const content = normalizeReviewContent(version.content, {
    allowedMetricIds,
    allowedAnalysisIds: (analysesRes.data ?? []).map((a) => a.id),
  });
  const charts = normalizeReviewCharts(version.charts, allowedMetricIds);

  // Aucune tra├ºabilit├® interne ne sort vers le client.
  const clientSafeContent = {
    ...content,
    blocks: content.blocks.map((b) => ({ ...b, sourceMetricIds: [], analysisId: null })),
  };

  return {
    reviewTitle: content.title,
    versionNo: version.version_no,
    publishedAt: version.published_at ?? "",
    content: clientSafeContent,
    charts: charts.map((c) => ({ ...c, sourceMetricIds: [] })),
    theme: {
      name: clientRes.data?.name ?? "Client",
      brand: (clientRes.data?.brand ?? {}) as Record<string, string>,
      tokens: (clientRes.data?.theme_tokens ?? {}) as Record<string, string>,
    },
  };
}
