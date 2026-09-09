/**
 * Politique d'upload — durcissement production.
 * Module pur (aucune dépendance serveur) : réutilisable côté serveur pour la
 * validation des métadonnées, la génération d'un nom de stockage serveur et
 * l'inspection des premiers octets réellement écrits dans le bucket privé.
 */

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MIN_FILE_BYTES = 8;

/** Extensions autorisées par type MIME accepté (allowlist stricte). */
export const ALLOWED_TYPES: Record<string, { ext: string[]; canonical: string }> = {
  "application/pdf": { ext: ["pdf"], canonical: "pdf" },
  "image/png": { ext: ["png"], canonical: "png" },
  "image/jpeg": { ext: ["jpg", "jpeg"], canonical: "jpg" },
  "image/webp": { ext: ["webp"], canonical: "webp" },
  "text/csv": { ext: ["csv"], canonical: "csv" },
  "application/vnd.ms-excel": { ext: ["xls", "csv"], canonical: "xls" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    ext: ["xlsx"],
    canonical: "xlsx",
  },
};

/** Extensions systématiquement refusées, même déguisées en double extension. */
const DANGEROUS_EXT = new Set([
  "exe", "dll", "com", "bat", "cmd", "ps1", "sh", "bash", "zsh", "js", "mjs", "cjs",
  "jar", "app", "scr", "msi", "vbs", "wsf", "php", "phtml", "py", "rb", "pl", "html",
  "htm", "svg", "xhtml", "hta", "lnk", "iso", "dmg", "so", "dylib", "apk",
]);

export function fileExtension(name: string): string {
  const clean = name.trim().toLowerCase();
  const dot = clean.lastIndexOf(".");
  return dot === -1 ? "" : clean.slice(dot + 1);
}

/** Toutes les extensions d'un nom (détection de `rapport.pdf.exe`). */
export function extensionChain(name: string): string[] {
  return name
    .trim()
    .toLowerCase()
    .split(".")
    .slice(1)
    .map((part) => part.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
}

export type UploadMeta = { slot: string; name: string; mime: string; size: number };

/**
 * Valide slot, MIME, extension, taille et nom. Retourne un message utilisateur
 * (français, non technique) ou `null` si l'upload est acceptable.
 */
export function validateUploadMeta(
  input: UploadMeta,
  allowedSlots: ReadonlySet<string>,
): string | null {
  if (!allowedSlots.has(input.slot)) return "Emplacement de fichier inconnu";

  const rule = ALLOWED_TYPES[input.mime];
  if (!rule) return "Format de fichier non accepté";

  if (!Number.isFinite(input.size) || input.size < MIN_FILE_BYTES) return "Fichier vide";
  if (input.size > MAX_FILE_BYTES) return "Fichier trop volumineux (20 Mo maximum)";

  const name = input.name.trim();
  if (!name || name.length > 180) return "Nom de fichier invalide";
  if (/[\u0000-\u001f\u007f]/.test(name)) return "Nom de fichier invalide";
  if (name.includes("/") || name.includes("\\") || name.includes("..")) {
    return "Nom de fichier invalide";
  }

  const chain = extensionChain(name);
  if (chain.some((ext) => DANGEROUS_EXT.has(ext))) return "Type de fichier refusé";

  const ext = fileExtension(name);
  if (!ext || !rule.ext.includes(ext)) return "L'extension ne correspond pas au type de fichier";

  return null;
}

/**
 * Nom d'objet de stockage entièrement généré côté serveur.
 * Le nom d'origine n'est conservé que dans la base, jamais dans le chemin.
 */
export function storageObjectName(mime: string, uuid: string): string {
  const rule = ALLOWED_TYPES[mime];
  return `${uuid}.${rule?.canonical ?? "bin"}`;
}

const TEXT_MIMES = new Set(["text/csv", "application/vnd.ms-excel"]);

/** Signatures binaires attendues (magic bytes). */
const SIGNATURES: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [[0x50, 0x4b, 0x03, 0x04]],
  "application/vnd.ms-excel": [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
    [0x50, 0x4b, 0x03, 0x04],
  ],
};

/** Motifs interdits dans les fichiers texte (CSV piégé, polyglot HTML). */
const SUSPICIOUS_TEXT = [/<\s*script/i, /<\s*iframe/i, /<!doctype\s+html/i, /^\s*<\s*html/i];

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, i) => bytes[i] === byte);
}

/**
 * Inspecte les premiers octets réellement stockés.
 * Retourne un message d'erreur si le contenu ne correspond pas au type annoncé
 * ou s'il présente une signature exécutable / active.
 */
export function inspectFileHead(bytes: Uint8Array, mime: string): string | null {
  if (bytes.length === 0) return "Fichier vide";

  // Exécutables : refus quel que soit le MIME annoncé.
  if (
    startsWith(bytes, [0x4d, 0x5a]) || // PE / DOS
    startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46]) || // ELF
    startsWith(bytes, [0xcf, 0xfa, 0xed, 0xfe]) || // Mach-O
    startsWith(bytes, [0x23, 0x21]) // shebang
  ) {
    return "Fichier suspect refusé";
  }

  if (TEXT_MIMES.has(mime)) {
    const signatures = SIGNATURES[mime] ?? [];
    if (signatures.some((sig) => startsWith(bytes, sig))) return null; // vrai .xls binaire
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 2048));
    if (SUSPICIOUS_TEXT.some((pattern) => pattern.test(text))) return "Fichier suspect refusé";
    // Un CSV ne doit pas contenir d'octets nuls.
    if (bytes.includes(0x00)) return "Le contenu ne correspond pas à un fichier tableur";
    return null;
  }

  const signatures = SIGNATURES[mime];
  if (!signatures) return "Format de fichier non accepté";
  if (!signatures.some((sig) => startsWith(bytes, sig))) {
    return "Le contenu ne correspond pas au type de fichier annoncé";
  }

  if (mime === "image/webp" && bytes.length >= 12) {
    const riffTag = String.fromCharCode(...bytes.slice(8, 12));
    if (riffTag !== "WEBP") return "Le contenu ne correspond pas au type de fichier annoncé";
  }

  return null;
}
