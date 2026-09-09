import { createServerFn } from "@tanstack/react-start";

import { toPublicError } from "@/lib/observability/server-log";
import { RateLimitError } from "@/lib/security/rate-limit.server";

import type { RemoteFile, RemoteSnapshot } from "./remote-types";
import type { AnswerValue } from "./types";

/**
 * Points d'entrée serveur de la Collection Experience.
 * Le frontend ne voit jamais la clé service_role ni le bucket : tout passe par ces fonctions.
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Gestion centralisée des erreurs : les erreurs métier (session, lien, quota)
 * gardent leur message français, toute autre exception est journalisée avec un
 * identifiant d'incident et remplacée par un message générique.
 */
function handle(error: unknown, fallback: string): { ok: false; error: string } {
  // La couche session est importée dynamiquement : on reconnaît ses erreurs
  // métier par leur nom plutôt que par une référence de classe.
  if (error instanceof Error && error.name === "SessionError") {
    return { ok: false, error: error.message };
  }
  return toPublicError("collection", error, fallback, [RateLimitError]);
}

export const openCollectionLink = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => ({ token: String(input.token ?? "") }))
  .handler(async ({ data }): Promise<Result<RemoteSnapshot>> => {
    const s = await import("./session.server");
    try {
      if (!data.token) return { ok: false, error: "Lien invalide" };
      const session = await s.openLinkSession(data.token);
      const snapshot = await s.buildSnapshot(session);
      return { ok: true, data: snapshot };
    } catch (error) {
      return handle(error, "Lien invalide");
    }
  });

export const getCollectionSnapshot = createServerFn({ method: "POST" }).handler(
  async (): Promise<Result<RemoteSnapshot>> => {
    const s = await import("./session.server");
    try {
      const session = await s.requireLinkSession();
      return { ok: true, data: await s.buildSnapshot(session) };
    } catch (error) {
      return handle(error, "Session invalide");
    }
  },
);

export const saveCollectionAnswers = createServerFn({ method: "POST" })
  .inputValidator((input: { answers: Record<string, AnswerValue> }) => ({
    answers: input.answers ?? {},
  }))
  .handler(async ({ data }): Promise<Result<{ saved: number }>> => {
    const s = await import("./session.server");
    try {
      const session = await s.requireLinkSession();
      const saved = await s.persistAnswers(session, data.answers);
      return { ok: true, data: { saved } };
    } catch (error) {
      return handle(error, "Sauvegarde impossible");
    }
  });

export const requestFileUpload = createServerFn({ method: "POST" })
  .inputValidator((input: { slot: string; name: string; mime: string; size: number }) => ({
    slot: String(input.slot ?? ""),
    name: String(input.name ?? ""),
    mime: String(input.mime ?? ""),
    size: Number(input.size ?? 0),
  }))
  .handler(async ({ data }): Promise<Result<{ path: string; token: string }>> => {
    const s = await import("./session.server");
    try {
      const session = await s.requireLinkSession();
      return await s.createUploadTicket(session, data);
    } catch (error) {
      return handle(error, "Envoi impossible");
    }
  });

export const confirmFileUpload = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { slot: string; path: string; name: string; mime: string; size: number }) => ({
      slot: String(input.slot ?? ""),
      path: String(input.path ?? ""),
      name: String(input.name ?? ""),
      mime: String(input.mime ?? ""),
      size: Number(input.size ?? 0),
    }),
  )
  .handler(async ({ data }): Promise<Result<RemoteFile>> => {
    const s = await import("./session.server");
    try {
      const session = await s.requireLinkSession();
      return await s.registerUploadedFile(session, data);
    } catch (error) {
      return handle(error, "Envoi impossible");
    }
  });

export const deleteCollectionFile = createServerFn({ method: "POST" })
  .inputValidator((input: { fileId: string }) => ({ fileId: String(input.fileId ?? "") }))
  .handler(async ({ data }): Promise<Result<{ deleted: true }>> => {
    const s = await import("./session.server");
    try {
      const session = await s.requireLinkSession();
      return await s.removeFile(session, data.fileId);
    } catch (error) {
      return handle(error, "Suppression impossible");
    }
  });

export const submitCollection = createServerFn({ method: "POST" }).handler(
  async (): Promise<Result<{ submittedAt: string }>> => {
    const s = await import("./session.server");
    try {
      const session = await s.requireLinkSession();
      return await s.submitCurrentSubmission(session);
    } catch (error) {
      return handle(error, "Envoi impossible");
    }
  },
);
