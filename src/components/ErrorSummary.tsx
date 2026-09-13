import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export type ErrorSummaryItem = {
  id: string;
  message: string;
  /** Rendu personnalisé du déclencheur (ex. `<Link>` vers une autre étape). Par
   *  défaut, un bouton qui appelle `onSelect(id)` sur la page courante. */
  render?: (children: ReactNode) => ReactNode;
};

/**
 * Résumé accessible des réponses obligatoires manquantes : compte exact, liste
 * complète, chaque entrée cliquable pour atteindre la question concernée. `role="alert"`
 * fait office de zone d'annonce : les lecteurs d'écran l'annoncent dès son apparition.
 */
export function ErrorSummary({
  items,
  onSelect,
}: {
  items: ErrorSummaryItem[];
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 sm:p-5"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-display text-sm font-extrabold text-destructive sm:text-base">
            {items.length === 1
              ? "1 réponse obligatoire manque encore"
              : `${items.length} réponses obligatoires manquent encore`}
          </p>
          <p className="mt-0.5 text-xs text-destructive/85">
            Corrige-les une par une : chaque ligne t'amène directement à la question.
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {items.map((item) => {
          const trigger = (
            <span className="inline-flex w-full items-start gap-2 rounded-lg border border-destructive/35 bg-background px-3 py-2 text-left text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50">
              {item.message}
            </span>
          );

          return (
            <li key={item.id}>
              {item.render ? (
                item.render(trigger)
              ) : (
                <button type="button" className="block w-full" onClick={() => onSelect(item.id)}>
                  {trigger}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
