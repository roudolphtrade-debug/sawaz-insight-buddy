import type { ReactNode } from "react";

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
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span
        className={cn(
          "size-3 shrink-0 border border-border-strong",
          multi ? "rounded-[3px]" : "rounded-full",
        )}
        aria-hidden="true"
      />
      <span>
        {multi ? "Plusieurs réponses possibles" : "Une seule réponse"}
      </span>
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