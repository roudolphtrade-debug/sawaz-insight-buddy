import type { ReactNode } from "react";

import { BrandHeader } from "@/components/BrandHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { SawazMark } from "@/components/brand/Logos";
import type { StepId } from "@/lib/steps";

export function StepLayout({
  step,
  title,
  intro,
  children,
}: {
  step: StepId;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  const showLegend = step === "youtube" || step === "contenus" || step === "meta";

  return (
    <div className="min-h-screen bg-background">
      <BrandHeader />

      <main className="mx-auto w-full max-w-3xl px-5 pt-8 pb-20 sm:px-8 sm:pt-12">
        <ProgressBar current={step} />

        <div className="mt-9">
          <h1 className="font-display text-2xl font-extrabold leading-tight text-balance sm:text-4xl">
            {title}
          </h1>

          {intro ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-body sm:text-base">
              {intro}
            </p>
          ) : null}

          {showLegend ? (
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-border bg-surface/60 px-4 py-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
                <strong className="font-semibold text-foreground">Obligatoire</strong>
                <span>pour continuer</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted-foreground" aria-hidden="true" />
                <strong className="font-semibold text-foreground">Facultatif</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                <strong className="font-semibold text-foreground">Conditionnel</strong>
                <span>selon ta réponse</span>
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-8 space-y-5 pb-28 sm:pb-32">{children}</div>
      </main>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-5 py-8 text-center sm:px-8">
          <SawazMark />
          <p className="text-xs text-muted-foreground">
            Sawaz Décodage · Décodage stratégique LFTC
          </p>
        </div>
      </div>
    </div>
  );
}
