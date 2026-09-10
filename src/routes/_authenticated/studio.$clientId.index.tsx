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
      { title: "Dossier client — Results Studio Sawaz" },
      {
        name: "description",
        content:
          "Dossier client Sawaz : collecte, réponses, fichiers reçus, métriques à vérifier, analyses internes et restitution.",
      },
      { property: "og:title", content: "Dossier client — Results Studio Sawaz" },
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
  active: "Actif",
  closed: "Clôturé",
  archived: "Archivé",
};

const collectionStatusLabel: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouverte",
  partially_submitted: "Partiellement soumise",
  submitted: "Soumise",
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
      <Panel eyebrow="Vue d’ensemble" title="État du dossier">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Projets", dossier.projects.length],
            ["Collectes", dossier.collections.length],
            ["Soumissions", `${submittedCount}/${dossier.submissions.length}`],
            ["Fichiers", fileCount],
            ["Métriques", dossier.metrics.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-border bg-surface-raised p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel eyebrow="1. Périmètre" title="Projet et collecte">
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
            <li className="text-muted-foreground">Aucun projet pour ce client.</li>
          ) : null}
        </ul>
      </Panel>

      <div className="pt-2">
        <p className="text-eyebrow text-sawaz">2. Données reçues</p>
        <h2 className="mt-1 font-display text-xl font-extrabold text-foreground">
          Soumissions et pièces transmises
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque soumission conserve ses réponses, indisponibilités et fichiers d’origine.
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

      <MetricsReviewPanel metrics={dossier.metrics} canWrite={canWrite} />

      <AnalysesPanel
        clientId={dossier.client.id}
        analyses={dossier.analyses}
        canWrite={canWrite}
      />

      <ReviewsPanel
        clientSlug={clientId}
        clientId={dossier.client.id}
        projects={dossier.projects}
        collections={dossier.collections}
        canWrite={canWrite}
      />
    </StudioShell>
  );
}
