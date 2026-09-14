import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import {
  allSectionStates,
  isStepUnlocked,
  LOCK_REASON,
  STATE_CLASS,
  STATE_ICON,
  STATE_LABEL,
} from "@/lib/collection/sectionState";
import { useCollection } from "@/lib/collection/store";
import { STEPS, type StepId } from "@/lib/steps";
import { cn } from "@/lib/utils";

/**
 * Onglets de navigation entre les étapes de la collecte. Séparés de la jauge compacte
 * (`ProgressBar`, voir `StepLayout`) : ils défilent avec le reste du contenu plutôt que
 * de rester fixes.
 *
 * Déverrouillage séquentiel : le retour vers toute étape déjà atteinte est toujours
 * autorisé ; au-delà, chaque étape suivante ne se débloque qu'une fois sa condition
 * remplie (voir `isStepUnlocked`). Une étape verrouillée reste visible — icône, état et
 * explication accessible — mais n'est pas un lien : elle ne navigue pas.
 */
export function StepTabs({ current }: { current: StepId }) {
  const { state, attemptedSteps, visitedSteps, completedSteps } = useCollection();
  const states = allSectionStates(state, attemptedSteps, visitedSteps, completedSteps);
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Navigation entre les étapes de la collecte" className="w-full">
      {/* Grille à deux colonnes sur mobile (le dernier onglet, impair, occupe la
          largeur restante sur sa propre ligne) : rien n'est jamais coupé ni requiert de
          défilement pour être découvert. Une seule ligne de cinq colonnes est rétablie
          à partir de la tablette (`md:`). */}
      <ol className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {STEPS.map((step, i) => {
          const active = step.id === current;
          const isLast = i === STEPS.length - 1;
          const sectionState = states[step.id];
          const Icon = STATE_ICON[sectionState];
          const unlocked =
            active || isStepUnlocked(step.id, states, visitedSteps, completedSteps, currentIndex);
          const locked = !unlocked;
          const lockReason = LOCK_REASON[step.id];
          const ariaLabel = locked
            ? `${step.label} — verrouillé. ${lockReason ?? ""}`.trim()
            : `${step.label} — ${STATE_LABEL[sectionState]}`;

          const itemClass = cn(
            "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
            active
              ? "border-primary/65 bg-primary/[0.10] text-primary shadow-sm"
              : locked
                ? "cursor-not-allowed border-border/50 bg-transparent text-muted-foreground/70"
                : "border-border/70 bg-transparent text-foreground hover:border-border-strong hover:bg-surface-raised",
          );

          const content = (
            <span className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="flex items-center gap-1 truncate">
                {locked ? (
                  <Lock className="size-3 shrink-0" aria-hidden="true" />
                ) : null}
                <span className="truncate">{step.shortLabel}</span>
              </span>
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
            <li key={step.id} className={cn("min-w-0", isLast && "col-span-2 md:col-span-1")}>
              {active ? (
                <span aria-current="step" aria-label={ariaLabel} className={itemClass}>
                  {content}
                </span>
              ) : locked ? (
                <span aria-disabled="true" aria-label={ariaLabel} className={itemClass}>
                  {content}
                </span>
              ) : (
                // La sauvegarde bornée existante (`useCollectionNavGuard`) intercepte
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
