import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** Petite case à cocher pour les options « Je ne trouve pas cette donnée ». */
export function OptionToggle({
  label,
  checked,
  onToggle,
  confirmation = "C'est noté, ce n'est pas bloquant.",
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  confirmation?: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
        checked
          ? "border-sawaz/50 bg-sawaz/10 text-sawaz"
          : "border-border bg-surface text-muted-foreground hover:border-border-strong",
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
    </div>
  );
}
