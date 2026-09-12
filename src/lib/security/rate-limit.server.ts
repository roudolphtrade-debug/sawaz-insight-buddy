import { createHash } from "node:crypto";

import { getRequest } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Rate limiting persistant (table `rate_limits`, fen├¬tre glissante par palier).
 * Les workers ├®tant sans ├®tat, le compteur vit en base : une limite reste
 * effective quelle que soit l'instance qui re├ºoit la requ├¬te.
 */

export const RATE_LIMITS = {
  /** Validation d'un secret de lien de collecte. */
  collectionLink: { limit: 10, windowSeconds: 600 },
  /** Validation d'un secret de lien de Strategic Review. */
  reviewLink: { limit: 10, windowSeconds: 600 },
  /** Autosave des r├®ponses. */
  autosave: { limit: 240, windowSeconds: 600 },
  /** Demande de ticket d'upload. */
  upload: { limit: 60, windowSeconds: 600 },
  /** Soumission finale. */
  submit: { limit: 10, windowSeconds: 3600 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export class RateLimitError extends Error {
  constructor(message = "Trop de tentatives. R├®essaie dans quelques minutes.") {
    super(message);
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** Identifiant d'appelant : IP (hach├®e) et ├®ventuel discriminant applicatif. */
export function callerSubject(extra?: string | null): string {
  const req = getRequest();
  const ip =
    req?.headers.get("cf-connecting-ip") ??
    req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return hash(`${ip}|${extra ?? ""}`);
}

/**
 * Consomme un jeton. Retourne `false` si la limite est d├®pass├®e.
 * En cas d'indisponibilit├® du compteur, on n'interrompt pas le service (fail-open)
 * mais l'incident est trac├® : cf. docs/production-hardening.md (risque r├®siduel).
 */
export async function consumeRateLimit(
  bucket: RateLimitBucket,
  subject: string,
): Promise<boolean> {
  const { limit, windowSeconds } = RATE_LIMITS[bucket];
  // Fonction SQL créée par migration ; absente des types générés tant que
  // l'instance n'est pas reconnectée, d'où la conversion de nom.
  const { data, error } = await supabaseAdmin.rpc("consume_rate_limit" as never, {
    _bucket: bucket,
    _subject: subject,
    _limit: limit,
    _window_seconds: windowSeconds,
  } as never);
  if (error) {
    console.error("[rate-limit] compteur indisponible", error.message);
    return true;
  }
  return data !== false;
}

/** Variante levant une erreur utilisateur explicite. */
export async function enforceRateLimit(
  bucket: RateLimitBucket,
  subject = callerSubject(bucket),
): Promise<void> {
  const allowed = await consumeRateLimit(bucket, subject);
  if (!allowed) throw new RateLimitError();
}
