import { createFileRoute } from "@tanstack/react-router";
import { Clock, Compass, Layers, Scale, Target } from "lucide-react";

import { Disclosure } from "@/components/Disclosure";
import { NavigationFooter } from "@/components/NavigationFooter";
import { SawazCallout } from "@/components/SawazCallout";
import { StatusBadge } from "@/components/StatusBadge";
import { StepLayout } from "@/components/StepLayout";
import { stepNeighbours } from "@/lib/steps";

export const Route = createFileRoute("/collecte/")({
  head: () => ({
    meta: [
      { title: "LFTC — Mettre des chiffres derrière les intuitions" },
      {
        name: "description",
        content:
          "Phase 1 · Étape 2 : première vague de collecte de données LFTC, consacrée uniquement à YouTube et Meta. Environ 15 minutes.",
      },
      { property: "og:title", content: "LFTC — Mettre des chiffres derrière les intuitions" },
      {
        property: "og:description",
        content:
          "Première vague de données YouTube + Meta pour LFTC, accompagnée par Sawaz Décodage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntroductionScreen,
});

const blocs = [
  {
    icon: Scale,
    title: "Stabiliser avant de scaler",
    text: "Tu ne cherches pas simplement à faire entrer davantage de monde. Tu veux d'abord comprendre pourquoi l'acquisition varie autant afin de la rendre plus prévisible.",
  },
  {
    icon: Target,
    title: "Volume ≠ qualité",
    text: "Tu as formulé une intuition très intéressante : Meta t'apporterait davantage de volume, tandis que YouTube t'apporterait de meilleurs profils.",
  },
  {
    icon: Layers,
    title: "Un même canal peut avoir plusieurs rôles",
    text: "Nos premières observations montrent également que YouTube peut servir à faire découvrir LFTC, mais aussi à accompagner des membres déjà présents dans l'écosystème.",
  },
  {
    icon: Compass,
    title: "Ce que nous allons vérifier",
    text: "Nous allons maintenant mettre des chiffres derrière ces intuitions. À la fin de cette première collecte, nous voulons notamment répondre à une question simple : YouTube et Meta jouent-ils réellement deux rôles différents dans la croissance de LFTC ?",
  },
];

function IntroductionScreen() {
  const { previous, next } = stepNeighbours("introduction");

  return (
    <StepLayout
      step="introduction"
      title="LFTC — Mettre des chiffres derrière les intuitions"
      intro="Phase 1 · Étape 2 — Première vague de données : YouTube + Meta"
    >
      <section className="surface-panel p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="gold">YouTube</StatusBadge>
          <StatusBadge tone="gold">Meta</StatusBadge>
          <StatusBadge tone="neutral" icon={<Clock />}>
            Environ 15 minutes
          </StatusBadge>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-body">
          <p>Ton questionnaire nous a donné ta lecture de LFTC.</p>
          <p>
            Nous allons maintenant regarder ce que les comportements et les chiffres nous racontent.
          </p>
          <p>Temps estimé : environ 15 minutes.</p>
        </div>
        <Disclosure className="mt-4" label="Pourquoi cette première vague" hint="Lire le détail">
          <div className="space-y-3 text-sm leading-relaxed text-body">
            <p>
              Pour cette première vague, nous allons nous concentrer uniquement sur YouTube et Meta.
            </p>
            <p>L'objectif n'est pas de collecter des statistiques pour produire des tableaux.</p>
            <p>
              Nous voulons comprendre d'où viennent les bonnes personnes, pourquoi l'acquisition
              varie et quels canaux méritent réellement d'être amplifiés.
            </p>
          </div>
        </Disclosure>
      </section>

      <SawazCallout title="Une règle simple">
        Si tu ne trouves pas une donnée, ne perds pas de temps à la chercher. Indique-nous
        simplement qu'elle n'est pas disponible.
      </SawazCallout>

      <Disclosure
        label="Ce que tes réponses commencent déjà à nous montrer"
        hint="Retour court sur le questionnaire · facultatif à lire maintenant"
        tone="neutral"
      >
        <div className="grid gap-3">
          {blocs.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-border bg-surface-raised p-4"
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary"
                aria-hidden="true"
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-body">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </Disclosure>

      <NavigationFooter
        previous={previous}
        next={next}
        nextLabel="Commencer mon décodage"
        note="Tu ne trouves pas une donnée ? Ne perds pas de temps. Indique simplement qu'elle n'est pas disponible et continue."
      />
    </StepLayout>
  );
}
