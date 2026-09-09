import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Regroupe plusieurs cartes sous un même bloc thématique (réduction de charge cognitive). */
export function SectionBlock({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-5", className)}>
      <header className="border-l-2 border-primary/60 pl-4">
        {eyebrow ? <p className="text-eyebrow text-primary">{eyebrow}</p> : null}
        <h2 className="mt-1 font-display text-lg font-bold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
