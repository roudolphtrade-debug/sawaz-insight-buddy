import { allSectionStates, STATE_LABEL } from "@/lib/collection/sectionState";
import { collectionProgress } from "@/lib/collection/status";
import { useCollection } from "@/lib/collection/store";
import { STEPS, type StepId } from "@/lib/steps";

function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

/**
 * Jauge compacte : étape courante, pourcentage et nombre d'exigences restantes.
 * Volontairement séparée des onglets (`StepTabs`) — voir `StepLayout`, qui la place
 * avec l'en-tête dans une même structure fixe (« jauge compacte toujours visible »),
 * alors que les onglets défilent avec le reste du contenu.
 */
export function ProgressBar({ current }: { current: StepId }) {
  const { state, attemptedSteps, visitedSteps, completedSteps } = useCollection();
  const currentStep = STEPS.find((s) => s.id === current);
  // Calcul centralisé (status.ts) : modèle hybride — Introduction 20 points dès sa
  // consultation, YouTube/Meta 20 chacune au prorata de leurs exigences satisfaites,
  // Contenus 10 dès consultation puis 20 après validation explicite (pas la simple
  // consultation — voir `contenusSectionState`), Validation 10 dès consultation puis 20
  // après transmission. Ne reste jamais à 0 % après une avancée réelle, et n'atteint
  // jamais 100 % avant transmission ni tant qu'une exigence obligatoire manque.
  const progress = collectionProgress(state, {
    introductionVisited: visitedSteps.has("introduction"),
    contenusVisited: visitedSteps.has("contenus"),
    contenusCompleted: completedSteps.has("contenus"),
    validationVisited: visitedSteps.has("validation"),
  });
  // Jamais affiché tel quel sans passer par ce clamp explicite (voir `collectionProgress` :
  // borné à 99 tant que `remaining > 0` ou que la collecte n'est pas transmise, sinon 100).
  const clampedPercent = progress.percent;
  const states = allSectionStates(state, attemptedSteps, visitedSteps, completedSteps);
  const currentState = states[current];
  const remainingText =
    progress.remaining === 0
      ? "Toutes les exigences obligatoires sont remplies."
      : `${plural(progress.remaining, "exigence obligatoire")} restante${progress.remaining > 1 ? "s" : ""}.`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 text-xs font-semibold text-muted-foreground">
          <span className="font-bold uppercase tracking-[0.08em] text-foreground">
            {currentStep?.shortLabel}
          </span>
          <span className="mx-2 text-border-strong">·</span>
          {STATE_LABEL[currentState]}
        </p>

        <p className="shrink-0 text-xs font-bold text-primary">{clampedPercent} %</p>
      </div>

      {/* Jauge non fixe : largeur posée exclusivement via `style` (jamais une classe
          Tailwind dynamique, qui ne peut pas être générée pour une valeur arbitraire à
          l'exécution) — recalculée à chaque rendu depuis l'état réel des réponses (voir
          `collectionProgress`). Attributs ARIA de `progressbar` complets.
          `bg-primary` (jamais `gold-rule`, une classe qui n'existe nulle part dans
          styles.css — le remplissage était donc transparent, invisible malgré une
          largeur correcte) : la même couleur que les boutons primaires, garantie
          présente. */}
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clampedPercent}
        aria-valuetext={`${clampedPercent} % — ${remainingText}`}
      >
        <div
          aria-hidden="true"
          className="h-full bg-primary opacity-100 transition-[width] duration-500"
          style={{ width: `${clampedPercent}%` }}
        />
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">{remainingText}</p>
    </div>
  );
}
