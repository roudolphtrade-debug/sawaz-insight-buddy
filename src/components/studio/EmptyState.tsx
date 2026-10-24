import { CircleDashed } from "lucide-react";

/**
 * État vide explicite de Sawaz Pilot : ce qui manque, pourquoi, et l'action à mener
 * ensuite. Jamais un simple « aucune donnée ».
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
  return (
    <div className="flex gap-3 rounded-lg border border-dashed border-border bg-surface-raised/60 p-3">
      <CircleDashed className="mt-0.5 size-4 shrink-0 text-sawaz" aria-hidden="true" />
      <div className="min-w-0 space-y-1 text-sm">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Ce qui manque : </span>
          {missing}
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Pourquoi : </span>
          {why}
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Prochaine étape : </span>
          {next}
        </p>
      </div>
    </div>
  );
}
