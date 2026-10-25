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
