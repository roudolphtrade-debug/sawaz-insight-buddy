import { createHash, randomBytes } from "node:crypto";

import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { StorageApiError } from "@supabase/supabase-js";

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

/**
 * Le client confirme une portée exactement une fois (voir `store.tsx`), puis la
 * retransmet à chaque opération mutante. Ce n'est jamais la source de vérité — la
 * session `HttpOnly` et la soumission réellement active le restent — mais un onglet
 * dont la portée attendue diverge de celle-ci (cookie de session partagé écrasé entre
 * onglets par l'ouverture d'un autre lien, notamment) ne doit jamais écrire par erreur
 * dans une autre collecte.
 */
export type ExpectedScope = { collectionId: string; submissionId: string };

export class SessionMismatchError extends Error {
  override name = "SessionMismatchError";
  constructor() {
    super("Session changée — rouvrez le lien de cette collecte.");
  }
}

/** À vérifier dès que possible, avant toute lecture/écriture liée à la submission. */
export function assertExpectedScope(session: LinkSession, expected: ExpectedScope) {
  if (expected.collectionId !== session.collectionId) throw new SessionMismatchError();
}

/** À vérifier après résolution de la submission réellement active, avant toute écriture. */
export function assertExpectedSubmission(
  submission: { id: string },
  expected: ExpectedScope,
) {
  if (expected.submissionId !== submission.id) throw new SessionMismatchError();
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
import { stateFromSnapshot } from "./snapshot";
import { metaBlocker, youtubeBlocker } from "./status";

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
  expected: ExpectedScope,
): Promise<number> {
  const keys = Object.keys(answers);
  if (keys.length === 0) return 0;
  // Le rate limit s'applique avant tout, y compris à une portée erronée : sinon un
  // décalage de session deviendrait un moyen de sonder sans limite.
  await enforceRateLimit("autosave", callerSubject(session.sessionId));
  assertExpectedScope(session, expected);
  const submission = await requireWorkingSubmission(session);
  assertExpectedSubmission(submission, expected);

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
  expected: ExpectedScope,
) {
  await enforceRateLimit("upload", callerSubject(session.sessionId));
  assertExpectedScope(session, expected);

  // Métadonnées invalides (type, taille, nom) : rejet définitif avant toute écriture en
  // stockage, ce fichier précis ne passera jamais tel quel.
  const invalid = validateUpload(input);
  if (invalid) {
    logSecurityEvent("collection", "upload.rejected_metadata", {
      slot: input.slot,
      mime: input.mime,
      size: input.size,
      reason: invalid,
    });
    return { ok: false as const, error: invalid, reason: "rejected" as const };
  }

  const submission = await requireWorkingSubmission(session);
  assertExpectedSubmission(submission, expected);
  // Nom entièrement généré côté serveur : le nom d'origine ne sert qu'à l'affichage.
  const path = `${session.clientId}/${session.collectionId}/${submission.id}/${input.slot}/${storageObjectName(input.mime, crypto.randomUUID())}`;

  // Échec de création de l'URL signée : erreur de service temporaire, jamais un rejet du
  // fichier — aucune `reason` pour ne pas être classée comme définitive côté client.
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Envoi impossible" };

  return { ok: true as const, data: { path: data.path, token: data.token } };
}

type StoredObjectCheck =
  | { ok: true }
  | { ok: false; message: string; reason?: "missing" | "rejected" };

/**
 * Télécharge les premiers octets de l'objet stocké et les inspecte.
 * Ne renvoie `reason: "missing"` que lorsque Supabase Storage confirme explicitement
 * l'absence de l'objet (HTTP 404 via `StorageApiError`) ; toute autre erreur de
 * téléchargement (panne réseau, erreur serveur, réponse inattendue — `StorageUnknownError`
 * ou un statut différent de 404) reste non classée pour ne jamais déclencher à tort la
 * création d'un nouveau ticket d'upload côté client.
 */
