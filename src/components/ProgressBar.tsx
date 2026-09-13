import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Circle, CircleDot } from "lucide-react";
import type { ComponentType } from "react";

import {
  collectionProgress,
  contenusSectionState,
  introductionSectionState,
  metaSectionState,
  validationSectionState,
  youtubeSectionState,
  type SectionState,
} from "@/lib/collection/status";
import { useCollection } from "@/lib/collection/store";
import { STEPS, type StepId } from "@/lib/steps";
import { cn } from "@/lib/utils";

const STATE_LABEL: Record<SectionState, string> = {
  "not-started": "Non commencée",
  "in-progress": "En cours",
  done: "Terminée",
  "needs-correction": "À corriger",
};

const STATE_ICON: Record<SectionState, ComponentType<{ className?: string }>> = {
  "not-started": Circle,
  "in-progress": CircleDot,
  done: CheckCircle2,
  "needs-correction": AlertTriangle,
};

const STATE_CLASS: Record<SectionState, string> = {
  "not-started": "text-muted-foreground",
  "in-progress": "text-primary",
  done: "text-primary",
  "needs-correction": "text-destructive",
};

function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

export function ProgressBar({ current }: { current: StepId }) {
  const { state, attemptedSteps } = useCollection();
  const currentStep = STEPS.find((s) => s.id === current);
  // Calcul centralisé (status.ts) : nombre d'exigences obligatoires réellement
  // applicables compte tenu des réponses déjà données, jamais déduit de l'index de la
  // page courante — voir `collectionProgress`.
  const progress = collectionProgress(state);

  const stateFor = (id: StepId): SectionState => {
    switch (id) {
      case "introduction":
        return introductionSectionState(state);
      case "youtube":
        return youtubeSectionState(state, attemptedSteps.has("youtube"));
      case "contenus":
        return contenusSectionState(state);
      case "meta":
        return metaSectionState(state, attemptedSteps.has("meta"));
      case "validation":
        return validationSectionState(state, attemptedSteps.has("validation"));
    }
  };

  const currentState = stateFor(current);
  const remainingText =
    progress.remaining === 0
      ? "Toutes les exigences obligatoires sont remplies."
      : `${plural(progress.remaining, "exigence obligatoire")} restante${progress.remaining > 1 ? "s" : ""}.`;

  return (
    <nav aria-label="Progression du décodage" className="w-full">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 text-xs font-semibold text-muted-foreground">
          <span className="font-bold uppercase tracking-[0.08em] text-foreground">
            {currentStep?.shortLabel}
          </span>
          <span className="mx-2 text-border-strong">·</span>
          {STATE_LABEL[currentState]}
        </p>

        <p className="shrink-0 text-xs font-bold text-primary">{progress.percent} %</p>
      </div>

      {/* Jauge non fixe : la largeur suit `progress.percent`, recalculé à chaque
          rendu depuis l'état réel des réponses (voir `collectionProgress`). */}
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={`${progress.percent} % — ${remainingText}`}
      >
        <div
          className="gold-rule h-full rounded-full transition-[width] duration-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">{remainingText}</p>

      <ol className="mt-4 flex snap-x gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
        {STEPS.map((step) => {
          const active = step.id === current;
          const sectionState = stateFor(step.id);
          const Icon = STATE_ICON[sectionState];
          const ariaLabel = `${step.label} — ${STATE_LABEL[sectionState]}`;

          const itemClass = cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
            active
              ? "border-primary/65 bg-primary/[0.10] text-primary shadow-sm"
              : "border-border/70 bg-transparent text-foreground hover:border-border-strong hover:bg-surface-raised",
          );

          const content = (
            <span className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="truncate">{step.shortLabel}</span>
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide",
                  STATE_CLASS[sectionState],
                )}
              >
                <Icon className="size-3 shrink-0" aria-hidden="true" />
                {STATE_LABEL[sectionState]}
              </span>
            </span>
          );

          return (
            <li key={step.id} className="min-w-max shrink-0 snap-start sm:min-w-0 sm:shrink">
              {active ? (
                <span aria-current="step" aria-label={ariaLabel} className={itemClass}>
                  {content}
                </span>
              ) : (
                // Chaque onglet est accessible au clic dans les deux sens : la
                // sauvegarde bornée existante (`useCollectionNavGuard`) intercepte
                // déjà toute navigation interne, quel que soit l'onglet visé.
                <Link to={step.to} aria-label={ariaLabel} className={itemClass}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
