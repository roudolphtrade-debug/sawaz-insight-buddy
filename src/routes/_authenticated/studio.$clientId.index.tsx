import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AnalysesPanel } from "@/components/studio/AnalysesPanel";
import { ReviewsPanel } from "@/components/studio/ReviewsPanel";
import { MetricsReviewPanel } from "@/components/studio/MetricsReviewPanel";
import { SubmissionCard } from "@/components/studio/SubmissionCard";
import { Panel, StudioShell } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { getStudioDossier } from "@/lib/studio/studio.functions";

export const Route = createFileRoute("/_authenticated/studio/$clientId/")({
  head: () => ({
    meta: [
      { title: "Dossier client — Sawaz Pilot" },
      {
        name: "description",
        content:
          "Dossier client Sawaz : collecte, réponses, fichiers reçus, métriques à vérifier, analyses internes et restitution.",
      },
      { property: "og:title", content: "Dossier client — Sawaz Pilot" },
      {
        property: "og:description",
        content: "Collecte réelle, métriques vérifiées, analyses Sawaz et restitution client.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioClient,
});

const projectStatusLabel: Record<string, string> = {
  active: "En cours",
  closed: "Clôturé",
  archived: "Archivé",
};

const collectionStatusLabel: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouverte",
  partially_submitted: "Partiellement reçue",
  submitted: "Reçue",
  closed: "Clôturée",
};

function StudioClient() {
  const { clientId } = Route.useParams();
  const fetchDossier = useServerFn(getStudioDossier);

  const { data, isLoading } = useQuery({
    queryKey: ["studio-dossier", clientId],
    queryFn: () => fetchDossier({ data: { clientSlug: clientId } }),
  });

  if (isLoading) {
    return (
      <StudioShell title="Dossier client">
        <Panel>Chargement du dossier…</Panel>
      </StudioShell>
    );
  }

  if (!data?.ok) {
    return (
      <StudioShell title="Dossier client">
        <Panel>
          <p className="text-sm text-destructive">{data?.error ?? "Dossier indisponible"}</p>
          <Link to="/studio" className="mt-3 inline-block text-sm text-sawaz">
            Retour aux clients
          </Link>
        </Panel>
      </StudioShell>
    );
  }

  const dossier = data.data;
  const canWrite = dossier.role === "owner" || dossier.role === "analyst";
  const submittedCount = dossier.submissions.filter((s) => s.status === "submitted").length;
  const fileCount = dossier.submissions.reduce((total, s) => total + s.files.length, 0);

  return (
    <StudioShell
      title={dossier.client.name}
      subtitle={`${dossier.client.sector ?? "Secteur non renseigné"} · rôle Sawaz : ${dossier.role ?? "aucun"}`}
      actions={
        <Link to="/studio" className="text-sm text-sawaz hover:underline">
          Tous les clients
        </Link>
      }
    >
      <MissionNav />

      <div id="vue-ensemble" className="scroll-mt-6">
      <Panel eyebrow="Vue d’ensemble" title="État du dossier">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Missions", dossier.projects.length],
            ["Collectes", dossier.collections.length],
            ["Réponses reçues", `${submittedCount}/${dossier.submissions.length}`],
            ["Documents", fileCount],
            ["Indicateurs", dossier.metrics.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border border-border bg-surface-raised p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </Panel>

      </div>

      <div id="collectes" className="scroll-mt-6">
      <Panel eyebrow="1. Missions" title="Missions et collectes">
        <ul className="space-y-2 text-sm">
          {dossier.projects.map((p) => {
            const cols = dossier.collections.filter((c) => c.projectId === p.id);
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-raised p-3"
              >
                <span className="text-foreground">
                  {p.name}
                  {p.periodLabel ? (
                    <span className="ml-2 text-xs text-muted-foreground">{p.periodLabel}</span>
                  ) : null}
                </span>
                <span className="flex flex-wrap gap-2">
                  <StatusBadge tone="neutral">
                    {projectStatusLabel[p.status] ?? p.status}
                  </StatusBadge>
                  {cols.map((c) => (
                    <StatusBadge key={c.id} tone="sawaz">
                      Collecte {collectionStatusLabel[c.status] ?? c.status}
                    </StatusBadge>
                  ))}
                </span>
              </li>
            );
          })}
          {dossier.projects.length === 0 ? (
            <li className="text-muted-foreground">Aucune mission pour ce client.</li>
          ) : null}
        </ul>
      </Panel>

      </div>

      <div id="reponses" className="scroll-mt-6 pt-2">
        <p className="text-eyebrow text-muted-foreground">2. Réponses · déclaré par les répondants</p>
        <h2 className="mt-1 font-display text-xl font-extrabold text-foreground">
          Réponses et documents transmis
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque réponse conserve ses réponses, indisponibilités et fichiers d’origine.
        </p>
      </div>

      {dossier.submissions.map((s) => (
        <SubmissionCard key={s.id} submission={s} />
      ))}

      {dossier.submissions.length === 0 ? (
        <Panel title="Aucune collecte reçue">
          <p className="text-sm text-muted-foreground">
            Les fiches apparaîtront dès qu’un répondant aura commencé sa collecte.
          </p>
        </Panel>
      ) : null}

      <div id="indicateurs" className="scroll-mt-6">
      <MetricsReviewPanel metrics={dossier.metrics} canWrite={canWrite} />
      </div>

      <div id="analyse" className="scroll-mt-6">
      <AnalysesPanel
        clientId={dossier.client.id}
        analyses={dossier.analyses}
        canWrite={canWrite}
      />
      </div>

      <div id="restitution" className="scroll-mt-6">
      <ReviewsPanel
        clientSlug={clientId}
        clientId={dossier.client.id}
        projects={dossier.projects}
        collections={dossier.collections}
        canWrite={canWrite}
      />
      </div>
    </StudioShell>
  );
}

const MISSION_SECTIONS = [
  ["vue-ensemble", "Vue d’ensemble"],
  ["collectes", "Collectes"],
  ["reponses", "Réponses"],
  ["indicateurs", "Indicateurs"],
  ["analyse", "Analyse"],
  ["restitution", "Restitution"],
] as const;

/** Sous-navigation de mission : ancres vers les sections existantes du dossier. */
function MissionNav() {
  return (
    <nav
      aria-label="Sections de la mission"
      className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 py-2 backdrop-blur"
    >
      {MISSION_SECTIONS.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          className="rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition hover:bg-surface hover:text-foreground"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
