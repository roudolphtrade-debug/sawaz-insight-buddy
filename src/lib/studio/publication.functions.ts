import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Pass 3F — Pilotage de la publication côté Results Studio.
 * Lecture de l'état de publication, historique, rotation et révocation du lien.
 * La rotation et la révocation sont réservées au rôle owner, comme la publication.
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type PublicationLink = {
  id: string;
  versionNo: number | null;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  useCount: number;
  active: boolean;
};

export type PublicationNotification = {
  id: string;
  recipient: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  versionNo: number | null;
};

export type PublicationEvent = {
  versionNo: number;
  publishedAt: string | null;
  status: string;
};

export type PublicationState = {
  role: "owner" | "analyst" | "viewer" | null;
  publishedVersionNo: number | null;
  publishedAt: string | null;
  recipients: { name: string; email: string; isPrimary: boolean }[];
  links: PublicationLink[];
  notifications: PublicationNotification[];
  history: PublicationEvent[];
};

async function guard(supabase: any, userId: string, reviewId: string) {
  const { data: review } = await supabase
    .from("reviews")
    .select("id, client_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (!review) return { error: "Review introuvable ou accès refusé" as const };

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const list = (roles ?? []).map((r: { role: string }) => r.role);
  const role = list.includes("owner")
    ? ("owner" as const)
    : list.includes("analyst")
      ? ("analyst" as const)
      : list.includes("viewer")
        ? ("viewer" as const)
        : null;

  return { review, role };
}

export const getPublicationState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reviewId: string }) => ({ reviewId: String(input.reviewId ?? "") }))
  .handler(async ({ data, context }): Promise<Result<PublicationState>> => {
    const { supabase, userId } = context;
    const g = await guard(supabase, userId, data.reviewId);
    if ("error" in g) return { ok: false, error: g.error };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const clientId = g.review.client_id as string;

    const { data: versions } = await supabaseAdmin
      .from("review_versions")
      .select("id, version_no, status, published_at")
      .eq("review_id", data.reviewId)
      .order("version_no", { ascending: false });

    const versionNo = new Map((versions ?? []).map((v) => [v.id, v.version_no] as const));
    const ids = (versions ?? []).map((v) => v.id);

    const [linksRes, notifsRes, contactsRes] = await Promise.all([
      ids.length
        ? supabaseAdmin
            .from("secure_links")
            .select("*")
            .eq("scope", "review")
            .in("target_id", ids)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin
            .from("notifications")
            .select("*")
            .in("review_version_id", ids)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin
        .from("contacts")
        .select("name, email, is_primary")
        .eq("client_id", clientId)
        .is("archived_at", null),
    ]);

    const now = Date.now();
    const published = (versions ?? []).find((v) => v.status === "published") ?? null;

    return {
      ok: true,
      data: {
        role: g.role,
        publishedVersionNo: published?.version_no ?? null,
        publishedAt: published?.published_at ?? null,
        recipients: (contactsRes.data ?? []).map((c) => ({
          name: c.name,
          email: c.email,
          isPrimary: c.is_primary,
        })),
        links: (linksRes.data ?? []).map((l: any) => ({
          id: l.id,
          versionNo: versionNo.get(l.target_id) ?? null,
          createdAt: l.created_at,
          expiresAt: l.expires_at,
          revokedAt: l.revoked_at,
          lastUsedAt: l.last_used_at,
          useCount: l.use_count,
          active:
            !l.revoked_at &&
            (!l.expires_at || new Date(l.expires_at).getTime() > now) &&
            l.use_count < l.max_uses,
        })),
        notifications: (notifsRes.data ?? []).map((n: any) => ({
          id: n.id,
          recipient: n.recipient,
          status: n.status,
          sentAt: n.sent_at,
          createdAt: n.created_at,
          versionNo: versionNo.get(n.review_version_id) ?? null,
        })),
        history: (versions ?? [])
          .filter((v) => v.published_at)
          .map((v) => ({
            versionNo: v.version_no,
            publishedAt: v.published_at,
            status: v.status,
          })),
      },
    };
  });

/** Rotation du lien : révoque l'ancien secret et ses sessions, en émet un nouveau. */
export const regenerateReviewLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reviewId: string }) => ({ reviewId: String(input.reviewId ?? "") }))
  .handler(async ({ data, context }): Promise<Result<{ url: string; expiresAt: string }>> => {
    const { supabase, userId } = context;
    const g = await guard(supabase, userId, data.reviewId);
    if ("error" in g) return { ok: false, error: g.error };
    if (g.role !== "owner") return { ok: false, error: "Rotation réservée au rôle owner" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: published } = await supabaseAdmin
      .from("review_versions")
      .select("id")
      .eq("review_id", data.reviewId)
      .eq("status", "published")
      .maybeSingle();

    if (!published) return { ok: false, error: "Aucune version publiée" };

    const link = await import("@/lib/review-access/review-link.server");
    try {
      const issued = await link.issueReviewLink({
        clientId: g.review.client_id as string,
        reviewId: data.reviewId,
        versionId: published.id,
        createdBy: userId,
      });
      return { ok: true, data: { url: issued.url, expiresAt: issued.expiresAt } };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Rotation impossible" };
    }
  });

/** Révoque immédiatement l'accès client (lien + sessions ouvertes). */
export const revokeReviewAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reviewId: string }) => ({ reviewId: String(input.reviewId ?? "") }))
  .handler(async ({ data, context }): Promise<Result<{ revoked: true }>> => {
    const { supabase, userId } = context;
    const g = await guard(supabase, userId, data.reviewId);
    if ("error" in g) return { ok: false, error: g.error };
    if (g.role !== "owner") return { ok: false, error: "Révocation réservée au rôle owner" };

    const link = await import("@/lib/review-access/review-link.server");
    await link.revokeReviewLinks(data.reviewId, userId);
    return { ok: true, data: { revoked: true } };
  });
