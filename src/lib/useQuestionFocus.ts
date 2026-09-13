import { useCallback, useEffect, useRef, useState } from "react";

const HIGHLIGHT_MS = 1600;
/** Laisse le smooth scroll s'amorcer avant de déplacer le focus, pour éviter un saut
 *  de vue brutal indépendant de l'animation de défilement. */
const FOCUS_DELAY_MS = 300;
/** Après une navigation cross-route, la question ciblée peut ne pas encore être
 *  montée (état pas encore hydraté, section conditionnelle pas encore rendue) : on
 *  retente à intervalle court jusqu'à ce délai plutôt que d'échouer silencieusement. */
const MOUNT_WAIT_MS = 2000;
const MOUNT_POLL_MS = 50;

/** Contrôles interactifs qu'un utilisateur peut réellement renseigner : le premier
 *  trouvé dans la question reçoit le focus. La `<section>` de `QuestionCard` elle-même
 *  (`tabIndex={-1}`) ne sert de repli que si aucun de ces éléments n'existe. */
const FOCUSABLE_SELECTOR = [
  "input:not([type='hidden']):not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "button:not([disabled])",
  "[role='radio']:not([aria-disabled='true'])",
  "[href]",
].join(", ");

function firstFocusableControl(section: HTMLElement): HTMLElement | null {
  // Restreint la recherche à la zone de réponse (`data-question-body`, posée par
  // `QuestionCard`) quand elle existe, pour ne jamais focaliser le bouton d'aide de
  // l'en-tête à la place du contrôle réel de la question.
  const body = section.querySelector<HTMLElement>("[data-question-body]");
  return (body ?? section).querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
}

/**
 * Scroll + focus + mise en évidence brève d'une question identifiée par son `id` DOM
 * (voir `QuestionCard`'s prop `id`, posé sur la `<section>` elle-même). Partagé entre
 * `collecte.youtube.tsx` et `collecte.meta.tsx` pour que le résumé d'erreurs et le clic
 * sur « Continuer » en bloqué se comportent de façon identique.
 */
export function useQuestionFocus() {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      if (focusTimer.current) clearTimeout(focusTimer.current);
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const applyFocus = useCallback((section: HTMLElement, id: string) => {
    section.scrollIntoView({ behavior: "smooth", block: "center" });

    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => {
      focusTimer.current = null;
      const control = firstFocusableControl(section);
      (control ?? section).focus({ preventScroll: true });
    }, FOCUS_DELAY_MS);

    setHighlightedId(id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => {
      highlightTimer.current = null;
      setHighlightedId((current) => (current === id ? null : current));
    }, HIGHLIGHT_MS);
  }, []);

  const focusQuestion = useCallback(
    (id: string) => {
      if (pollTimer.current) {
        clearTimeout(pollTimer.current);
        pollTimer.current = null;
      }

      const deadline = Date.now() + MOUNT_WAIT_MS;
      const attempt = () => {
        pollTimer.current = null;
        const section = document.getElementById(id);
        if (section) {
          applyFocus(section, id);
          return;
        }
        if (Date.now() >= deadline) return;
        pollTimer.current = setTimeout(attempt, MOUNT_POLL_MS);
      };
      attempt();
    },
    [applyFocus],
  );

  return { highlightedId, focusQuestion };
}
