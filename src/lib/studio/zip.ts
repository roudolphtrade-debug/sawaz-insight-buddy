/**
 * Petit encodeur ZIP (méthode STORE, sans compression) pour regrouper des fichiers
 * déjà compressés (PNG, PDF…) côté navigateur, sans dépendance externe.
 * Noms encodés en UTF-8 (bit 11 du drapeau général). Pas de ZIP64 : limites
 * défensives appliquées en amont.
 */

export type ZipEntry = { path: string; data: Uint8Array };

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day =
    ((Math.max(date.getFullYear(), 1980) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

export function buildZip(entries: readonly ZipEntry[], date: Date = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const { time, day } = dosDateTime(date);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, time, true);
    lv.setUint16(12, day, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    locals.push(local, entry.data);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, day, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.length + size;
  }

  const centralSize = centrals.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, end];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

/** Nettoie un nom de fichier pour une entrée d'archive (pas de chemin ni caractère réservé). */
export function safeEntryName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/^\.+/, "")
    .trim();
  return cleaned || "document";
}

/** Rend chaque chemin unique : « a.png », « a (2).png », « a (3).png »… (insensible à la casse). */
export function dedupePaths(paths: readonly string[]): string[] {
  const used = new Set<string>();
  return paths.map((path) => {
    const slash = path.lastIndexOf("/");
    const dir = path.slice(0, slash + 1);
    const file = path.slice(slash + 1);
    const dot = file.lastIndexOf(".");
    const base = dot > 0 ? file.slice(0, dot) : file;
    const ext = dot > 0 ? file.slice(dot) : "";
    let candidate = path;
    let n = 2;
    while (used.has(candidate.toLowerCase())) candidate = `${dir}${base} (${n++})${ext}`;
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

/** `documents-<slug>.zip`, ASCII minuscule, tirets simples. */
export function archiveFileName(respondent: string | null | undefined, submissionId: string): string {
  const slug = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "");
  const fromName = respondent ? slug(respondent) : "";
  const fallback = slug(submissionId).slice(0, 8) || "reponse";
  return `documents-${fromName || fallback}.zip`;
}

export const ZIP_MAX_FILES = 100;
export const ZIP_MAX_BYTES = 200 * 1024 * 1024;

/** Message utilisateur si la sélection dépasse les limites défensives, sinon `null`. */
export function zipLimitError(files: readonly { size: number }[]): string | null {
  if (files.length > ZIP_MAX_FILES)
    return `Trop de documents pour un seul ZIP (${files.length}, maximum ${ZIP_MAX_FILES}). Téléchargez-les individuellement.`;
  const total = files.reduce((s, f) => s + (Number(f.size) || 0), 0);
  if (total > ZIP_MAX_BYTES)
    return "Les documents dépassent 200 Mo au total. Téléchargez-les individuellement.";
  return null;
}
