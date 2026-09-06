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

export const Route = createFileRoute("/_authenticated/studio/$clientId")({
  head: () => ({
    meta: [
      { title: "Dossier client ÔÇö Results Studio Sawaz" },
      {
        name: "description",
        content:
          "Fiche de collecte r├®elle : r├®pondant, r├®ponses, fichiers re├ºus, m├®triques ├á v├®rifier et analyses internes.",
      },
      { property: "og:title", content: "Dossier client ÔÇö Results Studio Sawaz" },
      {
        property: "og:description",
        content: "Collecte r├®elle, m├®triques v├®rifi├®es et analyses internes Sawaz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioClient,
});

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
        <Panel>Chargement du dossierÔÇª</Panel>
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

  return (
    <StudioShell
      title={dossier.client.name}
      subtitle={`${dossier.client.sector ?? "ÔÇö"} ┬À r├┤le Sawaz : ${dossier.role ?? "aucun"}`}
      actions={
        <Link to="/studio" className="text-sm text-sawaz hover:underline">
          Tous les clients
        </Link>
      }
    >
      <Panel eyebrow="P├®rim├¿tre" title="Projets et collectes">
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
                  <StatusBadge tone="neutral">{p.status}</StatusBadge>
                  {cols.map((c) => (
                    <StatusBadge key={c.id} tone="sawaz">
                      Collecte {c.status}
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

      {dossier.submissions.map((s) => (
        <SubmissionCard key={s.id} submission={s} />
      ))}
      {dossier.submissions.length === 0 ? (
        <Panel title="Aucune collecte re├ºue">
          <p className="text-sm text-muted-foreground">
            Les fiches appara├«tront d├¿s qu'un r├®pondant aura commenc├® sa collecte.
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