async function inspectStoredObject(path: string, mime: string): Promise<StoredObjectCheck> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);

  if (error) {
    const confirmedMissing = error instanceof StorageApiError && error.status === 404;
    return {
      ok: false,
      message: confirmedMissing
        ? "Fichier introuvable après envoi"
        : "Vérification du fichier impossible, réessaie",
      ...(confirmedMissing ? { reason: "missing" as const } : {}),
    };
  }
  if (!data) {
    return { ok: false, message: "Vérification du fichier impossible, réessaie" };
  }

  const head = new Uint8Array(await data.slice(0, 4096).arrayBuffer());
  if (data.size > MAX_FILE_BYTES) {
    return { ok: false, message: "Fichier trop volumineux (20 Mo maximum)", reason: "rejected" };
  }
  const scan = inspectFileHead(head, mime);
  if (scan) return { ok: false, message: scan, reason: "rejected" };

  return { ok: true };
}

type ExistingFileRow = {
  id: string;
  slot_key: string;
  original_name: string;
  size_bytes: number | null;
  mime: string | null;
  uploaded_at: string;
};

function mapExistingFile(row: ExistingFileRow) {
  return {
    id: row.id,
    slot: row.slot_key,
    name: row.original_name,
    size: Number(row.size_bytes ?? 0),
    mime: row.mime ?? "",
    uploadedAt: row.uploaded_at,
  };
}

