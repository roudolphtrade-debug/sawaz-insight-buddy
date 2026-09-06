import { createServerFn } from "@tanstack/react-start";

import { toPublicError } from "@/lib/observability/server-log";
import { RateLimitError } from "@/lib/security/rate-limit.server";

import type { ReviewClientPayload } from "./review-client";

/**
 * Pass 3F ÔÇö Surface client de la Strategic Review.
 * Ces fonctions sont publiques par nature (le client n'est pas authentifi├®),
 * mais elles n'exposent qu'une version publi├®e, valid├®e par un secret puis par
 * une session temporaire httpOnly.
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Erreurs m├®tier conserv├®es telles quelles ; le reste est journalis├® et masqu├®. */
function handle(error: unknown, fallback: string): { ok: false; error: string } {
  if (error instanceof Error && error.name === "ReviewAccessError") {
    return { ok: false, error: error.message };
  }
  return toPublicError("review-access", error, fallback, [RateLimitError]);
}

/** Valide le secret du lien et ouvre la session. Le secret peut ensuite quitter l'URL. */
export const openReviewLink = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => ({ token: String(input.token ?? "") }))
  .handler(async ({ data }): Promise<Result<ReviewClientPayload>> => {
    const s = await import("./review-link.server");
    try {
      const session = await s.openReviewSession(data.token);
      return { ok: true, data: await s.loadPublishedReview(session) };
    } catch (error) {
      return handle(error, "Lien invalide");
    }
  });

/** Recharge la restitution depuis la session (refresh, autre onglet, mobile). */
export const getReviewFromSession = createServerFn({ method: "POST" }).handler(
  async (): Promise<Result<ReviewClientPayload>> => {
    const s = await import("./review-link.server");
    try {
      const session = await s.requireReviewSession();
      return { ok: true, data: await s.loadPublishedReview(session) };
    } catch (error) {
      return handle(error, "Session invalide");
    }
  },
);
