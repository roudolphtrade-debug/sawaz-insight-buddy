import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Progressive disclosure : contenu replié par défaut (lexiques, détails).
 * Le contenu n'est jamais modifié, seulement révélé à la demande.
 */
export function Disclosure({
  label,
  hint,
  defaultOpen = false,
  tone = "sawaz",
  children,
  className,
}: {
  label: string;
  hint?: string;
  defaultOpen?: boolean;
  tone?: "sawaz" | "neutral";
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-surface", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-raised"
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-sm font-semibold",
              tone === "sawaz" ? "text-sawaz" : "text-foreground",
            )}
          >
            {label}
          </span>
          {hint ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="border-t border-border p-4">{children}</div> : null}
    </div>
  );
}
