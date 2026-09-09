import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ChoiceCard({
  label,
  description,
  icon,
  selected = false,
  hint,
  multi = false,
  onSelect,
}: {
  label: string;
  description?: string | undefined;
  icon?: ReactNode | undefined;
  selected?: boolean | undefined;
  hint?: string | undefined;
  multi?: boolean | undefined;
  onSelect?: (() => void) | undefined;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group grid w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        icon
          ? "grid-cols-[auto_minmax(0,1fr)_auto]"
          : "grid-cols-[minmax(0,1fr)_auto]",
        selected
          ? "border-primary/65 bg-primary/[0.09] shadow-[0_0_0_1px_rgba(56,189,248,0.06)]"
          : "border-border bg-surface-raised hover:border-border-strong hover:bg-surface",
      )}
    >
      {icon ? (
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg border [&_svg]:size-4",
            selected
              ? "border-primary/45 bg-primary/12 text-primary"
              : "border-border bg-surface text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}

      <span className="min-w-0 justify-self-start text-left">
        <span className="block text-sm font-semibold leading-snug text-foreground">
          {label}
        </span>

        {description ? (
          <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}

        {hint ? (
          <span className="mt-2 block text-[0.6875rem] font-medium tracking-wide text-sawaz">
            {hint}
          </span>
        ) : null}
      </span>

      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center justify-self-end border transition-all",
          multi ? "rounded-[5px]" : "rounded-full",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border-strong bg-background",
        )}
        aria-hidden="true"
      >
        {selected ? (
          multi ? (
            <Check className="size-3" />
          ) : (
            <span className="size-2 rounded-full bg-current" />
          )
        ) : null}
      </span>
    </button>
  );
}