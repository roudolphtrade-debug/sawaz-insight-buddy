import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";

import { DossierView } from "@/components/studio/DossierView";
import { Panel, StudioShell } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { roleLabel } from "@/lib/studio/qualification";
import { getStudioDossier } from "@/lib/studio/studio.functions";

export const Route = createFileRoute("/_authenticated/studio/$clientId/")({
  head: () => ({
    meta: [
      { title: "Dossier client · Sawaz Pilot" },
      {
        name: "description",
        content:
          "Dossier client Sawaz : collecte, réponses de référence, documents analysables, indicateurs, analyses internes et restitution.",
      },
      { property: "og:title", content: "Dossier client · Sawaz Pilot" },
      {
        property: "og:description",
        content: "Corpus actif, indicateurs vérifiés, analyses Sawaz et restitution client.",
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

  return (
    <StudioShell
      title={dossier.client.name}
      subtitle={dossier.client.sector ?? "Secteur non renseigné"}
      meta={
        <StatusBadge tone="sawaz" icon={<ShieldCheck />}>
          <span className="sr-only">Rôle : </span>
          {roleLabel(dossier.role)}
        </StatusBadge>
      }
      actions={
        <Link to="/studio" className="text-sm font-semibold text-sawaz hover:underline">
          Tous les clients
        </Link>
      }
    >
      <DossierView dossier={dossier} clientSlug={clientId} />
    </StudioShell>
  );
}
