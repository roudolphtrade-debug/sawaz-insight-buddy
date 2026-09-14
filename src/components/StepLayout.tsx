import type { ReactNode } from "react";

import { BrandHeader } from "@/components/BrandHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { StepTabs } from "@/components/StepTabs";
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
      {/* Structure fixe commune à l'en-tête et à la jauge compacte : un seul conteneur
          `sticky top-0`, les deux empilés dedans en flux normal — jamais de `top`
          calculé/codé en dur pour la jauge. Les onglets (`StepTabs`) en sont
          volontairement exclus : seuls la jauge et l'en-tête restent visibles au
          défilement. `position: sticky` (jamais `fixed`) réserve automatiquement sa
          place dans le flux, donc aucun contenu n'est masqué sur mobile. */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <BrandHeader />
        <div className="collecte-shell px-4 pb-3 sm:px-5 sm:pb-4">
          <ProgressBar current={step} />
        </div>
      </div>

      {/* `pb-6` (au lieu d'une grande réserve) sous 640px : le pied de navigation n'y
          est plus fixe (voir NavigationFooter), donc plus rien à compenser en dessous
          de `sm:`, où il redevient sticky avec sa réserve d'origine. */}
      <main className="collecte-shell px-4 pt-6 pb-6 sm:px-5 sm:pt-8 sm:pb-20">
        <StepTabs current={step} />

        <div className="mt-8">
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

        <div className="mt-8 space-y-5 pb-6 sm:pb-32">{children}</div>
      </main>

      <div className="border-t border-border">
        <div className="collecte-shell flex flex-col items-center gap-2 px-4 py-8 text-center sm:px-5">
          <SawazMark />
          {/* Bleu Sawaz (`text-sawaz`) plutôt que le gris neutre par défaut, pour gagner
              en visibilité sans concurrencer les logos juste au-dessus ; point médian
              conservé tel quel (deux informations courtes de même niveau). */}
          <p className="text-xs font-medium text-sawaz">
            Sawaz Décodage · Décodage stratégique LFTC
          </p>
          <p className="text-[11px] text-muted-foreground/70">© 2026 Sawaz Entertainment</p>
        </div>
      </div>
    </div>
  );
}
