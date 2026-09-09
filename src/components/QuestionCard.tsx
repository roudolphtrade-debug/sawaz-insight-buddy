import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import { HelpPopover } from "@/components/HelpPopover";
import { cn } from "@/lib/utils";

export type QuestionStatus = "required" | "optional" | "conditional" | "info";

export function QuestionCard({
  number,
  title,
  description,
  optional,
  status,
  error,
  help,
  children,
  className,
}: {
  number?: string;
  title: string;
  description?: string;
  optional?: boolean;
  status?: QuestionStatus;
  error?: string | null | undefined;
  help?: { title: string; body: ReactNode };
  children?: ReactNode;
  className?: string;
}) {
  const resolvedStatus: QuestionStatus =
    status ?? (optional ? "optional" : /^Question/i.test(number ?? "") ? "required" : "info");

  const badge =
    resolvedStatus === "required" ? (
      <span className="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
        Obligatoire
      </span>
    ) : resolvedStatus === "optional" ? (
      <span className="inline-flex items-center rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
        Facultatif
      </span>
    ) : resolvedStatus === "conditional" ? (
      <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
        Requis selon ta réponse
      </span>
    ) : null;

  return (
    <section
      data-question-error={error ? "true" : undefined}
      aria-invalid={error ? true : undefined}
      className={cn(
        "surface-panel scroll-mt-28 p-5 transition-colors sm:p-6",
        resolvedStatus === "optional" && "border-dashed bg-surface/60",
        resolvedStatus === "required" && "shadow-[var(--shadow-elevated)]",
        error && "border-destructive/70 bg-destructive/5 ring-1 ring-destructive/25",
        className,
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {number ? <span className="text-eyebrow text-primary">{number}</span> : null}
            {badge}
          </div>

          <h2 className="font-display text-base font-bold leading-snug text-balance text-foreground sm:text-lg">
            {title}
          </h2>

          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">{description}</p>
          ) : null}
        </div>

        {help ? <HelpPopover title={help.title}>{help.body}</HelpPopover> : null}
      </div>

      {children ? <div className="mt-5 border-t border-border/70 pt-5">{children}</div> : null}

      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/45 bg-destructive/10 px-3.5 py-3 text-sm font-semibold leading-relaxed text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
    </section>
  );
}
