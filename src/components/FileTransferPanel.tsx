import { Link } from "@tanstack/react-router";
import { AlertTriangle, LoaderCircle } from "lucide-react";

import { collectionService } from "@/lib/collection/collectionService";
import { SLOT_INFO, type FileProblem } from "@/lib/collection/rules";
import { useCollection } from "@/lib/collection/store";
import { getStep } from "@/lib/steps";

/**
 * Fichiers présents mais pas encore transmis, listés avant la transmission finale avec
 * l'action adaptée : attendre (envoi en cours), réessayer ou supprimer. Les actions
 * sont proposées ici même — un fichier peut se trouver dans un emplacement qui n'est
 * plus affiché sur son étape (méthode de transmission changée entre-temps).
 */
export function FileTransferPanel({ problems }: { problems: FileProblem[] }) {
  const { retryFile, removeFile } = useCollection();
  if (problems.length === 0) return null;

  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-xl border border-destructive/45 bg-destructive/5 p-4 sm:p-5"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
        <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
        {problems.length === 1
          ? "1 fichier n'est pas encore transmis"
          : `${problems.length} fichiers ne sont pas encore transmis`}
      </p>
      <ul className="mt-3 space-y-2">
        {problems.map(({ slot, file, kind }) => {
          const info = SLOT_INFO[slot];
          const step = info ? getStep(info.step) : null;
          const canRetry =
            kind === "failed" &&
            file.errorReason !== "rejected" &&
            (file.errorReason !== "missing" || collectionService.hasFile(file.id));
          const state =
            kind === "pending"
              ? "Envoi en cours…"
              : kind === "failed"
                ? (file.error ?? "Échec de l'envoi")
                : "À re-sélectionner";

          return (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {file.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {info?.label ?? slot}
                  {step ? (
                    <>
                      {" · "}
                      <Link to={step.to} className="underline underline-offset-2">
                        {step.label}
                      </Link>
                    </>
                  ) : null}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-destructive">
                  {kind === "pending" ? (
                    <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
                  ) : null}
                  {state}
                </span>
              </span>
              {kind !== "pending" ? (
                <span className="flex shrink-0 gap-2">
                  {canRetry ? (
                    <button
                      type="button"
                      onClick={() => retryFile(slot, file.id)}
                      className="rounded-lg border border-border-strong bg-background px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-surface"
                    >
                      Réessayer
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeFile(slot, file.id)}
                    className="rounded-lg border border-destructive/40 bg-background px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Supprimer
                  </button>
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
