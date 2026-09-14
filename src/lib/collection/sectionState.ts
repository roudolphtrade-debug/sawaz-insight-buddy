import { AlertTriangle, CheckCircle2, Circle, CircleDot } from "lucide-react";
import type { ComponentType } from "react";

import {
  contenusSectionState,
  introductionSectionState,
  metaSectionState,
  validationSectionState,
  youtubeSectionState,
  type SectionState,
} from "./status";
import type { CollectionState } from "./types";
import { STEPS, type StepId } from "@/lib/steps";

export type { SectionState };

export const STATE_LABEL: Record<SectionState, string> = {
  "not-started": "Non commencée",
  "in-progress": "En cours",
  done: "Terminée",
  "needs-correction": "À corriger",
};

export const STATE_ICON: Record<SectionState, ComponentType<{ className?: string }>> = {
  "not-started": Circle,
  "in-progress": CircleDot,
  done: CheckCircle2,
  "needs-correction": AlertTriangle,
};

export const STATE_CLASS: Record<SectionState, string> = {
  "not-started": "text-muted-foreground",
  "in-progress": "text-primary",
  done: "text-primary",
  "needs-correction": "text-destructive",
};

/**
 * Explication accessible affichée sur un onglet verrouillé (voir `isStepUnlocked`) —
 * `undefined` pour Introduction, jamais verrouillée.
 */
export const LOCK_REASON: Partial<Record<StepId, string>> = {
  youtube: "Consulte d'abord l'introduction pour déverrouiller cette étape.",
  contenus: "Termine d'abord YouTube pour déverrouiller cette étape.",
  meta: "Valide d'abord Contenus (Continuer vers Meta) pour déverrouiller cette étape.",
  validation: "Termine d'abord Meta pour déverrouiller cette étape.",
};

/**
 * Calcule l'état d'une section — source unique consommée par la jauge compacte
 * (`ProgressBar`), les onglets (`StepTabs`) et les gardes d'accès direct
 * (`useStepAccessGuard`), pour qu'ils affichent/appliquent toujours exactement le même
 * statut. `completedSteps` (persisté, voir `markCompleted` dans le store) est distinct
 * de `visitedSteps` : une simple consultation ne vaut jamais validation d'une étape aux
 * questions facultatives (Contenus).
 */
export function sectionStateFor(
  id: StepId,
  state: CollectionState,
  attemptedSteps: ReadonlySet<StepId>,
  visitedSteps: ReadonlySet<StepId>,
  completedSteps: ReadonlySet<StepId>,
): SectionState {
  switch (id) {
    case "introduction":
      return introductionSectionState(visitedSteps.has("introduction"));
    case "youtube":
      return youtubeSectionState(state, attemptedSteps.has("youtube"));
    case "contenus":
      return contenusSectionState(visitedSteps.has("contenus"), completedSteps.has("contenus"));
    case "meta":
      return metaSectionState(state, attemptedSteps.has("meta"));
    case "validation":
      return validationSectionState(
        state,
        attemptedSteps.has("validation"),
        visitedSteps.has("validation"),
      );
  }
}

export function allSectionStates(
  state: CollectionState,
  attemptedSteps: ReadonlySet<StepId>,
  visitedSteps: ReadonlySet<StepId>,
  completedSteps: ReadonlySet<StepId>,
): Record<StepId, SectionState> {
  const entries = STEPS.map(
    (step) =>
      [
        step.id,
        sectionStateFor(step.id, state, attemptedSteps, visitedSteps, completedSteps),
      ] as const,
  );
  return Object.fromEntries(entries) as Record<StepId, SectionState>;
}

/**
 * Déverrouillage séquentiel :
 * - le retour vers toute étape déjà atteinte dans les onglets (`currentIndex`, index de
 *   l'étape courante ≥ l'étape testée) est toujours autorisé — c'est le seul
 *   passe-droit qui existe : aucune mémoire générale de « déjà visité un jour » ne
 *   maintient plus une étape déverrouillée pour toujours (voir `useStepAccessGuard`,
 *   qui n'utilise jamais `currentIndex` et réévalue donc la condition réelle à chaque
 *   accès direct) ;
 * - chaque étape a sa propre condition de déblocage, jamais déduite du seul index de
 *   page : Contenus « Terminée » (validation explicite via `completedSteps`, pas la
 *   seule consultation) pour déverrouiller Meta, etc.
 *
 * `currentIndex` est optionnel : les gardes d'accès direct (`useStepAccessGuard`) ne le
 * fournissent jamais (aucune étape « courante » n'a de sens pour évaluer une URL
 * demandée de l'extérieur), seuls `StepTabs` le fournissent.
 */
export function isStepUnlocked(
  id: StepId,
  states: Record<StepId, SectionState>,
  visitedSteps: ReadonlySet<StepId>,
  completedSteps: ReadonlySet<StepId>,
  currentIndex = -1,
): boolean {
  const index = STEPS.findIndex((step) => step.id === id);
  if (index <= currentIndex) return true;

  switch (id) {
    case "youtube":
      return visitedSteps.has("introduction");
    case "contenus":
      return states.youtube === "done";
    case "meta":
      return completedSteps.has("contenus");
    case "validation":
      return states.meta === "done";
    default:
      return true;
  }
}

/** Condition de complétion propre à chaque étape, utilisée par `firstIncompleteStepId`
 *  pour trouver où rediriger — distincte de `isStepUnlocked` (qui répond « puis-je
 *  entrer ici ? ») : ici la question est « cette étape est-elle, elle-même, finie ? ». */
function isStepComplete(
  id: StepId,
  states: Record<StepId, SectionState>,
  visitedSteps: ReadonlySet<StepId>,
  completedSteps: ReadonlySet<StepId>,
): boolean {
  switch (id) {
    case "introduction":
      return visitedSteps.has("introduction");
    case "youtube":
      return states.youtube === "done";
    case "contenus":
      return completedSteps.has("contenus");
    case "meta":
      return states.meta === "done";
    case "validation":
      return states.validation === "done";
  }
}

/**
 * Étape vers laquelle rediriger une tentative de contournement (URL directe, entrée
 * d'historique) vers une étape verrouillée : la première étape, en partant du début de
 * la séquence, qui n'est *elle-même* pas encore terminée — jamais systématiquement
 * Introduction. Comme chaque condition de déblocage ne porte que sur l'étape
 * *immédiatement* précédente, cette étape est nécessairement déverrouillée (son propre
 * prérequis, s'il existe, a déjà été trouvé complet lors du parcours qui précède).
 */
export function firstIncompleteStepId(
  states: Record<StepId, SectionState>,
  visitedSteps: ReadonlySet<StepId>,
  completedSteps: ReadonlySet<StepId>,
): StepId {
  for (const step of STEPS) {
    if (!isStepComplete(step.id, states, visitedSteps, completedSteps)) return step.id;
  }
  return STEPS[STEPS.length - 1]!.id;
}
