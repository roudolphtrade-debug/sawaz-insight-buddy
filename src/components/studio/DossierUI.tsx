import type { LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";

import { toneClass, type SectionTone } from "@/lib/studio/sections";
import { cn } from "@/lib/utils";

/** Pastille d'icône teintée selon la section (repère de lecture, jamais décisif seul). */
export function SectionIcon({
  icon: Icon,
  tone = "neutre",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: SectionTone | undefined;
  size?: "sm" | "md" | undefined;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("section-icon", toneClass(tone), size === "sm" ? "size-7" : "size-9")}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-[1.125rem]"} />
    </span>
  );
}

/**
 * En-tête commun des cartes Pilot : pastille d'icône, surtitre, titre (niveau 2 pour une
 * section, 3 pour une carte de synthèse), explication courte et zone d'action à droite.
 * Même hauteur minimale partout pour aligner les cartes d'une même ligne.
 */
export function CardHeader({
  id,
  icon,
  tone,
  eyebrow,
  title,
  description,
  aside,
  level = 2,
}: {
  id?: string | undefined;
  icon?: LucideIcon | undefined;
  tone?: SectionTone | undefined;
  eyebrow?: string | undefined;
  title?: string | undefined;
  description?: ReactNode | undefined;
  aside?: ReactNode | undefined;
  level?: 2 | 3 | undefined;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  // Grille pilotée par la largeur de la carte (requête de conteneur) : action à droite
  // dans une carte large, sous le titre, alignée sur lui, dans une carte étroite.
  return (
    <div className="@container">
      <div
        className={cn(
          "grid items-start gap-x-3 gap-y-2",
          !icon
            ? "grid-cols-[minmax(0,1fr)] @2xl:grid-cols-[minmax(0,1fr)_auto]"
            : level === 2
              ? "grid-cols-[auto_minmax(0,1fr)] @2xl:grid-cols-[auto_minmax(0,1fr)_auto]"
              : "grid-cols-[auto_minmax(0,1fr)] @min-[17rem]:grid-cols-[auto_minmax(0,1fr)_auto]",
        )}
      >
        {icon ? <SectionIcon icon={icon} tone={tone} size={level === 2 ? "md" : "sm"} /> : null}
        <div className="min-w-0 self-center">
          {eyebrow ? <p className="text-eyebrow text-sawaz">{eyebrow}</p> : null}
          {title ? (
            <Heading
              id={id}
              className={cn(
                "font-display font-bold text-foreground",
                level === 2 ? "text-lg leading-snug" : "text-base leading-snug",
              )}
            >
              {title}
            </Heading>
          ) : null}
          {description ? (
            <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {aside ? (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              !icon
                ? "@2xl:col-start-2 @2xl:row-start-1 @2xl:self-center"
                : level === 2
                  ? "col-start-2 @2xl:col-start-3 @2xl:row-start-1 @2xl:self-center"
                  : "col-start-2 @min-[17rem]:col-start-3 @min-[17rem]:row-start-1 @min-[17rem]:self-center",
            )}
          >
            {aside}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Indicateur chiffré : libellé, valeur dominante et sous-information, tous centrés.
 * Hauteur identique pour toutes les tuiles (grille `items-stretch`). L'icône porte
 * la teinte de sa famille métier (pastille teintée) ; la valeur reste sombre.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  emphasis = "primary",
  tone,
  className,
}: {
  icon?: LucideIcon | undefined;
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  emphasis?: "primary" | "secondary" | undefined;
  tone?: SectionTone | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      data-kpi
      className={cn(
        "flex h-full min-h-[7.5rem] flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-center",
        emphasis === "primary"
          ? "border-sawaz/20 bg-sawaz/[0.035]"
          : "border-border bg-surface-raised/60",
        className,
      )}
    >
      {Icon ? (
        <span className={cn("section-icon size-7", toneClass(tone ?? "neutre"))}>
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
      ) : null}
      <p className="flex items-center justify-center gap-1.5 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "font-display leading-tight font-extrabold text-foreground tabular-nums",
          emphasis === "primary" ? "text-[1.75rem]" : "text-2xl",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * Carte de synthèse de la Vue d'ensemble : résume une section sans dupliquer de donnée,
 * avec une action qui ouvre l'onglet correspondant.
 */
export function SummaryCard({
  icon,
  tone,
  title,
  aside,
  action,
  className,
  children,
}: {
  icon: LucideIcon;
  tone: SectionTone;
  title: string;
  aside?: ReactNode | undefined;
  action?: ReactNode | undefined;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      data-summary-card
      className={cn(
        "surface-panel section-accent flex h-full flex-col p-4 sm:p-5",
        toneClass(tone),
        className,
      )}
    >
      <CardHeader id={id} icon={icon} tone={tone} title={title} aside={aside} level={3} />
      <div className="mt-3 flex-1 text-sm text-body">{children}</div>
      {action ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {action}
        </div>
      ) : null}
    </section>
  );
}
