import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";

import { Panel, StudioShell } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { listStudioClients, studioBootstrap } from "@/lib/studio/studio.functions";

export const Route = createFileRoute("/_authenticated/studio/")({
  head: () => ({
    meta: [
      { title: "Results Studio — Espace interne Sawaz" },
      {
        name: "description",
        content:
          "Espace interne Sawaz : suivi multi-client des collectes réelles, fichiers reçus, métriques et analyses.",
      },
      { property: "og:title", content: "Results Studio — Espace interne Sawaz" },
      {
        property: "og:description",
        content: "Suivi multi-client des collectes réelles et des analyses Sawaz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioIndex,
});

function StudioIndex() {
  const bootstrap = useServerFn(studioBootstrap);
  const list = useServerFn(listStudioClients);

  useEffect(() => {
    void bootstrap({});
  }, [bootstrap]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["studio-clients"],
    queryFn: () => list({}),
  });

  useEffect(() => {
    if (data?.ok && data.data.clients.length === 0) {
      const timer = setTimeout(() => void refetch(), 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [data, refetch]);

  return (
    <StudioShell
      title="Dossiers clients"
      subtitle="Données réelles issues des collectes. L'interface reste identique quel que soit le client."
    >
      {isLoading ? <Panel>Chargement des dossiersÔÇª</Panel> : null}

      {data && !data.ok ? (
        <Panel>
          <p className="text-sm text-destructive">{data.error}</p>
        </Panel>
      ) : null}

      {data?.ok && data.data.clients.length === 0 ? (
        <Panel title="Aucun client accessible">
          <p className="text-sm text-muted-foreground">
            Ton compte n'a pas encore de client rattaché, ou aucun client n'existe. Un owner Sawaz
            doit t'attribuer un rôle et un périmètre.
          </p>
        </Panel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.ok
          ? data.data.clients.map((client) => (
              <Link
                key={client.id}
                to="/studio/$clientId"
                params={{ clientId: client.slug }}
                className="surface-panel group block p-5 transition hover:border-sawaz/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">
                      {client.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{client.sector ?? "—"}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {client.isDemo ? <StatusBadge tone="neutral">Démo</StatusBadge> : null}
                    <StatusBadge tone={client.reviewPublished ? "gold" : "sawaz"}>
                      {client.reviewPublished ? "Review publiée" : "Review non publiée"}
                    </StatusBadge>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Stat label="Projets" value={client.projects} />
                  <Stat label="Collectes" value={client.collections} />
                  <Stat label="Soumises" value={`${client.submitted}/${client.submissions}`} />
                  <Stat label="Fichiers" value={client.files} />
                </dl>

                <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sawaz">
                  Ouvrir le dossier
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </p>
                {client.metricsToReview > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {client.metricsToReview} métrique(s) à vérifier
                  </p>
                ) : null}
              </Link>
            ))
          : null}
      </div>
    </StudioShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-eyebrow text-muted-foreground">{label}</dt>
      <dd className="font-display text-base font-bold text-foreground">{value}</dd>
    </div>
  );
}
