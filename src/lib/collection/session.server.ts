import { createHash, randomBytes } from "node:crypto";

import { getRequest, setResponseHeader } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logSecurityEvent } from "@/lib/observability/server-log";
import { callerSubject, enforceRateLimit } from "@/lib/security/rate-limit.server";
import {
  ALLOWED_TYPES,
  MAX_FILE_BYTES as POLICY_MAX_BYTES,
  inspectFileHead,
  storageObjectName,
  validateUploadMeta,
} from "@/lib/security/upload-policy";

/**
 * Couche serveur des sessions de collecte.
 * Le secret du lien n'est jamais stocké : seul son empreinte SHA-256 est comparée.
 * Après validation, une session temporaire (cookie httpOnly) remplace le secret.
 */

export const LINK_SESSION_COOKIE = "sawaz_link_session";
export const SESSION_TTL_HOURS = 12;

export const BUCKET = "collection-files";

export const ALLOWED_MIMES = new Set(Object.keys(ALLOWED_TYPES));

export const MAX_FILE_BYTES = POLICY_MAX_BYTES;

export const ALLOWED_SLOTS = new Set([
  "yt.export",
  "yt.capture.overview",
  "yt.capture.content",
  "yt.capture.audience",
  "c.guideVip",
  "c.dixVideos",
  "c.traffic",
  "c.newReturning",
  "m.export",
  "m.captures",
  "m.results",
]);

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function newSessionSecret() {
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

export function setSessionCookie(secret: string, maxAgeSeconds: number) {
  setResponseHeader(
    "Set-Cookie",
    `${LINK_SESSION_COOKIE}=${encodeURIComponent(secret)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAgeSeconds}`,
  );
}

export function clearSessionCookie() {
  setResponseHeader(
    "Set-Cookie",
    `${LINK_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`,
  );
}

export function hashIp() {
  const req = getRequest();
  const ip =
    req?.headers.get("cf-connecting-ip") ??
    req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  return ip ? sha256(ip) : null;
}

export type LinkSession = {
  sessionId: string;
  linkId: string;
  clientId: string;
  collectionId: string;
};

export class SessionError extends Error {
  override name = "SessionError";
}

/** Valide le lien (empreinte, révocation, expiration, quota) et ouvre une session temporaire. */
export async function openLinkSession(token: string): Promise<LinkSession> {
  await enforceRateLimit("collectionLink", callerSubject("collection-link"));
  const tokenHash = sha256(token);

  const { data: link, error } = await supabaseAdmin
    .from("secure_links")
    .select("id, client_id, target_id, scope, expires_at, revoked_at, max_uses, use_count")
    .eq("token_hash", tokenHash)
    .eq("scope", "collection")
    .maybeSingle();

  if (error || !link) {
    logSecurityEvent("collection", "link.invalid_token");
    throw new SessionError("Lien invalide");
  }
  if (link.revoked_at) throw new SessionError("Lien révoqué");
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    throw new SessionError("Lien expiré");
  }
  if (link.use_count >= link.max_uses) throw new SessionError("Lien épuisé");

  const secret = newSessionSecret();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();

  const { data: session, error: sErr } = await supabaseAdmin
    .from("link_sessions")
    .insert({
      secure_link_id: link.id,
      client_id: link.client_id,
      session_token_hash: sha256(secret),
      expires_at: expiresAt,
      created_ip_hash: hashIp(),
    })
    .select("id")
    .single();

  if (sErr || !session) throw new SessionError("Session impossible à créer");

  await supabaseAdmin
    .from("secure_links")
    .update({ use_count: link.use_count + 1, last_used_at: new Date().toISOString() })
    .eq("id", link.id);

  setSessionCookie(secret, SESSION_TTL_HOURS * 3600);

  return {
    sessionId: session.id,
    linkId: link.id,
    clientId: link.client_id,
    collectionId: link.target_id,
  };
}

/** Résout la session courante depuis le cookie httpOnly. */
export async function requireLinkSession(): Promise<LinkSession> {
  const secret = readCookie(LINK_SESSION_COOKIE);
  if (!secret) throw new SessionError("Aucune session de collecte");

  const { data, error } = await supabaseAdmin
    .from("link_sessions")
    .select(
      "id, client_id, secure_link_id, expires_at, revoked_at, secure_links!inner(id, target_id, scope, revoked_at, expires_at)",
    )
    .eq("session_token_hash", sha256(secret))
    .maybeSingle();

  if (error || !data) throw new SessionError("Session invalide");
  if (data.revoked_at) throw new SessionError("Session révoquée");
  if (new Date(data.expires_at).getTime() < Date.now()) throw new SessionError("Session expirée");

  const link = data.secure_links as unknown as {
    id: string;
    target_id: string;
    scope: string;
    revoked_at: string | null;
    expires_at: string | null;
  };
  if (link.revoked_at) throw new SessionError("Lien révoqué");
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    throw new SessionError("Lien expiré");
  }

  return {
    sessionId: data.id,
    linkId: data.secure_link_id,
    clientId: data.client_id,
    collectionId: link.target_id,
  };
}

