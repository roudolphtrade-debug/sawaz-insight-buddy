import { ChevronRight, Compass } from "lucide-react";

export function PathHint({
  steps,
  title = "Chemin d'accès",
}: {
  steps: string[];
  title?: string | undefined;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-eyebrow flex items-center gap-2 text-muted-foreground">
        <Compass className="size-3.5" aria-hidden="true" />
        {title}
      </p>
      <ol className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-1.5">
            {i > 0 ? (
              <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
            ) : null}
            <span className="text-sm font-medium text-foreground">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ThreeSeconds({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm leading-relaxed text-body">
      <span className="text-eyebrow mr-2 text-primary">En 3 secondes</span>
      {children}
    </p>
  );
}

export function WhyNote({ children }: { children: string }) {
  return (
    <p className="text-sm leading-relaxed text-sawaz">
      <span className="font-semibold">Pourquoi nous regardons cette donnée : </span>
      {children}
    </p>
  );
}
