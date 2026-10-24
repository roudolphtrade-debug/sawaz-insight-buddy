import { ChevronDown, Download, Eye, FileText } from "lucide-react";

import {
  formatFileSize,
  formatParisDateTime,
  groupFiles,
  slotLabel,
} from "@/lib/studio/qualification";
import type { StudioFile } from "@/lib/studio/studio.functions";

/**
 * Documents d'une réponse, regroupés YouTube / Meta / Autres en accordéons repliés.
 * Purement présentationnel : l'ouverture sécurisée (URL signée temporaire, lightbox,
 * téléchargement réel) reste gérée par l'appelant via `onOpen`.
 */
export function DocumentGroups({
  files,
  onOpen,
}: {
  files: readonly StudioFile[];
  onOpen: (fileId: string, mode: "preview" | "download") => void;
}) {
  const groups = groupFiles(files);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun document reçu pour cette réponse.</p>;
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <details
          key={group.id}
          data-file-group={group.id}
          className="group rounded-lg border border-border bg-surface-raised"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span>{group.label}</span>
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {group.files.length} document{group.files.length > 1 ? "s" : ""}
              <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
            </span>
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {group.files.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText className="size-4 shrink-0 text-sawaz" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {slotLabel(file.slot)} · {formatFileSize(file.size)} ·{" "}
                      {formatParisDateTime(file.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {file.isImage ? (
                    <button
                      type="button"
                      onClick={() => onOpen(file.id, "preview")}
                      aria-label={`Aperçu de ${file.name}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                    >
                      <Eye className="size-3.5" aria-hidden="true" />
                      Aperçu
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onOpen(file.id, "download")}
                    aria-label={`Télécharger ${file.name}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    <Download className="size-3.5" aria-hidden="true" />
                    Télécharger
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
