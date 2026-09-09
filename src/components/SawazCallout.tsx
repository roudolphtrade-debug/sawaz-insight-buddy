import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function SawazCallout({
  title = "Note Sawaz",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside className="flex gap-3 rounded-xl border border-sawaz/25 bg-sawaz/[0.06] p-4">
      <span
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-sawaz/40 bg-sawaz/10 text-sawaz"
        aria-hidden="true"
      >
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-eyebrow text-sawaz">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-body">{children}</p>
      </div>
    </aside>
  );
}
