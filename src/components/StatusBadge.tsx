import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "gold" | "sawaz" | "neutral" | "success";

const toneClass: Record<Tone, string> = {
  gold: "border-primary/40 bg-primary/10 text-primary",
  sawaz: "border-sawaz/40 bg-sawaz/10 text-sawaz",
  neutral: "border-border-strong bg-surface-raised text-muted-foreground",
  success: "border-primary/25 bg-surface-raised text-foreground",
};

export function StatusBadge({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {icon ? <span className="grid place-items-center [&_svg]:size-3">{icon}</span> : null}
      {children}
    </span>
  );
}
