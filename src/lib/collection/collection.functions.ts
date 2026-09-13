import { createServerFn } from "@tanstack/react-start";

import { toPublicError } from "@/lib/observability/server-log";
import { RateLimitError } from "@/lib/security/rate-limit.server";

import type { RemoteFile, RemoteSnapshot } from "./remote-types";
import type { AnswerValue } from "./types";

/**
 * Points d'entrée serveur de la Collection Experience.
 * Le frontend ne voit jamais la clé service_role ni le bucket : tout passe par ces fonctions.
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string; code?: "SESSION_MISMATCH" };

/**
 * Portée attendue par le client, à transmettre à chaque opération mutante — voir
 * `assertExpectedScope`/`assertExpectedSubmission` dans session.server.ts. Un
 * `expectedCollectionId`/`expectedSubmissionId` qui ne correspond plus à la session
 * `HttpOnly` (cookie partagé écrasé par l'ouverture d'un autre lien dans un autre
 * onglet, notamment) ne doit jamais aboutir à une écriture.
 */
type ExpectedScopeInput = { expectedCollectionId: string; expectedSubmissionId: string };

const readExpectedScope = (input: Partial<ExpectedScopeInput>): ExpectedScopeInput => ({
  expectedCollectionId: String(input.expectedCollectionId ?? ""),
  expectedSubmissionId: String(input.expectedSubmissionId ?? ""),
});

/**
 * Gestion centralisée des erreurs : les erreurs métier (session, lien, quota,
 * décalage de portée) gardent leur message français, toute autre exception est
 * journalisée avec un identifiant d'incident et remplacée par un message générique.
 */
function handle(
  error: unknown,
  fallback: string,
): { ok: false; error: string; code?: "SESSION_MISMATCH" } {
  // La couche session est importée dynamiquement : on reconnaît ses erreurs
  // métier par leur nom plutôt que par une référence de classe.
  if (error instanceof Error && error.name === "SessionMismatchError") {
    return { ok: false, error: error.message, code: "SESSION_MISMATCH" };
  }
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
  .inputValidator(
    (input: { answers: Record<string, AnswerValue> } & Partial<ExpectedScopeInput>) => ({
      answers: input.answers ?? {},
      ...readExpectedScope(input),
    }),
  )
  .handler(async ({ data }): Promise<Result<{ saved: number }>> => {
    const s = await import("./session.server");
    try {
      const session = await s.requireLinkSession();
      const saved = await s.persistAnswers(session, data.answers, {
        collectionId: data.expectedCollectionId,
        submissionId: data.expectedSubmissionId,
      });
      return { ok: true, data: { saved } };
    } catch (error) {
      return handle(error, "Sauvegarde impossible");
    }
  });

/**
 * Résultat typé de la demande de ticket d'upload : `reason: "rejected"` uniquement
 * lorsque les métadonnées (type, taille, nom) sont définitivement refusées avant même
 * toute écriture en stockage. `reason` absent = erreur temporaire de serveur ou de
 * stockage, une nouvelle tentative reste légitime.
 */
type TicketFailure = { ok: false; error: string; reason?: "rejected"; code?: "SESSION_MISMATCH" };
export type RequestUploadTicketResult =
  | { ok: true; data: { path: string; token: string } }
  | TicketFailure;

export const requestFileUpload = createServerFn({ method: "POST" })
  .inputValidator(
    (
      input: { slot: string; name: string; mime: string; size: number } & Partial<ExpectedScopeInput>,
    ) => ({
      slot: String(input.slot ?? ""),
      name: String(input.name ?? ""),
      mime: String(input.mime ?? ""),
      size: Number(input.size ?? 0),
      ...readExpectedScope(input),
    }),
  )
  .handler(async ({ data }): Promise<RequestUploadTicketResult> => {
    const s = await import("./session.server");
    try {
      const session = await s.requireLinkSession();
      return await s.createUploadTicket(session, data, {
        collectionId: data.expectedCollectionId,
        submissionId: data.expectedSubmissionId,
      });
    } catch (error) {
      return handle(error, "Envoi impossible");
    }
  });

/**
 * Résultat typé de la confirmation d'upload : `reason` absent signifie une erreur
 * temporaire (réseau, serveur) pour laquelle une nouvelle tentative sur le même chemin
 * de stockage reste légitime. `reason` n'est renseigné que lorsque le serveur peut
 * trancher explicitement : "missing" si le stockage confirme l'absence de l'objet,
 * "rejected" si le fichier est définitivement refusé (format, taille, contenu).
 */
type ConfirmFailure = {
  ok: false;
  error: string;
  reason?: "missing" | "rejected";
  code?: "SESSION_MISMATCH";
};
export type ConfirmUploadResult = { ok: true; data: RemoteFile } | ConfirmFailure;

export const confirmFileUpload = createServerFn({ method: "POST" })
  .inputValidator(
    (
      input: { slot: string; path: string; name: string; mime: string; size: number } & Partial<ExpectedScopeInput>,
    ) => ({
      slot: String(input.slot ?? ""),
      path: String(input.path ?? ""),
      name: String(input.name ?? ""),
      mime: String(input.mime ?? ""),
      size: Number(input.size ?? 0),
      ...readExpectedScope(input),
    }),
  )
  .handler(async ({ data }): Promise<ConfirmUploadResult> => {
    const s = await import("./session.server");
    try {
      const session = await s.requireLinkSession();
      return await s.registerUploadedFile(session, data, {
        collectionId: data.expectedCollectionId,
        submissionId: data.expectedSubmissionId,
      });
    } catch (error) {
      return handle(error, "Envoi impossible");
    }
  });

export const deleteCollectionFile = createServerFn({ method: "POST" })
  .inputValidator((input: { fileId: string } & Partial<ExpectedScopeInput>) => ({
    fileId: String(input.fileId ?? ""),
    ...readExpectedScope(input),
  }))
  .handler(async ({ data }): Promise<Result<{ deleted: true }>> => {
    const s = await import("./session.server");
    try {
      const session = await s.requireLinkSession();
      return await s.removeFile(session, data.fileId, {
        collectionId: data.expectedCollectionId,
        submissionId: data.expectedSubmissionId,
      });
    } catch (error) {
      return handle(error, "Suppression impossible");
    }
  });

export const submitCollection = createServerFn({ method: "POST" })
  .inputValidator((input: Partial<ExpectedScopeInput>) => readExpectedScope(input))
  .handler(async ({ data }): Promise<Result<{ submittedAt: string }>> => {
    const s = await import("./session.server");
    try {
      const session = await s.requireLinkSession();
      return await s.submitCurrentSubmission(session, {
        collectionId: data.expectedCollectionId,
        submissionId: data.expectedSubmissionId,
      });
    } catch (error) {
      return handle(error, "Envoi impossible");
    }
  });
