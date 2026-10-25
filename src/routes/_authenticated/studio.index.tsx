import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Building2, FileStack, FolderKanban, Inbox, Layers3 } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { LftcLogo } from "@/components/brand/Logos";
import { Panel, StudioShell } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { listStudioClients } from "@/lib/studio/studio.functions";

export const Route = createFileRoute("/_authenticated/studio/")({
  head: () => ({
    meta: [
      { title: "Clients · Sawaz Pilot" },
      {
        name: "description",
        content:
          "Espace interne Sawaz : pilotage des missions clients, collectes, réponses, indicateurs et analyses Sawaz.",
      },
      { property: "og:title", content: "Clients · Sawaz Pilot" },
      {
        property: "og:description",
        content: "Pilotage des missions clients Sawaz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioIndex,
});

function StudioIndex() {
  const list = useServerFn(listStudioClients);

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
      title="Clients"
      subtitle="Pilotez les missions, collectes et restitutions de chaque client depuis un espace unique."
    >
      {isLoading ? <Panel>Chargement des clients…</Panel> : null}

      {data && !data.ok ? (
        <Panel>
          <p className="text-sm text-destructive">{data.error}</p>
        </Panel>
      ) : null}

      {data?.ok && clients.length === 0 ? (
        <Panel title="Aucun client accessible">
          <p className="text-sm text-muted-foreground">
            Ton compte n'a pas encore de client rattaché, ou aucun client n'existe. Un propriétaire
            Sawaz doit t'attribuer un rôle et un périmètre.
          </p>
        </Panel>
      ) : null}

      {clients.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-elevated">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-raised">
                  <HeaderCell className="min-w-72">Client</HeaderCell>
                  <HeaderCell numeric icon={<FolderKanban />}>Missions</HeaderCell>
                  <HeaderCell numeric icon={<Layers3 />}>Collectes</HeaderCell>
                  <HeaderCell numeric icon={<Inbox />}>Réponses de référence</HeaderCell>
                  <HeaderCell numeric icon={<FileStack />}>Documents analysables</HeaderCell>
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
                    <td className="px-5 py-3">
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
                    <MetricCell
                      value={client.referenceResponses ?? "À qualifier"}
                      sub={`${client.submissions} réponse${client.submissions > 1 ? "s" : ""} au total`}
                    />
                    <MetricCell
                      value={client.analyzableFiles ?? "À qualifier"}
                      sub={`${client.files} document${client.files > 1 ? "s" : ""} au total`}
                    />
                    <td className="px-4 py-3">
                      <StatusBadge tone={client.reviewPublished ? "success" : "sawaz"}>
                        {client.reviewPublished ? "Restitution partagée" : "Restitution non partagée"}
                      </StatusBadge>
                      {client.metricsToReview > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {client.metricsToReview} indicateur(s) à vérifier
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to="/studio/$clientId"
                        params={{ clientId: client.slug }}
                        className="inline-flex items-center gap-2 rounded-md bg-sawaz px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-sawaz-foreground transition hover:bg-sawaz/90"
                      >
                        Ouvrir
                        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-raised/35 px-5 py-3 text-xs text-muted-foreground">
            <span>{clients.length} client(s)</span>
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
  numeric = false,
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  /** Colonne numérique : titre centré, comme la valeur et son sous-libellé. */
  numeric?: boolean;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase ${numeric ? "text-center" : ""} ${className ?? ""}`}
    >
      <span className="inline-flex items-center justify-center gap-2 [&_svg]:size-3.5 [&_svg]:text-sawaz">
        {icon}
        {children}
      </span>
    </th>
  );
}

/** Cellule numérique centrée : valeur et sous-libellé éventuel. */
function MetricCell({ value, sub }: { value: number | string; sub?: string }) {
  return (
    <td className="px-4 py-3 text-center">
      <span
        className={`font-display font-extrabold text-foreground ${typeof value === "number" ? "text-lg" : "text-sm"}`}
      >
        {value}
      </span>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </td>
  );
}

function ClientLogo({ name, slug }: { name: string; slug: string }) {
  const isLftc = slug.toLowerCase().includes("lftc") || name.toLowerCase().includes("lftc");

  if (isLftc) {
    return (
      <span className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-surface px-2.5 shadow-sm">
        <LftcLogo className="[&>span]:hidden [&_img]:h-auto [&_img]:max-h-8 [&_img]:max-w-full" />
      </span>
    );
  }

  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-surface-raised text-sawaz">
      <Building2 className="size-5" aria-hidden="true" />
      <span className="sr-only">Logo de {name}</span>
    </span>
  );
}