/** Reprend la submission en cours du lien, ou en crée une. */
export async function getOrCreateSubmission(session: LinkSession) {
  const { data: existing } = await supabaseAdmin
    .from("submissions")
    .select("id, status, submitted_at")
    .eq("collection_id", session.collectionId)
    .eq("submitted_by_link_id", session.linkId)
    .order("created_at", { ascending: false })
    .limit(1);

  const current = existing?.[0];
  if (current) return current;

  const { data: created, error } = await supabaseAdmin
    .from("submissions")
    .insert({
      collection_id: session.collectionId,
      client_id: session.clientId,
      status: "working",
      submitted_by_link_id: session.linkId,
    })
    .select("id, status, submitted_at")
    .single();

  if (error || !created) throw new SessionError("Impossible de créer la collecte");
  return created;
}

export function validateUpload(input: { slot: string; name?: string; mime: string; size: number }) {
  return validateUploadMeta(
    { slot: input.slot, name: input.name ?? "", mime: input.mime, size: input.size },
    ALLOWED_SLOTS,
  );
}

export function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(-120);
}

/* ------------------------------------------------------------------ */
/* Lecture / écriture de la submission en cours                        */
/* ------------------------------------------------------------------ */

import type { AnswerValue } from "./types";
import type { RemoteFile, RemoteSnapshot } from "./remote-types";

export async function buildSnapshot(session: LinkSession): Promise<RemoteSnapshot> {
  const submission = await getOrCreateSubmission(session);

  const [{ data: answers }, { data: files }, { data: client }] = await Promise.all([
    supabaseAdmin
      .from("answers")
      .select("question_key, value")
      .eq("submission_id", submission.id),
    supabaseAdmin
      .from("files")
      .select("id, slot_key, original_name, size_bytes, mime, uploaded_at")
      .eq("submission_id", submission.id)
      .order("uploaded_at", { ascending: true }),
    supabaseAdmin.from("clients").select("name").eq("id", session.clientId).maybeSingle(),
  ]);

  const answerMap: Record<string, AnswerValue> = {};
  for (const row of answers ?? []) {
    answerMap[row.question_key] = (row.value ?? null) as AnswerValue;
  }

  const fileList: RemoteFile[] = (files ?? []).map((f) => ({
    id: f.id,
    slot: f.slot_key,
    name: f.original_name,
    size: Number(f.size_bytes ?? 0),
    mime: f.mime ?? "",
    uploadedAt: f.uploaded_at,
  }));

  return {
    clientName: client?.name ?? "",
    collectionId: session.collectionId,
    submissionId: submission.id,
    status: submission.status === "submitted" ? "submitted" : "working",
    submittedAt: submission.submitted_at ?? null,
    answers: answerMap,
    files: fileList,
  };
}

async function requireWorkingSubmission(session: LinkSession) {
  const submission = await getOrCreateSubmission(session);
  if (submission.status === "submitted") {
    throw new SessionError("Collecte déjà envoyée : les données sont figées");
  }
  return submission;
}

export async function persistAnswers(
  session: LinkSession,
  answers: Record<string, unknown>,
): Promise<number> {
  const keys = Object.keys(answers);
  if (keys.length === 0) return 0;
  await enforceRateLimit("autosave", callerSubject(session.sessionId));
  const submission = await requireWorkingSubmission(session);

  await supabaseAdmin
    .from("answers")
    .delete()
    .eq("submission_id", submission.id)
    .in("question_key", keys);

  const rows = keys.map((key) => ({
    submission_id: submission.id,
    collection_id: session.collectionId,
    client_id: session.clientId,
    question_key: key,
    value: (answers[key] ?? null) as never,
    not_found: answers[key] === true && key.toLowerCase().includes("missing"),
  }));

  const { error } = await supabaseAdmin.from("answers").insert(rows);
  if (error) throw new SessionError("Sauvegarde refusée");
  return rows.length;
}

export async function createUploadTicket(
  session: LinkSession,
  input: { slot: string; name: string; mime: string; size: number },
) {
  await enforceRateLimit("upload", callerSubject(session.sessionId));

  const invalid = validateUpload(input);
  if (invalid) {
    logSecurityEvent("collection", "upload.rejected_metadata", {
      slot: input.slot,
      mime: input.mime,
      size: input.size,
      reason: invalid,
    });
    return { ok: false as const, error: invalid };
  }

  const submission = await requireWorkingSubmission(session);
  // Nom entièrement généré côté serveur : le nom d'origine ne sert qu'à l'affichage.
  const path = `${session.clientId}/${session.collectionId}/${submission.id}/${input.slot}/${storageObjectName(input.mime, crypto.randomUUID())}`;

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Envoi impossible" };

  return { ok: true as const, data: { path: data.path, token: data.token } };
}

