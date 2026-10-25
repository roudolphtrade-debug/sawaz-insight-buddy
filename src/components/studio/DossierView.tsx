import { MessageSquareText } from "lucide-react";

import { AnalysesPanel } from "@/components/studio/AnalysesPanel";
import { DossierTabs, useDossierTab } from "@/components/studio/DossierTabs";
import { MetricsReviewPanel } from "@/components/studio/MetricsReviewPanel";
import { MissionsPanel } from "@/components/studio/MissionsPanel";
import { OverviewPanel } from "@/components/studio/OverviewPanel";
import { ReviewsPanel } from "@/components/studio/ReviewsPanel";
import { Panel } from "@/components/studio/StudioShell";
import { SubmissionDetail } from "@/components/studio/SubmissionCard";
import { SubmissionsSection } from "@/components/studio/SubmissionsSection";
import { activeCorpus } from "@/lib/studio/qualification";
import type { StudioDossier } from "@/lib/studio/studio.functions";

/**
 * Contenu du dossier client : les six onglets, l'onglet actif venant du hash de l'URL.
 * Présentation uniquement : les données arrivent déjà chargées par la route.
 */
export function DossierView({
  dossier,
  clientSlug,
}: {
  dossier: StudioDossier;
  clientSlug: string;
}) {
  // Onglet actif = hash de l'URL (jamais la position de défilement).
  const tab = useDossierTab();
  const canWrite = dossier.role === "owner" || dossier.role === "analyst";
  const corpus = activeCorpus(dossier.submissions);

  return (
    <DossierTabs
      active={tab.active}
      onSelect={tab.select}
      panels={{
        "vue-ensemble": () => <OverviewPanel dossier={dossier} onSelect={tab.select} />,
        missions: () => (
          <MissionsPanel
            projects={dossier.projects}
            collections={dossier.collections}
            submissions={dossier.submissions}
          />
        ),
        reponses: () =>
          dossier.submissions.length === 0 ? (
            <Panel
              icon={MessageSquareText}
              tone="reponses"
              eyebrow="Réponses"
              title="Aucune réponse reçue"
            >
              <p className="max-w-3xl text-sm text-muted-foreground">
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
          ),
        indicateurs: () => (
          <MetricsReviewPanel
            metrics={dossier.metrics}
            canWrite={canWrite}
            analyzableDocuments={corpus.documents}
          />
        ),
        analyse: () => (
          <AnalysesPanel
            clientId={dossier.client.id}
            analyses={dossier.analyses}
            canWrite={canWrite}
          />
        ),
        restitution: () => (
          <ReviewsPanel
            clientSlug={clientSlug}
            clientId={dossier.client.id}
            projects={dossier.projects}
            collections={dossier.collections}
            canWrite={canWrite}
          />
        ),
      }}
    />
  );
}
