import { useServerFn } from "@tanstack/react-start";
import { Archive } from "lucide-react";
import { useState } from "react";

import { FILE_GROUP_LABEL, fileGroupOf } from "@/lib/studio/qualification";
import { getStudioSubmissionFileUrls } from "@/lib/studio/studio.functions";
import {
  archiveFileName,
  buildZip,
  dedupePaths,
  safeEntryName,
  zipLimitError,
  ZIP_MAX_BYTES,
} from "@/lib/studio/zip";

const GENERIC_ERROR = "Impossible de préparer le ZIP. Réessayez ou téléchargez les documents un par un.";

export function zipButtonLabel(count: number, busy: boolean) {
  if (busy) return "Préparation du ZIP…";
  return `Télécharger ${count > 1 ? `les ${count} documents` : "le document"} (.zip)`;
}

/** Bouton présentationnel : état d'attente et désactivation. */
export function ZipButtonView({
  count,
  busy,
  onClick,
}: {
  count: number;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      className="inline-flex items-center gap-1.5 rounded-md border border-sawaz/30 bg-sawaz/[0.06] px-3 py-1.5 text-xs font-semibold text-sawaz transition hover:bg-sawaz/10 disabled:cursor-wait disabled:opacity-60"
    >
      <Archive className="size-3.5" aria-hidden="true" />
      {zipButtonLabel(count, busy)}
    </button>
  );
}

export function ZipDownloadButton({
  submissionId,
  respondent,
  files,
}: {
  submissionId: string;
  respondent: string | null;
  files: readonly { size: number }[];
}) {
  const getUrls = useServerFn(getStudioSubmissionFileUrls);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (files.length === 0) return null;

  async function run() {
    setError(null);
    const limit = zipLimitError(files);
    if (limit) return setError(limit);
    setBusy(true);
    try {
      const res = await getUrls({ data: { submissionId } });
      if (!res.ok) throw new Error("urls");
      const limit2 = zipLimitError(res.data);
      if (limit2) {
        setError(limit2);
        return;
      }
      const paths = dedupePaths(
        res.data.map((f) => `${FILE_GROUP_LABEL[fileGroupOf(f.slot)]}/${safeEntryName(f.name)}`),
      );
      let total = 0;
      const entries = [];
      for (const [i, f] of res.data.entries()) {
        const response = await fetch(f.url);
        if (!response.ok) throw new Error("fetch");
        const data = new Uint8Array(await response.arrayBuffer());
        total += data.length;
        if (total > ZIP_MAX_BYTES) {
          setError("Les documents dépassent 200 Mo au total. Téléchargez-les individuellement.");
          return;
        }
        entries.push({ path: paths[i] ?? safeEntryName(f.name), data });
      }
      const zip = buildZip(entries);
      const blob = new Blob([zip as BlobPart], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = archiveFileName(respondent, submissionId);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ZipButtonView count={files.length} busy={busy} onClick={() => void run()} />
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
