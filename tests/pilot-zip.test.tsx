import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ZipButtonView, zipButtonLabel } from "@/components/studio/ZipDownloadButton";
import { FILE_GROUP_LABEL, fileGroupOf } from "@/lib/studio/qualification";
import {
  archiveFileName,
  buildZip,
  crc32,
  dedupePaths,
  safeEntryName,
  zipLimitError,
} from "@/lib/studio/zip";

function readCentral(zip: Uint8Array) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const eocd = zip.length - 22;
  expect(v.getUint32(eocd, true)).toBe(0x06054b50);
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const names: string[] = [];
  const flags: number[] = [];
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50);
    flags.push(v.getUint16(p + 8, true));
    const len = v.getUint16(p + 28, true);
    names.push(new TextDecoder().decode(zip.subarray(p + 46, p + 46 + len)));
    p += 46 + len;
  }
  return { count, names, flags };
}

describe("helper ZIP", () => {
  const bytes = (s: string) => new TextEncoder().encode(s);

  it("commence par la signature PK et compte les entrées", () => {
    const zip = buildZip([
      { path: "YouTube/a.png", data: bytes("aaa") },
      { path: "Meta/b.png", data: bytes("bb") },
    ]);
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
    expect(zip[2]).toBe(3);
    expect(zip[3]).toBe(4);
    expect(readCentral(zip).count).toBe(2);
  });

  it("encode les noms en UTF-8 avec le drapeau dédié", () => {
    const zip = buildZip([{ path: "Autres/Vue d’ensemble é.png", data: bytes("x") }]);
    const { names, flags } = readCentral(zip);
    expect(names).toEqual(["Autres/Vue d’ensemble é.png"]);
    expect(flags[0] & 0x0800).toBe(0x0800);
  });

  it("CRC32 de référence", () => {
    expect(crc32(bytes("123456789"))).toBe(0xcbf43926);
  });

  it("range par sous-dossiers YouTube / Meta / Autres", () => {
    const paths = ["yt.capture.overview", "m.capture", "other"].map(
      (slot) => `${FILE_GROUP_LABEL[fileGroupOf(slot)]}/f.png`,
    );
    const zip = buildZip(paths.map((path) => ({ path, data: bytes("1") })));
    expect(readCentral(zip).names).toEqual(["YouTube/f.png", "Meta/f.png", "Autres/f.png"]);
  });

  it("gère les doublons de noms", () => {
    expect(dedupePaths(["Meta/a.png", "Meta/a.png", "Meta/A.png", "YouTube/a.png"])).toEqual([
      "Meta/a.png",
      "Meta/a (2).png",
      "Meta/A (3).png",
      "YouTube/a.png",
    ]);
  });

  it("neutralise les chemins dans les noms", () => {
    expect(safeEntryName("../x/y.png")).toBe("_x_y.png");
    expect(safeEntryName("")).toBe("document");
  });
});

describe("nom d'archive", () => {
  it("utilise le répondant normalisé", () => {
    expect(archiveFileName("Raphaël  L'Hôte", "831da37a-1234")).toBe("documents-raphael-l-hote.zip");
  });
  it("retombe sur l'identifiant court", () => {
    expect(archiveFileName(null, "831da37a-1234-5678")).toBe("documents-831da37a.zip");
    expect(archiveFileName("***", "831da37a-1234-5678")).toBe("documents-831da37a.zip");
  });
});

describe("limites", () => {
  it("le corpus LFTC (16 PNG, ~1,75 Mo) passe", () => {
    expect(zipLimitError(Array.from({ length: 16 }, () => ({ size: 115_000 })))).toBeNull();
  });
  it("refuse au-delà de 100 fichiers ou 200 Mo", () => {
    expect(zipLimitError(Array.from({ length: 101 }, () => ({ size: 1 })))).toContain("maximum 100");
    expect(zipLimitError([{ size: 201 * 1024 * 1024 }])).toContain("200 Mo");
  });
});

describe("bouton ZIP", () => {
  it("affiche le libellé et l'état de préparation", () => {
    expect(zipButtonLabel(16, false)).toBe("Télécharger les 16 documents (.zip)");
    const busy = renderToStaticMarkup(<ZipButtonView count={16} busy onClick={() => {}} />);
    expect(busy).toContain("Préparation du ZIP…");
    expect(busy).toContain("disabled");
    expect(busy).not.toContain("—");
  });
});
