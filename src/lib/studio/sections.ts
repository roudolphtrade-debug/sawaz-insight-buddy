import {
  BarChart3,
  FileText,
  FolderOpen,
  LayoutGrid,
  Lightbulb,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react";

import type { DossierTabId } from "@/lib/studio/dossier-tabs";
import { formatParisDate, formatParisDateTime } from "@/lib/studio/qualification";

/**
 * Repères visuels des sections du dossier : une icône discrète et une teinte d'accent
 * (classe `tone-*`, définie sous `.pilot` dans styles.css). Les teintes ne servent qu'aux
 * pastilles d'icône : le bleu Sawaz reste la couleur des actions et des états actifs.
 */
export const SECTION_ICON: Record<DossierTabId, LucideIcon> = {
  "vue-ensemble": LayoutGrid,
  missions: FolderOpen,
  reponses: MessageSquareText,
  indicateurs: BarChart3,
  analyse: Lightbulb,
  restitution: FileText,
};

export type SectionTone = DossierTabId | "neutre";

export const toneClass = (tone: SectionTone) => `tone-${tone}`;

/** Action principale (bleu Sawaz) et secondaire : même hauteur, même rayon partout. */
export const PRIMARY_ACTION =
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-sawaz px-4 text-sm font-semibold text-sawaz-foreground transition hover:bg-sawaz/90 disabled:cursor-not-allowed disabled:opacity-50";
export const SECONDARY_ACTION =
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-surface px-3.5 text-sm font-semibold text-sawaz transition hover:border-sawaz/40 hover:bg-sawaz/5 disabled:cursor-not-allowed disabled:opacity-50";

/** Sous-carte posée dans une carte : même rayon et même bordure partout. */
export const SUB_CARD = "rounded-lg border border-border bg-surface-raised/60";

/** Champ de formulaire Pilot. */
export const FIELD =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/80 focus:border-sawaz focus:ring-2 focus:ring-sawaz/15";

/** `["a", null, "b"]` → `a · b` : séparateur unique des métadonnées. */
export function joinMeta(parts: readonly (string | null | undefined | false)[]): string {
  return parts.filter(Boolean).join(" · ");
}

/** Pluriel français simple : `plural(2, "réponse")` → `2 réponses`. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  active: "En cours",
  closed: "Clôturée",
  archived: "Archivée",
};

export const COLLECTION_STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouverte",
  partially_submitted: "Partiellement reçue",
  submitted: "Reçue",
  closed: "Clôturée",
};

/** « Mission en cours », « Collecte ouverte » : statut traduit, jamais la valeur brute. */
export const projectStatusText = (status: string) =>
  `Mission ${(PROJECT_STATUS_LABEL[status] ?? "en cours").toLowerCase()}`;
export const collectionStatusText = (status: string) =>
  `Collecte ${(COLLECTION_STATUS_LABEL[status] ?? "en cours").toLowerCase()}`;

/**
 * Libellés des collectes d'une mission. Une collecte n'a pas de nom en base : le libellé
 * est dérivé de sa date d'ouverture, à défaut de sa date de création (« Collecte ·
 * 7 sept. 2026 »), avec l'heure puis l'identifiant court si deux libellés coïncident.
 */
export function collectionLabels(
  collections: readonly { id: string; openedAt: string | null; createdAt: string }[],
) {
  const base = collections.map((c) => {
    const date = c.openedAt ?? c.createdAt;
    return {
      id: c.id,
      date,
      detail: `${c.openedAt ? "ouverte le" : "créée le"} ${formatParisDateTime(date)}`,
    };
  });
  const dayCount = new Map<string, number>();
  for (const b of base) {
    const day = formatParisDate(b.date);
    dayCount.set(day, (dayCount.get(day) ?? 0) + 1);
  }
  const titles = base.map((b) => {
    const day = formatParisDate(b.date);
    return (dayCount.get(day) ?? 0) > 1 ? formatParisDateTime(b.date) : day;
  });
  return new Map(
    base.map((b, i) => {
      const unique = titles.filter((t) => t === titles[i]).length === 1;
      const title = `Collecte · ${titles[i]}${unique ? "" : ` · ${b.id.slice(0, 8)}`}`;
      return [b.id, { title, detail: b.detail }] as const;
    }),
  );
}
