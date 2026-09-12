import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { NavigationFooter } from "@/components/NavigationFooter";
import { QuestionCard } from "@/components/QuestionCard";
import { SawazCallout } from "@/components/SawazCallout";
import { StatusList } from "@/components/StatusList";
import { StepLayout } from "@/components/StepLayout";
import { collectionService } from "@/lib/collection/collectionService";
import { allSummaries } from "@/lib/collection/status";
import { useCollection } from "@/lib/collection/store";
import { stepNeighbours } from "@/lib/steps";

export const Route = createFileRoute("/collecte/validation")({
  head: () => ({
    meta: [
      { title: "Validation — Fin de la première vague | LFTC" },
      {
        name: "description",
        content:
          "Récapitulatif de la première vague de données YouTube et Meta, puis envoi des éléments à l'équipe Sawaz.",
      },
      { property: "og:title", content: "Validation — Fin de la première vague" },
      {
        property: "og:description",
        content: "Vérifie et envoie tes éléments YouTube et Meta pour LFTC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ValidationScreen,
});

function ValidationScreen() {
  const { previous } = stepNeighbours("validation");
  const { state, hydrated, markSubmitted } = useCollection();
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const sections = allSummaries(state);
  const sent = state.submittedAt !== null;

  const handleSubmit = async () => {
    if (sending || sent) return;
    setSending(true);
    setSendError(null);

    try {
      const res = await collectionService.submit();
      if (res.ok) {
        markSubmitted(res.submittedAt);
      } else {
        setSendError(res.error);
      }
    } finally {
      setSending(false);
    }
  };

  const sentAt =
    state.submittedAt !== null
      ? new Intl.DateTimeFormat("fr-FR", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(new Date(state.submittedAt))
      : null;

  return (
    <StepLayout
      step="validation"
      title={sent ? "Tes éléments ont bien été envoyés." : "Tu as terminé. À nous maintenant."}
      intro={
        sent
          ? "La collecte est terminée et enregistrée. Tu n'as plus aucune action à effectuer."
          : "Merci. Nous avons maintenant les éléments nécessaires pour commencer à comparer YouTube et Meta sur autre chose que le volume brut."
      }
    >
      {sent ? (
        <section className="surface-panel border-primary/50 bg-primary/5 p-6 sm:p-8" role="status">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-eyebrow text-primary">Envoi confirmé</p>
              <h2 className="mt-1 font-display text-xl font-extrabold text-foreground sm:text-2xl">
                C'est reçu.
              </h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-body">
                <p>Nous avons bien reçu tes réponses et les fichiers transmis.</p>
                <p className="font-semibold text-foreground">
                  Tu n'as plus rien à faire sur cette page. Tu peux maintenant la fermer.
                </p>
                {sentAt ? (
                  <p className="pt-1 text-xs text-muted-foreground">Envoyé le {sentAt}.</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <QuestionCard status="info" number="Récapitulatif" title="Ce que nous allons chercher à comprendre">
            <div className="space-y-4">
              <ol className="grid list-decimal gap-2 pl-5 text-sm leading-relaxed text-body">
                <li>Quel canal génère réellement de la découverte ?</li>
                <li>Quel canal crée le plus d'attention ?</li>
                <li>Quel canal semble produire les profils les plus qualitatifs ?</li>
                <li>Quel rôle jouent les différents types de contenus YouTube ?</li>
                <li>Où les campagnes Meta envoient réellement les personnes ?</li>
                <li>Pourquoi l'acquisition peut varier fortement d'un jour ou d'une campagne à l'autre ?</li>
              </ol>
              <div className="space-y-2 border-t border-border pt-4 text-sm leading-relaxed text-body">
                <p>Nous ne tirerons pas encore de conclusion stratégique à partir de ces données seules.</p>
                <p>
                  Elles seront croisées avec ton questionnaire et avec ce que nous avons déjà observé
                  sur l'écosystème LFTC.
                </p>
              </div>
            </div>
          </QuestionCard>

          <QuestionCard status="info" number="État de la collecte" title="Ce que tu nous as transmis pour l'instant">
            <div className="space-y-6">
              {hydrated ? (
                sections.map((section) => <StatusList key={section.title} section={section} />)
              ) : (
                <p className="text-sm text-muted-foreground">Chargement de tes réponses…</p>
              )}
            </div>
          </QuestionCard>

          <SawazCallout title="Rappel">
            Si une donnée manque, ce n'est pas bloquant lorsqu'une option « introuvable » ou
            « indisponible » est proposée. Utilise cette option plutôt que de rester bloqué.
          </SawazCallout>

          {sendError ? (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-3 rounded-xl border border-destructive/55 bg-destructive/10 p-4 text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-bold">Envoi non terminé</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed">{sendError}</p>
                <p className="mt-1.5 text-xs leading-relaxed">
                  Corrige l'élément indiqué puis relance l'envoi.
                </p>
              </div>
            </div>
          ) : null}

          <NavigationFooter
            previous={previous}
            next={null}
            nextLabel={sending ? "Transmission en cours…" : "Transmettre mes éléments"}
            onNext={() => void handleSubmit()}
            busy={sending}
            note={sending ? "Transmission sécurisée en cours…" : "Tes réponses sont enregistrées automatiquement."}
          />
        </>
      )}
    </StepLayout>
  );
}
