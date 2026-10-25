import { CalendarDays, FolderOpen, Inbox } from "lucide-react";

import { SectionIcon } from "@/components/studio/DossierUI";
import { EmptyState } from "@/components/studio/EmptyState";
import { Panel } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatParisDateTime, isInActiveCorpus } from "@/lib/studio/qualification";
import {
  COLLECTION_STATUS_LABEL,
  collectionStatusText,
  joinMeta,
  plural,
  projectStatusText,
  SUB_CARD,
} from "@/lib/studio/sections";
import type { StudioDossier } from "@/lib/studio/studio.functions";

/** Date la plus récente d'une liste ISO, `null` si vide. */
const latest = (dates: readonly (string | null)[]) =>
  dates
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1) ?? null;

/**
 * Onglet Missions : une carte par mission (nom, période, statut), ses collectes en
 * sous-lignes. Seuls les champs réellement présents sont affichés : aucune donnée
 * inventée (une collecte n'a pas de nom propre, sa date d'ouverture peut manquer).
 */
export function MissionsPanel({
  projects,
  collections,
  submissions,
}: Pick<StudioDossier, "projects" | "collections" | "submissions">) {
  return (
    <Panel
      icon={FolderOpen}
      tone="missions"
      eyebrow="Missions"
      title="Missions et collectes"
      description="Chaque mission regroupe les collectes envoyées au client et les réponses reçues."
      aside={<StatusBadge tone="neutral">{plural(projects.length, "mission")}</StatusBadge>}
    >
      {projects.length === 0 ? (
        <EmptyState
          title="Aucune mission pour ce client"
          missing="une mission et sa collecte."
          why="les réponses du client arrivent toujours par une collecte rattachée à une mission."
          next="créer une mission et sa collecte pour recevoir des réponses."
        />
      ) : (
        <ul className="space-y-4">
          {projects.map((project) => {
            const cols = collections.filter((c) => c.projectId === project.id);
            const projectSubmissions = submissions.filter((s) =>
              cols.some((c) => c.id === s.collectionId),
            );
            const lastActivity = latest(
              projectSubmissions.map((s) => s.submittedAt ?? s.updatedAt),
            );
            const statusCounts = Object.entries(
              cols.reduce<Record<string, number>>((acc, c) => {
                acc[c.status] = (acc[c.status] ?? 0) + 1;
                return acc;
              }, {}),
            ).map(
              ([status, n]) =>
                `${n} ${(COLLECTION_STATUS_LABEL[status] ?? "en cours").toLowerCase()}${n > 1 ? "s" : ""}`,
            );

            return (
              <li key={project.id} data-mission className={`${SUB_CARD} bg-surface`}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <SectionIcon icon={FolderOpen} tone="missions" size="sm" />
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold text-foreground">
                        {project.name}
                      </h3>
                      {project.periodLabel ? (
                        <p className="text-sm text-muted-foreground">{project.periodLabel}</p>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge tone="neutral">{projectStatusText(project.status)}</StatusBadge>
                </div>

                <dl className="grid gap-px border-b border-border bg-border sm:grid-cols-3">
                  <Fact label="Collectes" value={String(cols.length)} />
                  <Fact
                    label="État des collectes"
                    value={statusCounts.length > 0 ? joinMeta(statusCounts) : "Aucune collecte"}
                  />
                  {lastActivity ? (
                    <Fact label="Dernière activité" value={formatParisDateTime(lastActivity)} />
                  ) : (
                    <Fact label="Réponses reçues" value={String(projectSubmissions.length)} />
                  )}
                </dl>

                {cols.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    Aucune collecte rattachée à cette mission.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {cols.map((c) => {
                      const received = submissions.filter((s) => s.collectionId === c.id);
                      const references = received.filter(isInActiveCorpus).length;
                      return (
                        <li
                          key={c.id}
                          data-collection
                          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-2.5 text-sm">
                            <Inbox
                              className="size-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="font-semibold text-foreground">Collecte</span>
                            {c.openedAt ? (
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <CalendarDays className="size-3.5" aria-hidden="true" />
                                ouverte le {formatParisDateTime(c.openedAt)}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {joinMeta([
                                plural(received.length, "réponse"),
                                references > 0 ? plural(references, "référence") : null,
                              ])}
                            </span>
                            <StatusBadge tone="sawaz">{collectionStatusText(c.status)}</StatusBadge>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-2.5">
      <dt className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
