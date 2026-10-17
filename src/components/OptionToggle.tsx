import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";

import { useCollection } from "@/lib/collection/store";
import { cn } from "@/lib/utils";

/** Petite case à cocher pour les options « Je ne trouve pas cette donnée ». */
export function OptionToggle({
  label,
  checked,
  onToggle,
  confirmation = "C'est noté, ce n'est pas bloquant.",
  blockedReason,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  confirmation?: string;
  /**
   * Activation impossible en l'état (ex. un fichier confirmé contredit l'indicateur) :
   * la case reste décochée et un clic affiche cette explication au lieu de basculer.
   */
  blockedReason?: string | undefined;
}) {
  const { readOnly } = useCollection();
  const [showReason, setShowReason] = useState(false);
  const blocked = Boolean(blockedReason) && !checked;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-disabled={blocked || undefined}
        disabled={readOnly}
        onClick={() => {
          if (blocked) {
            setShowReason(true);
            return;
          }
          onToggle();
        }}
        className={cn(
          "inline-flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
          checked
            ? "border-sawaz/50 bg-sawaz/10 text-sawaz"
            : "border-border bg-surface text-muted-foreground hover:border-border-strong",
          (blocked || readOnly) && "cursor-default opacity-60 hover:border-border",
        )}
      >
        <span
          className={cn(
            "grid size-4 shrink-0 place-items-center rounded border",
            checked ? "border-sawaz bg-sawaz text-background" : "border-border-strong",
          )}
          aria-hidden="true"
        >
          {checked ? <Check className="size-3" /> : null}
        </span>
        {label}
      </button>
      {checked ? (
        <span role="status" className="text-xs font-medium text-muted-foreground">
          {confirmation}
        </span>
      ) : null}
      {blocked && showReason ? (
        <span
          role="status"
          className="flex basis-full items-start gap-2 text-xs font-medium leading-relaxed text-foreground"
        >
          <AlertCircle
            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          {blockedReason}
        </span>
      ) : null}
    </div>
  );
}
