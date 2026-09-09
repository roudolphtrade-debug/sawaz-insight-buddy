import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_LABEL, type ItemStatus, type SectionSummary } from "@/lib/collection/status";

const tone: Record<ItemStatus, "gold" | "sawaz" | "neutral" | "success"> = {
  transmis: "gold",
  partiel: "sawaz",
  indisponible: "neutral",
  facultatif: "neutral",
  attente: "neutral",
};

export function StatusList({ section }: { section: SectionSummary }) {
  return (
    <div className="space-y-3">
      <p className="text-eyebrow text-primary">{section.title}</p>
      <ul className="space-y-2">
        {section.items.map((item) => (
          <li
            key={item.label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{item.label}</span>
              {item.detail ? (
                <span className="block text-xs text-muted-foreground">{item.detail}</span>
              ) : null}
            </span>
            <StatusBadge tone={tone[item.status]}>{STATUS_LABEL[item.status]}</StatusBadge>
          </li>
        ))}
      </ul>
    </div>
  );
}
