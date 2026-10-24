import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";

import { AnalysesPanel } from "@/components/studio/AnalysesPanel";
import { ReviewsPanel } from "@/components/studio/ReviewsPanel";
import { MetricsReviewPanel } from "@/components/studio/MetricsReviewPanel";
import { SubmissionDetail } from "@/components/studio/SubmissionCard";
import { SubmissionsSection } from "@/components/studio/SubmissionsSection";
import { Panel, StudioShell } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import {
  activeCorpus,
  ATTRIBUTION_LABEL,
  formatParisDateTime,
  roleLabel,
} from "@/lib/studio/qualification";
import { getStudioDossier } from "@/lib/studio/studio.functions";
import { cn } from "@/lib/utils";

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

const projectStatusLabel: Record<string, string> = {
  active: "En cours",
  closed: "Clôturée",
  archived: "Archivée",
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
  const corpus = activeCorpus(dossier.submissions);
  const respondent = corpus.respondents[0] ?? null;

  return (
    <StudioShell
      title={dossier.client.name}
      subtitle={`${dossier.client.sector ?? "Secteur non renseigné"} · Rôle : ${roleLabel(dossier.role)}`}
      actions={
        <Link to="/studio" className="text-sm text-sawaz hover:underline">
          Tous les clients
        </Link>
      }
    >
      <MissionNav />

      <section id="vue-ensemble" aria-labelledby="corpus-title" className="surface-panel scroll-mt-16 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="corpus-title" className="font-display text-base font-bold text-foreground">
            Corpus actif du diagnostic
          </h2>
          <p className="text-xs text-muted-foreground">
            Seules les réponses retenues par Sawaz alimentent ces indicateurs.
          </p>
        </div>

        {!dossier.qualificationsAvailable ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Qualification indisponible pour le moment : le corpus actif ne peut pas être établi.
          </p>
        ) : null}

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile label="Réponses de référence" value={corpus.references} />
          <KpiTile
            label="Répondant"
            value={
              respondent
                ? corpus.respondents.length > 1
                  ? `${respondent.label} +${corpus.respondents.length - 1}`
                  : respondent.label
                : "Non attribué"
            }
            hint={respondent ? ATTRIBUTION_LABEL[respondent.attributionSource] : undefined}
          />
          <KpiTile label="Documents analysables" value={corpus.documents} />
          <KpiTile
            label="Dernière réponse de référence"
            value={corpus.lastReferenceAt ? formatParisDateTime(corpus.lastReferenceAt) : "Aucune"}
            compact
          />
        </div>

        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile label="Missions" value={dossier.projects.length} secondary />
          <KpiTile label="Collectes" value={dossier.collections.length} secondary />
          <KpiTile label="Indicateurs" value={dossier.metrics.length} secondary />
          <KpiTile
            label="Historique"
            value={corpus.historyCount}
            hint={
              corpus.historyByLabel.length > 0
                ? corpus.historyByLabel.map((h) => `${h.count} ${h.label.toLowerCase()}`).join(" · ")
                : "Aucune autre réponse"
            }
            secondary
          />
        </div>
      </section>

      <div id="missions" className="scroll-mt-16">
        <Panel title="Missions et collectes">
          <ul className="space-y-2 text-sm">
            {dossier.projects.map((p) => {
              const cols = dossier.collections.filter((c) => c.projectId === p.id);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2.5"
                >
                  <span className="text-foreground">
                    {p.name}
                    {p.periodLabel ? (
                      <span className="ml-2 text-xs text-muted-foreground">{p.periodLabel}</span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <StatusBadge tone="neutral">
                      Mission {(projectStatusLabel[p.status] ?? "en cours").toLowerCase()}
                    </StatusBadge>
                    {cols.map((c) => (
                      <StatusBadge key={c.id} tone="sawaz">
                        Collecte {(collectionStatusLabel[c.status] ?? "en cours").toLowerCase()}
                      </StatusBadge>
                    ))}
                  </span>
                </li>
              );
            })}
            {dossier.projects.length === 0 ? (
              <li className="text-muted-foreground">
                Aucune mission pour ce client : crée une mission et sa collecte pour recevoir des
                réponses.
              </li>
            ) : null}
          </ul>
        </Panel>
      </div>

      <div id="reponses" className="scroll-mt-16 space-y-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-foreground">Réponses</h2>
          <p className="text-sm text-muted-foreground">
            Donnée brute déclarée par les répondants, présentée avec la qualification Sawaz.
          </p>
        </div>

        {dossier.submissions.length === 0 ? (
          <Panel title="Aucune réponse reçue">
            <p className="text-sm text-muted-foreground">
              Aucun répondant n’a encore commencé la collecte. Les réponses apparaîtront ici dès
              l’ouverture du lien de collecte par le client.
            </p>
          </Panel>
        ) : (
          <SubmissionsSection
            submissions={dossier.submissions}
            qualificationsAvailable={dossier.qualificationsAvailable}
            renderDetail={(s) => <SubmissionDetail submission={s} canWrite={canWrite} />}
          />
        )}
      </div>

      <div id="indicateurs" className="scroll-mt-16">
        <MetricsReviewPanel
          metrics={dossier.metrics}
          canWrite={canWrite}
          analyzableDocuments={corpus.documents}
        />
      </div>

      <div id="analyse" className="scroll-mt-16">
        <AnalysesPanel clientId={dossier.client.id} analyses={dossier.analyses} canWrite={canWrite} />
      </div>

      <div id="restitution" className="scroll-mt-16">
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

/** Indicateur centré : titre, valeur et sous-libellé alignés au centre. */
function KpiTile({
  label,
  value,
  hint,
  secondary = false,
  compact = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  secondary?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border px-3 text-center",
        secondary ? "bg-surface py-2" : "bg-surface-raised py-3",
      )}
    >
      <p className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display font-extrabold text-foreground",
          secondary ? "text-lg" : compact ? "text-base" : "text-2xl",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const MISSION_SECTIONS = [
  ["vue-ensemble", "Vue d’ensemble"],
  ["missions", "Missions"],
  ["reponses", "Réponses"],
  ["indicateurs", "Indicateurs"],
  ["analyse", "Analyse"],
  ["restitution", "Restitution"],
] as const;

/** Sous-navigation de mission : ancres vers les sections du dossier, section visible active. */
function MissionNav() {
  const [active, setActive] = useState<string>(MISSION_SECTIONS[0][0]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    for (const [id] of MISSION_SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Sections de la mission"
      className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 py-2 backdrop-blur"
    >
      {MISSION_SECTIONS.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={() => setActive(id)}
          aria-current={active === id ? "true" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition",
            active === id
              ? "bg-sawaz/10 text-sawaz"
              : "text-muted-foreground hover:bg-surface hover:text-foreground",
          )}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
