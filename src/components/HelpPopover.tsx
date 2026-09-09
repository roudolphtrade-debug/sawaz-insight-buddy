import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function HelpPopover({
  title,
  children,
  label = "Aide sur cette question",
}: {
  title: string;
  children: ReactNode;
  label?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-muted-foreground transition-colors hover:border-sawaz/50 hover:text-sawaz"
      >
        <HelpCircle className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 rounded-xl border-border bg-popover text-popover-foreground shadow-[var(--shadow-elevated)]"
      >
        <p className="text-eyebrow mb-2 text-sawaz">{title}</p>
        <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
