import {
  BarChart3,
  FileStack,
  FileText,
  FolderOpen,
  History,
  Inbox,
  LayoutGrid,
  Lightbulb,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { TabLink } from "@/components/studio/DossierTabs";
import { KpiCard, SummaryCard } from "@/components/studio/DossierUI";
import { Panel } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import type { DossierTabId } from "@/lib/studio/dossier-tabs";
import {
  activeCorpus,
  ATTRIBUTION_LABEL,
  formatParisDateTime,
  partitionSubmissions,
  qualificationLabel,
  splitReviews,
} from "@/lib/studio/qualification";
import { REVIEW_STATUS_LABEL, type ReviewStatus } from "@/lib/studio/review-content";
import {
  collectionStatusText,
  joinMeta,
  plural,
  PRIMARY_ACTION,
  projectStatusText,
  SECONDARY_ACTION,
} from "@/lib/studio/sections";
import type { StudioDossier } from "@/lib/studio/studio.functions";
import { useClientReviews } from "@/lib/studio/use-client-reviews";

/**
 * Vue d'ensemble du dossier : corpus actif (KPI) puis une synthèse de chaque onglet.
 * Uniquement des lectures de données déjà chargées : rien n'est recalculé côté base ni
 * dupliqué, chaque carte renvoie vers l'onglet qui porte le détail.
 */
export function OverviewPanel({
  dossier,
  onSelect,
}: {
  dossier: StudioDossier;
  onSelect: (id: DossierTabId) => void;
}) {
  const corpus = activeCorpus(dossier.submissions);
  const respondent = corpus.respondents[0] ?? null;
  const reference = partitionSubmissions(dossier.submissions).active[0] ?? null;

  const activeProject =
    dossier.projects.find((p) => p.status === "active") ?? dossier.projects[0] ?? null;
  const activeCollections = activeProject
    ? dossier.collections.filter((c) => c.projectId === activeProject.id)
    : [];
  const openCollections = dossier.collections.filter((c) => c.status === "open").length;
  const runningProjects = dossier.projects.filter((p) => p.status === "active").length;

  const metricsToReview = dossier.metrics.filter((m) => m.reviewStatus === "a_verifier").length;
  const metricsValidated = dossier.metrics.filter((m) => m.reviewStatus === "valide").length;
  const metricsRejected = dossier.metrics.filter((m) => m.reviewStatus === "rejete").length;

  const shared = dossier.analyses.filter((a) => a.type !== "note");
  const internalNotes = dossier.analyses.length - shared.length;
  const countType = (type: string) => shared.filter((a) => a.type === type).length;

  const go = (to: DossierTabId, label: string, primary = false) => (
    <TabLink to={to} onSelect={onSelect} className={primary ? PRIMARY_ACTION : SECONDARY_ACTION}>
      {label}
    </TabLink>
  );

  return (
    <div className="space-y-4">
      <Panel
        icon={LayoutGrid}
        tone="vue-ensemble"
        eyebrow="Vue d’ensemble"
        title="Corpus actif du diagnostic"
        description="Seules les réponses retenues par Sawaz alimentent ces indicateurs. L’historique et les essais restent consultables, hors corpus."
        aside={
          corpus.lastReferenceAt ? (
            <div className="@2xl:text-right">
              <p className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                Dernière mise à jour
              </p>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {formatParisDateTime(corpus.lastReferenceAt)}
              </p>
            </div>
          ) : null
        }
      >
        {!dossier.qualificationsAvailable ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Qualification indisponible pour le moment : le corpus actif ne peut pas être établi.
          </p>
        ) : null}

        {/* Une seule grille de 12 colonnes à rangées égales (auto-rows-fr) : les sept KPI
            gardent la même hauteur quel que soit le retour à la ligne d'une sous-information. */}
        <div className="grid auto-rows-fr grid-cols-12 gap-3">
          <KpiCard
            className="col-span-12 sm:col-span-4"
            icon={ShieldCheck}
            tone="vue-ensemble"
            label="Réponses de référence"
            value={corpus.references}
            hint={corpus.references > 0 ? "Corpus actif" : "Aucune réponse retenue"}
          />
          <KpiCard
            className="col-span-12 sm:col-span-4"
            icon={UserRound}
            tone="vue-ensemble"
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
          <KpiCard
            className="col-span-12 sm:col-span-4"
            icon={FileStack}
            tone="reponses"
            label="Documents analysables"
            value={corpus.documents}
            hint="Issus des réponses de référence"
          />
          <KpiCard
            className="col-span-6 lg:col-span-3"
            emphasis="secondary"
            icon={FolderOpen}
            tone="missions"
            label="Missions"
            value={dossier.projects.length}
            hint={runningProjects > 0 ? `${runningProjects} en cours` : undefined}
          />
          <KpiCard
            className="col-span-6 lg:col-span-3"
            emphasis="secondary"
            icon={Inbox}
            tone="missions"
            label="Collectes"
            value={dossier.collections.length}
            hint={openCollections > 0 ? plural(openCollections, "ouverte") : undefined}
          />
          <KpiCard
            className="col-span-6 lg:col-span-3"
            emphasis="secondary"
            icon={BarChart3}
            tone="indicateurs"
            label="Indicateurs"
            value={dossier.metrics.length}
            hint={`${metricsToReview} à vérifier`}
          />
          <KpiCard
            className="col-span-6 lg:col-span-3"
            emphasis="secondary"
            icon={History}
            tone="neutre"
            label="Historique"
            value={corpus.historyCount}
            hint={
              corpus.historyByLabel.length > 0
                ? joinMeta(corpus.historyByLabel.map((h) => countLabel(h.count, h.label)))
                : "Aucune autre réponse"
            }
          />
        </div>
      </Panel>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <SummaryCard
          icon={FolderOpen}
          tone="missions"
          title="Missions et collectes"
          action={go("missions", "Voir les missions")}
        >
          {activeProject ? (
            <div className="space-y-2">
              <p className="font-display text-base font-bold text-foreground">
                {activeProject.name}
                {activeProject.periodLabel ? (
                  <span className="ml-2 text-sm font-medium text-muted-foreground">
                    {activeProject.periodLabel}
                  </span>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="indigo">{projectStatusText(activeProject.status)}</StatusBadge>
                {activeCollections.map((c) => (
                  <StatusBadge key={c.id} tone="cyan">
                    {collectionStatusText(c.status)}
                  </StatusBadge>
                ))}
              </div>
              <p className="text-muted-foreground">
                {joinMeta([
                  plural(activeCollections.length, "collecte"),
                  dossier.projects.length > 1
                    ? plural(dossier.projects.length - 1, "autre mission", "autres missions")
                    : null,
                ])}
              </p>
            </div>
          ) : (
            <Quiet>Aucune mission pour ce client.</Quiet>
          )}
        </SummaryCard>

        <SummaryCard
          icon={MessageSquareText}
          tone="reponses"
          title="Réponse de référence"
          action={go("reponses", "Voir les réponses")}
        >
          {reference ? (
            <div className="space-y-2">
              <p className="font-display text-base font-bold text-foreground">
                {reference.qualification?.respondentLabel ?? "Répondant non identifié"}
              </p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="sawaz">
                  {qualificationLabel(reference.qualification)}
                </StatusBadge>
                {reference.qualification?.respondentLabel ? (
                  <StatusBadge tone="slate">
                    {ATTRIBUTION_LABEL[reference.qualification.attributionSource]}
                  </StatusBadge>
                ) : null}
              </div>
              <p className="text-muted-foreground">
                {formatParisDateTime(reference.submittedAt ?? reference.updatedAt)}
              </p>
              <p className="text-muted-foreground">
                {joinMeta([
                  plural(reference.answers.length, "réponse"),
                  plural(reference.files.length, "document"),
                ])}
              </p>
            </div>
          ) : (
            <Quiet>
              {dossier.qualificationsAvailable
                ? "Aucune réponse de référence : qualifier une réponse dans l’onglet Réponses."
                : "Qualification indisponible pour le moment."}
            </Quiet>
          )}
        </SummaryCard>

        <SummaryCard
          icon={BarChart3}
          tone="indicateurs"
          title="Indicateurs"
          aside={
            <StatusBadge tone={metricsToReview > 0 ? "warn" : "neutral"}>
              {metricsToReview} à vérifier
            </StatusBadge>
          }
          action={go("indicateurs", "Voir les indicateurs")}
        >
          {dossier.metrics.length > 0 ? (
            <p>
              {joinMeta([
                plural(metricsValidated, "validé"),
                `${metricsToReview} à vérifier`,
                plural(metricsRejected, "rejeté"),
              ])}
            </p>
          ) : (
            <Quiet>
              Aucun indicateur pour l’instant
              {corpus.documents > 0
                ? ` : ${plural(corpus.documents, "document analysable", "documents analysables")} en attente d’extraction.`
                : "."}
            </Quiet>
          )}
        </SummaryCard>

        <SummaryCard
          icon={Lightbulb}
          tone="analyse"
          title="Analyse"
          action={go("analyse", "Ouvrir l’analyse")}
        >
          {shared.length > 0 ? (
            <p>
              {joinMeta([
                plural(countType("constat"), "constat"),
                plural(countType("hypothese"), "hypothèse"),
                plural(countType("recommandation"), "recommandation"),
              ])}
            </p>
          ) : (
            <Quiet>Aucune analyse rédigée pour ce client.</Quiet>
          )}
          <p className="mt-1 text-muted-foreground">
            {plural(internalNotes, "note interne", "notes internes")} · jamais visibles côté client
          </p>
        </SummaryCard>
      </div>

      <RestitutionSummary dossier={dossier} metricsValidated={metricsValidated} go={go} />
    </div>
  );
}

function RestitutionSummary({
  dossier,
  metricsValidated,
  go,
}: {
  dossier: StudioDossier;
  metricsValidated: number;
  go: (to: DossierTabId, label: string, primary?: boolean) => ReactNode;
}) {
  const { data, isLoading } = useClientReviews(dossier.client.id);
  const reviews = data?.ok ? data.data : [];
  const main = splitReviews(reviews).primary[0] ?? null;
  const latestVersion = main?.versions.reduce((max, v) => Math.max(max, v.versionNo), 0);
  const clientAnalyses = dossier.analyses.filter((a) => a.type !== "note").length;

  return (
    <SummaryCard
      icon={FileText}
      tone="restitution"
      title="Restitution"
      aside={
        main ? (
          <StatusBadge tone={main.status === "published" ? "success" : "slate"}>
            {REVIEW_STATUS_LABEL[main.status as ReviewStatus]}
          </StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Aucun accès client avant partage</StatusBadge>
        )
      }
      action={go("restitution", main ? "Ouvrir la restitution" : "Préparer la restitution", true)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p>
          {isLoading
            ? "Chargement des restitutions…"
            : main
              ? joinMeta([
                  main.projectName,
                  latestVersion ? `Version ${latestVersion}` : null,
                  main.createdAt ? `créée le ${formatParisDateTime(main.createdAt)}` : null,
                ])
              : "Aucune restitution préparée."}
        </p>
        <p className="text-muted-foreground">
          Sources éligibles :{" "}
          {joinMeta([
            plural(metricsValidated, "indicateur validé", "indicateurs validés"),
            plural(clientAnalyses, "analyse client", "analyses client"),
          ])}
        </p>
      </div>
    </SummaryCard>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}

/** « 4 historiques », « 1 exclue » ; une étiquette verbale (« À qualifier ») reste invariable. */
function countLabel(count: number, label: string) {
  const lower = label.toLowerCase();
  return `${count} ${count > 1 && !lower.startsWith("à ") && !lower.endsWith("s") ? `${lower}s` : lower}`;
}
