import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { STEPS, type StepId } from "@/lib/steps";
import { cn } from "@/lib/utils";

export function ProgressBar({ current }: { current: StepId }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  const currentStep = STEPS[currentIndex];
  const percent = ((currentIndex + 1) / STEPS.length) * 100;

  return (
    <nav aria-label="Progression du diagnostic" className="w-full">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 text-xs font-semibold text-muted-foreground">
          Étape {currentIndex + 1} sur {STEPS.length}
          <span className="mx-2 text-border-strong">·</span>
          <span className="font-bold uppercase tracking-[0.08em] text-foreground">
            {currentStep?.shortLabel}
          </span>
        </p>

        <p className="shrink-0 text-xs font-bold text-primary">
          {Math.round(percent)} %
        </p>
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={currentIndex + 1}
        aria-valuetext={`Étape ${currentIndex + 1} sur ${STEPS.length} : ${currentStep?.label ?? ""}`}
      >
        <div
          className="gold-rule h-full rounded-full transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="mt-4 flex snap-x gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;

          const content = (
            <>
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border text-[0.625rem] font-bold",
                  done &&
                    "border-primary/45 bg-primary/10 text-primary",
                  active &&
                    "border-primary bg-primary text-primary-foreground",
                  !done &&
                    !active &&
                    "border-border text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {done ? <Check className="size-3" /> : step.index}
              </span>

              <span className="truncate">{step.shortLabel}</span>
            </>
          );

          return (
            <li
              key={step.id}
              className="min-w-max shrink-0 snap-start sm:min-w-0 sm:shrink"
            >
              {done ? (
                <Link
                  to={step.to}
                  className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.035] px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.06]"
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold",
                    active &&
                      "border-primary/65 bg-primary/[0.10] text-primary shadow-sm",
                    !active &&
                      "border-border/70 bg-transparent text-muted-foreground/65",
                  )}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}