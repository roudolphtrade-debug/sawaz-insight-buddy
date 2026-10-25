import { Info } from "lucide-react";

/**
 * État vide explicite de Sawaz Pilot : ce qui manque, pourquoi, et l'action à mener
 * ensuite, en trois lignes structurées. Jamais un simple « aucune donnée ».
 */
export function EmptyState({
  title,
  missing,
  why,
  next,
}: {
  title: string;
  missing: string;
  why: string;
  next: string;
}) {
  const rows = [
    ["Ce qui manque : ", missing],
    ["Pourquoi : ", why],
    ["Prochaine étape : ", next],
  ] as const;

  return (
    <div data-empty-state className="rounded-lg border border-border bg-surface-raised/60">
      <p className="flex items-center gap-2 border-b border-border px-4 py-3 font-display text-sm font-bold text-foreground">
        <Info className="size-4 shrink-0 text-sawaz" aria-hidden="true" />
        {title}
      </p>
      <dl className="divide-y divide-border text-sm">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-x-4 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[10.5rem_minmax(0,1fr)]"
          >
            <dt className="font-semibold text-foreground">{label}</dt>
            <dd className="max-w-3xl text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