/** Télécharge les premiers octets de l'objet stocké et les inspecte. */
async function inspectStoredObject(path: string, mime: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
  if (error || !data) return "Fichier introuvable après envoi";
  const head = new Uint8Array(await data.slice(0, 4096).arrayBuffer());
  if (data.size > MAX_FILE_BYTES) return "Fichier trop volumineux (20 Mo maximum)";
  return inspectFileHead(head, mime);
}

export async function registerUploadedFile(
  session: LinkSession,
  input: { slot: string; path: string; name: string; mime: string; size: number },
) {
  const invalid = validateUpload(input);
  if (invalid) return { ok: false as const, error: invalid };

  const submission = await requireWorkingSubmission(session);
  const prefix = `${session.clientId}/${session.collectionId}/${submission.id}/${input.slot}/`;
  if (!input.path.startsWith(prefix) || input.path.includes("..")) {
    logSecurityEvent("collection", "upload.path_rejected", { slot: input.slot });
    return { ok: false as const, error: "Chemin de fichier refusé" };
  }

  // Contrôle du contenu réellement écrit dans le bucket privé (magic bytes,
  // exécutables, CSV piégé) : le MIME annoncé par le navigateur ne fait pas foi.
  const scan = await inspectStoredObject(input.path, input.mime);
  if (scan) {
    await supabaseAdmin.storage.from(BUCKET).remove([input.path]);
    logSecurityEvent("collection", "upload.rejected_content", {
      slot: input.slot,
      mime: input.mime,
      reason: scan,
    });
    return { ok: false as const, error: scan };
  }

  const { data, error } = await supabaseAdmin
    .from("files")
    .insert({
      submission_id: submission.id,
      collection_id: session.collectionId,
      client_id: session.clientId,
      slot_key: input.slot,
      storage_path: input.path,
      original_name: input.name,
      mime: input.mime,
      size_bytes: input.size,
      scan_status: "clean",
    })
    .select("id, slot_key, original_name, size_bytes, mime, uploaded_at")
    .single();

  if (error || !data) return { ok: false as const, error: "Enregistrement du fichier refusé" };

  return {
    ok: true as const,
    data: {
      id: data.id,
      slot: data.slot_key,
      name: data.original_name,
      size: Number(data.size_bytes ?? 0),
      mime: data.mime ?? "",
      uploadedAt: data.uploaded_at,
    },
  };
}

export async function removeFile(session: LinkSession, fileId: string) {
  const submission = await requireWorkingSubmission(session);

  const { data: file } = await supabaseAdmin
    .from("files")
    .select("id, storage_path, submission_id, client_id")
    .eq("id", fileId)
    .maybeSingle();

  if (!file || file.submission_id !== submission.id || file.client_id !== session.clientId) {
    return { ok: false as const, error: "Fichier introuvable" };
  }

  await supabaseAdmin.storage.from(BUCKET).remove([file.storage_path]);
  const { error } = await supabaseAdmin.from("files").delete().eq("id", file.id);
  if (error) return { ok: false as const, error: "Suppression refusée" };

  return { ok: true as const, data: { deleted: true as const } };
}

/** Validation minimale conforme au questionnaire, puis passage atomique à `submitted`. */
export async function submitCurrentSubmission(session: LinkSession) {
  await enforceRateLimit("submit", callerSubject(session.sessionId));
  const submission = await getOrCreateSubmission(session);
  if (submission.status === "submitted") {
    return { ok: true as const, data: { submittedAt: submission.submitted_at as string } };
  }

  const snapshot = await buildSnapshot(session);
  const missingFlags = Object.entries(snapshot.answers).filter(
    ([key, value]) => value === true && (key.includes("missing") || key.includes("Impossible")),
  );

  const problems: string[] = [];
  if (!snapshot.answers["yt.mode"]) problems.push("la méthode de transmission YouTube");
  if (!snapshot.answers["m.periode"]) problems.push("la période Meta");
  if (snapshot.files.length === 0 && missingFlags.length === 0) {
    problems.push("au moins un élément transmis ou signalé comme introuvable");
  }
  if (problems.length > 0) {
    return { ok: false as const, error: `Il manque ${problems.join(", ")}.` };
  }

  const { data, error } = await supabaseAdmin
    .from("submissions")
    .update({ status: "submitted", snapshot: snapshot as never })
    .eq("id", submission.id)
    .eq("status", "working")
    .select("submitted_at")
    .maybeSingle();

  if (error || !data?.submitted_at) return { ok: false as const, error: "Envoi impossible" };

  await supabaseAdmin.from("audit_logs").insert({
    client_id: session.clientId,
    actor_type: "link",
    actor_id: session.linkId,
    action: "collection.submitted",
    entity_type: "submission",
    entity_id: submission.id,
    metadata: { files: snapshot.files.length } as never,
  });

  return { ok: true as const, data: { submittedAt: data.submitted_at } };
}