export async function registerUploadedFile(
  session: LinkSession,
  input: { slot: string; path: string; name: string; mime: string; size: number },
  expected: ExpectedScope,
) {
  assertExpectedScope(session, expected);

  // Métadonnées invalides (type, taille, nom) : rejet définitif, ce fichier précis ne
  // passera jamais — l'interface doit proposer de le supprimer, pas de réessayer.
  const invalid = validateUpload(input);
  if (invalid) return { ok: false as const, error: invalid, reason: "rejected" as const };

  const submission = await requireWorkingSubmission(session);
  assertExpectedSubmission(submission, expected);

  // Le chemin est entièrement généré par le serveur au moment du ticket : un chemin qui
  // ne respecte pas le préfixe attendu pour cette submission trahit une falsification
  // côté client, jamais un cas d'usage normal. Validé avant toute lecture en base.
  const prefix = `${session.clientId}/${session.collectionId}/${submission.id}/${input.slot}/`;
  if (!input.path.startsWith(prefix) || input.path.includes("..")) {
    logSecurityEvent("collection", "upload.path_rejected", { slot: input.slot });
    return { ok: false as const, error: "Chemin de fichier refusé" };
  }

  const findExisting = () =>
    supabaseAdmin
      .from("files")
      .select("id, slot_key, original_name, size_bytes, mime, uploaded_at")
      .eq("storage_path", input.path)
      .eq("submission_id", submission.id)
      .eq("client_id", session.clientId)
      .maybeSingle();

  // Reprise : si ce chemin a déjà été confirmé pour cette submission (upload d'octets
  // réussi mais une confirmation précédente interrompue avant sa réponse), on renvoie
  // l'enregistrement existant tel quel, sans re-scanner ni ré-insérer.
  //
  // NB : l'unicité de `storage_path` en base n'est pas vérifiable depuis ce dépôt (aucune
  // migration SQL n'y est suivie, et les types générés n'exposent que les clés étrangères,
  // jamais les contraintes d'unicité). Cette recherche ferme la fenêtre de course dans le
  // cas courant (une seule confirmation à la fois pour ce chemin), et la relecture après
  // échec d'insertion plus bas récupère le cas où une contrainte unique existe et a rejeté
  // un doublon. Si aucune contrainte de ce type n'existe réellement en base, deux
  // confirmations réellement concurrentes pour un même chemin pourraient toutes deux
  // franchir cette vérification et produire deux lignes dupliquées : ce risque résiduel
  // n'est pas éliminé ici, faute de pouvoir agir sur le schéma.
  const { data: existing, error: existingError } = await findExisting();
  if (existingError) {
    return { ok: false as const, error: "Vérification du fichier impossible, réessaie" };
  }
  if (existing) {
    return { ok: true as const, data: mapExistingFile(existing) };
  }

  // Contrôle du contenu réellement écrit dans le bucket privé (magic bytes,
  // exécutables, CSV piégé) : le MIME annoncé par le navigateur ne fait pas foi.
  const check = await inspectStoredObject(input.path, input.mime);
  if (!check.ok) {
    // Seul un contenu confirmé refusé justifie de supprimer l'objet : une absence n'a
    // rien à supprimer, une erreur non concluante ne doit jamais y toucher.
    if (check.reason === "rejected") {
      await supabaseAdmin.storage.from(BUCKET).remove([input.path]);
      logSecurityEvent("collection", "upload.rejected_content", {
        slot: input.slot,
        mime: input.mime,
        reason: check.message,
      });
    }
    return {
      ok: false as const,
      error: check.message,
      ...(check.reason ? { reason: check.reason } : {}),
    };
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

  if (error || !data) {
    // L'échec peut venir d'une contrainte d'unicité déclenchée par une confirmation
    // concurrente gagnante entre-temps : on relit avant de déclarer un échec définitif.
    const { data: retry } = await findExisting();
    if (retry) return { ok: true as const, data: mapExistingFile(retry) };
    return { ok: false as const, error: "Enregistrement du fichier refusé" };
  }

  return { ok: true as const, data: mapExistingFile(data) };
}

export async function removeFile(session: LinkSession, fileId: string, expected: ExpectedScope) {
  assertExpectedScope(session, expected);
  const submission = await requireWorkingSubmission(session);
  assertExpectedSubmission(submission, expected);

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

/**
 * Applique côté serveur exactement les mêmes règles obligatoires que
 * l'interface (`youtubeBlocker` / `metaBlocker` dans `./status`), puis
 * passage atomique à `submitted`. Les deux validations partagent la même
 * source pour ne jamais diverger.
 */
export async function submitCurrentSubmission(session: LinkSession, expected: ExpectedScope) {
  await enforceRateLimit("submit", callerSubject(session.sessionId));
  assertExpectedScope(session, expected);
  const submission = await getOrCreateSubmission(session);
  assertExpectedSubmission(submission, expected);
  if (submission.status === "submitted") {
    return { ok: true as const, data: { submittedAt: submission.submitted_at as string } };
  }

  const snapshot = await buildSnapshot(session);
  const state = stateFromSnapshot(snapshot);

  const problems = [youtubeBlocker(state), metaBlocker(state)].filter(
    (message): message is string => message !== null,
  );
  if (problems.length > 0) {
    return { ok: false as const, error: problems.join(" ") };
  }

  const { data, error } = await supabaseAdmin
    .from("submissions")
    .update({ status: "submitted", snapshot: snapshot as never })
    .eq("id", submission.id)
    .eq("status", "working")
    .select("submitted_at")
    .maybeSingle();

  if (error || !data?.submitted_at) {
    // Aucune ligne mise à jour : soit une confirmation concurrente a déjà fait passer
    // cette submission à `submitted` entre notre lecture et cet UPDATE conditionnel, soit
    // l'écriture a échoué pour une autre raison. On relit l'état réel avant de trancher,
    // pour ne jamais renvoyer un échec à un appel qui a en réalité réussi ailleurs.
    const { data: current } = await supabaseAdmin
      .from("submissions")
      .select("status, submitted_at")
      .eq("id", submission.id)
      .eq("client_id", session.clientId)
      .eq("collection_id", session.collectionId)
      .maybeSingle();

    if (current?.status === "submitted" && current.submitted_at) {
      // Déjà finalisée par cet autre appel : il a déjà écrit son propre journal d'audit,
      // ne pas en créer un second ici.
      return { ok: true as const, data: { submittedAt: current.submitted_at } };
    }

    return { ok: false as const, error: "Envoi impossible" };
  }

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
