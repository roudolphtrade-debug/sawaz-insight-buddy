import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { allSectionStates, firstIncompleteStepId, isStepUnlocked } from "./sectionState";
import { useCollection } from "./store";
import { STEPS, type StepId } from "@/lib/steps";

/**
 * Garde d'accès séquentiel, appliquée dans le composant de chaque étape verrouillable
 * (YouTube, Contenus, Meta, Validation — jamais Introduction, toujours déverrouillée).
 * Couvre à la fois l'URL tapée directement et l'historique du navigateur (retour/avance) :
 * les deux montent le composant de la route comme n'importe quelle navigation, donc cet
 * effet s'exécute dans tous les cas.
 *
 * Une tentative de contournement redirige vers la première étape *réellement*
 * incomplète (`firstIncompleteStepId`) — jamais systématiquement vers Introduction : si
 * l'utilisateur a par exemple déjà terminé YouTube et consulté Contenus sans le
 * valider, un accès direct à Meta le renvoie à Contenus, pas au tout début.
 *
 * N'agit qu'une fois la collecte hydratée : avant cela, `visitedSteps`/`completedSteps`
 * ne reflètent pas encore la progression persistée pour cette portée, et un verdict
 * prématuré redirigerait à tort un utilisateur légitime pendant le court instant du
 * chargement initial.
 */
export function useStepAccessGuard(step: StepId) {
  const navigate = useNavigate();
  const { hydrated, state, attemptedSteps, visitedSteps, completedSteps } = useCollection();

  useEffect(() => {
    if (!hydrated) return;
    const states = allSectionStates(state, attemptedSteps, visitedSteps, completedSteps);
    if (isStepUnlocked(step, states, visitedSteps, completedSteps)) return;
    const target = firstIncompleteStepId(states, visitedSteps, completedSteps);
    const targetStep = STEPS.find((s) => s.id === target) ?? STEPS[0]!;
    void navigate({ to: targetStep.to, replace: true });
  }, [hydrated, state, attemptedSteps, visitedSteps, completedSteps, step, navigate]);
}
