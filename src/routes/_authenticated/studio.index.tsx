import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Building2, FileStack, FolderKanban, Inbox, Layers3 } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { LftcLogo } from "@/components/brand/Logos";
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

  const clients = data?.ok ? data.data.clients.filter((client) => !client.isDemo) : [];

  return (
    <StudioShell
      className="studio-home"
      title="Dossiers clients"
      subtitle="Pilotez les projets, collectes et restitutions de chaque client depuis un espace unique."
    >
      {isLoading ? <Panel>Chargement des dossiers…</Panel> : null}

      {data && !data.ok ? (
        <Panel>
          <p className="text-sm text-destructive">{data.error}</p>
        </Panel>
      ) : null}

      {data?.ok && clients.length === 0 ? (
        <Panel title="Aucun client accessible">
          <p className="text-sm text-muted-foreground">
            Ton compte n'a pas encore de client rattaché, ou aucun client n'existe. Un owner Sawaz
            doit t'attribuer un rôle et un périmètre.
          </p>
        </Panel>
      ) : null}

      {clients.length > 0 ? (
        <section className="studio-client-table overflow-hidden rounded-2xl border border-border shadow-elevated">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-raised/80">
                  <HeaderCell className="min-w-72">Client</HeaderCell>
                  <HeaderCell icon={<FolderKanban />}>Projets</HeaderCell>
                  <HeaderCell icon={<Layers3 />}>Collectes</HeaderCell>
                  <HeaderCell icon={<Inbox />}>Soumissions</HeaderCell>
                  <HeaderCell icon={<FileStack />}>Fichiers</HeaderCell>
                  <HeaderCell>Restitution</HeaderCell>
                  <HeaderCell className="text-right">Action</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="group border-b border-border transition last:border-b-0 hover:bg-sawaz/[0.055]"
                  >
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-4">
                        <ClientLogo name={client.name} slug={client.slug} />
                        <div className="min-w-0">
                          <p className="truncate font-display text-base font-extrabold text-foreground">
                            {client.name}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {client.sector ?? "Secteur non renseigné"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <MetricCell value={client.projects} />
                    <MetricCell value={client.collections} />
                    <td className="px-4 py-5">
                      <p className="font-display text-base font-extrabold text-foreground">
                        {client.submitted}
                        <span className="ml-1 font-sans text-xs font-medium text-muted-foreground">
                          / {client.submissions}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">finalisées</p>
                    </td>
                    <MetricCell value={client.files} />
                    <td className="px-4 py-5">
                      <StatusBadge tone={client.reviewPublished ? "gold" : "sawaz"}>
                        {client.reviewPublished ? "Restitution publiée" : "Restitution non publiée"}
                      </StatusBadge>
                      {client.metricsToReview > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {client.metricsToReview} métrique(s) à vérifier
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-5 text-right">
                      <Link
                        to="/studio/$clientId"
                        params={{ clientId: client.slug }}
                        className="inline-flex items-center gap-2 rounded-xl bg-sawaz px-4 py-2.5 text-sm font-extrabold whitespace-nowrap text-sawaz-foreground shadow-[0_10px_28px_-14px_var(--color-sawaz)] transition hover:-translate-y-0.5 hover:bg-sawaz/90 focus-visible:outline-sawaz"
                      >
                        Ouvrir le dossier
                        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-raised/35 px-5 py-3 text-xs text-muted-foreground">
            <span>{clients.length} dossier(s) client</span>
            <span>Données actualisées depuis les collectes</span>
          </div>
        </section>
      ) : null}
    </StudioShell>
  );
}

function HeaderCell({
  children,
  icon,
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-4 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase ${className ?? ""}`}
    >
      <span className="inline-flex items-center gap-2 [&_svg]:size-3.5 [&_svg]:text-sawaz">
        {icon}
        {children}
      </span>
    </th>
  );
}

function MetricCell({ value }: { value: number }) {
  return (
    <td className="px-4 py-5">
      <span className="font-display text-lg font-extrabold text-foreground">{value}</span>
    </td>
  );
}

function ClientLogo({ name, slug }: { name: string; slug: string }) {
  const isLftc = slug.toLowerCase().includes("lftc") || name.toLowerCase().includes("lftc");

  if (isLftc) {
    return (
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-sawaz/20 bg-white px-2.5 shadow-sm">
        <LftcLogo className="[&>span]:hidden [&_img]:h-auto [&_img]:max-h-8 [&_img]:max-w-full" />
      </span>
    );
  }

  return (
    <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-sawaz/25 bg-sawaz/10 text-sawaz">
      <Building2 className="size-6" aria-hidden="true" />
      <span className="sr-only">Logo de {name}</span>
    </span>
  );
}
