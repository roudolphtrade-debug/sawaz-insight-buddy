import { FileText, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";

import { MicroConfirm } from "@/components/MicroConfirm";
import { StatusBadge } from "@/components/StatusBadge";
import { collectionService, formatBytes } from "@/lib/collection/collectionService";
import { useSlotFiles } from "@/lib/collection/store";
import { cn } from "@/lib/utils";

/** Sélection locale de fichiers : aucun upload serveur n'est effectué ici. */
export function FileUploader({
  slot,
  label,
  hint = "PDF, PNG, JPG ou CSV · 20 Mo maximum",
  accept,
  multiple = true,
}: {
  slot: string;
  label: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
}) {
  const { files, add, remove } = useSlotFiles(slot);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleList = (list: FileList | null) => {
    if (!list) return;
    add(Array.from(list));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleList(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-5 py-8 text-center transition-all",
          dragging
            ? "border-primary bg-primary/[0.08]"
            : "border-border-strong bg-surface-raised/70 hover:border-primary/45 hover:bg-primary/[0.03]",
        )}
      >
        <span
          className="grid size-12 place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <UploadCloud className="size-5" />
        </span>

        <div>
          <p className="text-sm font-bold text-foreground">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Glisse-dépose tes fichiers ici ou sélectionne-les sur ton appareil.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center rounded-lg border border-primary/45 bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary transition-all hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          Parcourir mes fichiers
        </button>

        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          aria-label={label}
          {...(accept ? { accept } : {})}
          multiple={multiple}
          onChange={(e) => {
            handleList(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 ? (
        <MicroConfirm>
          {files.length === 1
            ? "1 élément bien enregistré"
            : `${files.length} éléments bien enregistrés`}
        </MicroConfirm>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file) => {
            const tone = file.error ? "neutral" : file.pending ? "neutral" : "gold";

            const statusLabel = file.error
              ? "Échec"
              : file.pending
                ? "Envoi…"
                : file.remoteId
                  ? "Reçu"
                  : collectionService.hasFile(file.id)
                    ? "Prêt"
                    : "À re-sélectionner";

            return (
              <li
                key={file.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-surface-raised text-muted-foreground"
                  aria-hidden="true"
                >
                  <FileText className="size-4" />
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {file.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                </span>

                <StatusBadge tone={tone}>{statusLabel}</StatusBadge>

                <button
                  type="button"
                  onClick={() => remove(file.id)}
                  aria-label={`Supprimer ${file.name}`}
                  className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}