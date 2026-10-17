/**
 * Gestion centralisée des erreurs serveur et du monitoring applicatif.
 * Objectifs : une seule forme de log structuré, aucun détail technique renvoyé
 * au navigateur, et un identifiant d'incident partagé entre l'utilisateur et
 * les journaux pour le support.
 */

import { RateLimitError } from "@/lib/security/rate-limit.server";

export type LogMeta = Record<string, string | number | boolean | null | undefined>;

function incidentId() {
  return Math.random().toString(36).slice(2, 10);
}

export function logEvent(scope: string, event: string, meta: LogMeta = {}) {
  console.info(JSON.stringify({ level: "info", scope, event, ...meta, at: new Date().toISOString() }));
}

export function logSecurityEvent(scope: string, event: string, meta: LogMeta = {}) {
  console.warn(JSON.stringify({ level: "security", scope, event, ...meta, at: new Date().toISOString() }));
}

/** Erreurs « métier » sûres à afficher : elles sont écrites par nous, en français. */
export function isExpectedError(error: unknown, expected: ReadonlyArray<Function>): boolean {
  return expected.some((type) => error instanceof (type as never));
}

/**
 * Convertit une exception en résultat public.
 * Les erreurs attendues gardent leur message ; toute autre exception est
 * journalisée puis remplacée par un message générique + identifiant d'incident.
 */
export function toPublicError(
  scope: string,
  error: unknown,
  fallback: string,
  expected: ReadonlyArray<Function> = [RateLimitError],
): { ok: false; error: string } {
  if (isExpectedError(error, expected)) {
    return { ok: false, error: (error as Error).message };
  }
  const id = incidentId();
  console.error(
    JSON.stringify({
      level: "error",
      scope,
      incident: id,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      at: new Date().toISOString(),
    }),
  );
  return { ok: false, error: `${fallback} (référence ${id})` };
}
