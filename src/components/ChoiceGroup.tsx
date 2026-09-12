import type { ReactNode } from "react";
import { CircleDot, ListChecks } from "lucide-react";

import { ChoiceCard } from "@/components/ChoiceCard";
import { cn } from "@/lib/utils";

export type Choice = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  hint?: string;
};

function ChoiceMode({ multi }: { multi: boolean }) {
  const Icon = multi ? ListChecks : CircleDot;

  return (
    <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-bold tracking-wide text-foreground shadow-[0_8px_24px_-16px_var(--color-primary)]">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span>{multi ? "Plusieurs réponses possibles" : "Une seule réponse"}</span>
    </div>
  );
}

export function ChoiceGroup({
  options,
  value,
  onChange,
  columns = 1,
  label,
}: {
  options: Choice[];
  value: string | null;
  onChange: (value: string) => void;
  columns?: 1 | 2;
  label?: string;
}) {
  return (
    <div>
      <ChoiceMode multi={false} />

      <div
        role="radiogroup"
        aria-label={label}
        className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2")}
      >
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            label={option.label}
            description={option.description}
            icon={option.icon}
            hint={option.hint}
            selected={value === option.value}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

export function MultiChoiceGroup({
  options,
  values,
  onToggle,
  columns = 1,
  label,
}: {
  options: Choice[];
  values: string[];
  onToggle: (value: string) => void;
  columns?: 1 | 2;
  label?: string;
}) {
  return (
    <div>
      <ChoiceMode multi />

      <div
        role="group"
        aria-label={label}
        className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2")}
      >
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            multi
            label={option.label}
            description={option.description}
            icon={option.icon}
            hint={option.hint}
            selected={values.includes(option.value)}
            onSelect={() => onToggle(option.value)}
          />
        ))}
      </div>
    </div>
  );
}
