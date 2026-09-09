export function MetricCard({
  term,
  meaning,
  why,
  where,
}: {
  term: string;
  meaning: string;
  why?: string | undefined;
  where?: string[] | undefined;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface-raised p-4">
      <h3 className="font-display text-sm font-bold text-foreground">{term}</h3>
      <p className="mt-2 text-sm leading-relaxed text-body">{meaning}</p>
      {where ? (
        <p className="mt-2 text-xs leading-relaxed text-body">
          <span className="font-semibold text-foreground">Où : </span>
          {where.join(" → ")}
        </p>
      ) : null}
      {why ? (
        <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-sawaz">
          <span className="font-semibold">Pourquoi : </span>
          {why}
        </p>
      ) : null}
    </article>
  );
}
