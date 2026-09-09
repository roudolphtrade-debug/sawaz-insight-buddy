import { Check } from "lucide-react";

/** Micro-confirmation discrète après une action (fichier ajouté, option cochée). */
export function MicroConfirm({ children }: { children: string }) {
  return (
    <p
      role="status"
      className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success"
    >
      <Check className="size-3.5" aria-hidden="true" />
      {children}
    </p>
  );
}
