import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone =
  | "gold"
  | "sawaz"
  | "neutral"
  | "success"
  | "warn"
  | "indigo"
  | "cyan"
  | "slate"
  | "excluded";

const toneClass: Record<Tone, string> = {
  gold: "border-primary/40 bg-primary/10 text-primary",
  sawaz: "border-sawaz/40 bg-sawaz/10 text-sawaz",
  neutral: "border-border-strong bg-surface-raised text-muted-foreground",
  // Validé : vert de statut (réservé aux statuts, jamais décoratif).
  success: "border-good/35 bg-good/10 text-[color-mix(in_srgb,var(--color-good)_80%,black)]",
  // Ambre discret, texte assombri pour rester lisible (contraste AA) sur fond clair.
  warn: "border-warn/35 bg-warn/10 text-[color-mix(in_srgb,var(--color-warn)_75%,black)]",
  // Mission en cours : indigo / violet bleuté.
  indigo: "border-[#5b5fc7]/35 bg-[#5b5fc7]/10 text-[#4348a8]",
  // Collecte ouverte : cyan maîtrisé.
  cyan: "border-[#0891b2]/35 bg-[#0891b2]/10 text-[#0b6e88]",
  // Attribution Sawaz, brouillon : gris bleuté.
  slate: "border-[#64748b]/35 bg-[#64748b]/10 text-[#475569]",
  // Exclu : gris foncé.
  excluded: "border-[#3f4a57]/40 bg-[#3f4a57]/10 text-[#3f4a57]",
};

export function StatusBadge({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "status-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {icon ? <span className="grid place-items-center [&_svg]:size-3">{icon}</span> : null}
      {children}
    </span>
  );
}
