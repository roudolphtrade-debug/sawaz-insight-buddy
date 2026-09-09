import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, HelpCircle, Table2 } from "lucide-react";

import { ChoiceGroup } from "@/components/ChoiceGroup";
import { Disclosure } from "@/components/Disclosure";
import { FileUploader } from "@/components/FileUploader";
import { MetricCard } from "@/components/MetricCard";
import { NavigationFooter } from "@/components/NavigationFooter";
import { OptionToggle } from "@/components/OptionToggle";
import { PathHint, ThreeSeconds, WhyNote } from "@/components/PathHint";
import { QuestionCard } from "@/components/QuestionCard";
import { SawazCallout } from "@/components/SawazCallout";
import { StepLayout } from "@/components/StepLayout";
import { K, SLOT } from "@/lib/collection/keys";
import { youtubeBlocker } from "@/lib/collection/status";
import {
  useBoolAnswer,
  useCollection,
  useSingleChoice,
} from "@/lib/collection/store";
import { stepNeighbours } from "@/lib/steps";

export const Route = createFileRoute("/collecte/youtube")({
  head: () => ({
    meta: [
      { title: "YouTube — Comprendre la qualité de l'audience | LFTC" },
      {
        name: "description",
        content:
          "Transmets tes données YouTube Studio sur 365 jours : export CSV, captures Overview, Content et Audience, avec le lexique expliqué simplement.",
      },
      { property: "og:title", content: "YouTube — Comprendre la qualité de l'audience" },
      {
        property: "og:description",
        content: "Export ou captures YouTube Studio sur 365 derniers jours pour LFTC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: YoutubeScreen,
});

const captures = [
  {
    title: "Overview — Vue d'ensemble",
    slot: SLOT.ytOverview,
    missingKey: K.yt.missingOverview,
    path: ["YouTube Studio", "Analytics", "Overview — Vue d'ensemble"],
    seconds: "Une vue globale des performances de ta chaîne.",
    why: "Pour comprendre la performance générale de YouTube sur la période.",
  },
  {
    title: "Content — Contenu",
    slot: SLOT.ytContent,
    missingKey: K.yt.missingContent,
    path: ["YouTube Studio", "Analytics", "Content — Contenu"],
    seconds: "L'écran qui montre comment tes contenus sont exposés et consommés.",
    why: "Pour observer notamment les vues, impressions et clics.",
  },
  {
    title: "Audience",
    slot: SLOT.ytAudience,
    missingKey: K.yt.missingAudience,
    path: ["YouTube Studio", "Analytics", "Audience"],
    seconds: "Qui regarde LFTC et qui revient régulièrement ?",
    why: "Pour distinguer découverte et fidélisation.",
  },
];

const lexique = [
  {
    term: "Views — Vues",
    meaning: "Combien de fois tes contenus ont réellement été regardés ?",
    why: "Pour mesurer le volume d'attention généré par YouTube.",
  },
  {
    term: "Impressions",
    meaning: "Combien de fois YouTube a montré tes miniatures à des utilisateurs ?",
    why: "Pour savoir quelle exposition YouTube accorde réellement à LFTC.",
  },
  {
    term: "CTR — Click-Through Rate (taux de clic)",
    meaning: "Quand YouTube montre ta miniature, combien de personnes cliquent ?",
    why: "Pour mesurer l'efficacité du duo titre + miniature.",
  },
  {
    term: "Watch Time — Temps de visionnage",
    meaning: "Combien de temps les spectateurs passent-ils réellement devant tes vidéos ?",
    why: "Un clic n'a de valeur que si la personne reste.",
  },
  {
    term: "Average View Duration — Durée moyenne de visionnage",
    meaning: "Pendant combien de temps regarde-t-on une vidéo en moyenne ?",
    why: "Pour comparer la capacité des différents formats à retenir l'attention.",
  },
  {
    term: "Audience Retention — Rétention d'audience",
    meaning: "À quel moment les spectateurs commencent-ils à quitter une vidéo ?",
    why: "Pour identifier précisément les passages qui maintiennent ou font perdre l'attention.",
  },
];

function YoutubeScreen() {
  const { previous, next } = stepNeighbours("youtube");
  const { state, setAnswer } = useCollection();
  const [mode, setMode] = useSingleChoice(K.yt.mode);
  const [exportImpossible, toggleExportImpossible] = useBoolAnswer(K.yt.exportImpossible);
  const blocker = youtubeBlocker(state);
  const [showErrors, setShowErrors] = useState(false);

  const showGuide = mode === "guide";
  const showExport = mode === "export" && !exportImpossible;
  const showCaptures =
    mode === "captures" || mode === "guide" || (mode === "export" && exportImpossible);

  return (
    <StepLayout
      step="youtube"
      title="YouTube — Comprendre la qualité de l'audience"
      intro="Tu nous as indiqué que YouTube semble t'apporter moins de volume que Meta, mais des personnes plus qualitatives. Nous allons vérifier cette intuition."
    >
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <div className="space-y-3 text-sm leading-relaxed text-body">
          <p>Nous allons également distinguer les vidéos qui servent à :</p>
          <ul className="space-y-1">
            <li>→ attirer de nouvelles personnes ;</li>
            <li>→ construire la confiance ;</li>
            <li>→ accompagner les membres déjà présents dans LFTC.</li>
          </ul>
          <p>Une vue n'a pas la même valeur selon le rôle de la vidéo.</p>
          <p className="pt-1">Nous voulons comprendre :</p>
          <ul className="space-y-1">
            <li>→ YouTube te fait-il découvrir par de nouvelles personnes ?</li>
            <li>→ Quels contenus donnent réellement envie de rester ?</li>
            <li>→ Quelles vidéos transforment le mieux un spectateur ?</li>
            <li>→ Quelles vidéos servent surtout à accompagner les membres existants ?</li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface-raised p-4">
          <p className="text-eyebrow text-primary">Outil · YouTube Studio</p>
          <p className="mt-2 text-sm leading-relaxed text-body">
            YouTube Studio est l'interface officielle qui permet de gérer et d'analyser ta chaîne.
          </p>
        </div>

        <PathHint steps={["YouTube Studio", "Analytics", "Sélectionner « 365 derniers jours »"]} />
      </section>

      <QuestionCard
        number="Question 01"
        status="required"
        error={showErrors && !mode ? "Choisis une méthode de transmission pour continuer." : undefined}
        title="Quelle méthode préfères-tu pour nous transmettre les données YouTube ?"
        description="L'export est la solution la plus simple si tu sais le faire. Sinon, les captures d'écran fonctionnent parfaitement."
        help={{
          title: "Obligatoire",
          body: "Cette réponse détermine la suite : export, captures, ou procédure détaillée pas à pas.",
        }}
      >
        <ChoiceGroup
          label="Méthode de transmission YouTube"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setAnswer(K.yt.exportImpossible, false);
          }}
          options={[
            {
              value: "export",
              label: "Je peux faire un export depuis YouTube Studio",
              icon: <Table2 />,
            },
            { value: "captures", label: "Je préfère envoyer des captures d'écran", icon: <Camera /> },
            {
              value: "guide",
              label: "Je ne sais pas encore — guidez-moi étape par étape",
              icon: <HelpCircle />,
            },
          ]}
        />
      </QuestionCard>

      {showExport ? (
        <QuestionCard
          number="Option recommandée"
          status="conditional"
          error={
            showErrors && (state.files[SLOT.ytExport]?.length ?? 0) === 0
              ? "Ajoute l’export YouTube ou coche « Je n’arrive finalement pas à exporter »."
              : undefined
          }
          title="Option recommandée — Export YouTube"
          description="Dans YouTube Studio → Analytics, cherche : Advanced Mode — Mode avancé, puis l'option permettant d'exporter les données. Sélectionne idéalement 365 derniers jours. Puis télécharge le fichier disponible en CSV ou Excel."
        >
          <div className="space-y-4">
            <PathHint
              steps={["YouTube Studio", "Analytics", "Advanced Mode — Mode avancé", "Export"]}
            />
            <p className="text-sm leading-relaxed text-sawaz">
              <span className="font-semibold">Pourquoi l'export ? </span>
              Il nous permettra de comparer les vidéos beaucoup plus précisément sans te demander de
              recopier les chiffres un par un.
            </p>
            <FileUploader
              slot={SLOT.ytExport}
              label="Dépose ton export YouTube ici"
              hint="Formats acceptés : CSV, XLS, XLSX"
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            />
            <OptionToggle
              label="Je n'arrive finalement pas à exporter"
              checked={exportImpossible}
              onToggle={toggleExportImpossible}
            />
          </div>
        </QuestionCard>
      ) : null}

      {showGuide ? (
        <QuestionCard
          number="Procédure détaillée"
          title="On avance ensemble, étape par étape"
          description="Suis simplement ces étapes, puis envoie-nous les captures demandées ci-dessous."
        >
          <ol className="grid gap-2 text-sm leading-relaxed text-body">
            <li>1. Ouvre YouTube Studio depuis ton ordinateur.</li>
            <li>2. Clique sur Analytics dans le menu de gauche.</li>
            <li>3. En haut à droite, sélectionne la période « 365 derniers jours ».</li>
            <li>4. Fais une capture de chaque écran demandé ci-dessous.</li>
          </ol>
        </QuestionCard>
      ) : null}

      {showCaptures ? (
        <>
          <QuestionCard
            number="Captures YouTube"
            title="Pas besoin de chercher chaque chiffre séparément"
            description="Ouvre YouTube Studio → Analytics → sélectionne 365 derniers jours. Puis envoie-nous simplement les écrans suivants."
          >
            <PathHint
              steps={["YouTube Studio", "Analytics", "365 derniers jours"]}
              title="Avant de commencer"
            />
          </QuestionCard>

          {captures.map((capture, i) => (
            <QuestionCard
              key={capture.title}
              number={`Capture 0${i + 1}`}
              status="conditional"
              error={
                showErrors &&
                (state.files[capture.slot]?.length ?? 0) === 0 &&
                state.answers[capture.missingKey] !== true
                  ? "Ajoute cette capture ou indique que tu ne trouves pas cet écran."
                  : undefined
              }
              title={capture.title}
            >
              <div className="space-y-4">
                <PathHint steps={capture.path} title="Où" />
                <ThreeSeconds>{capture.seconds}</ThreeSeconds>
                <WhyNote>{capture.why}</WhyNote>
                <FileUploader
                  slot={capture.slot}
                  label={`Dépose ta capture · ${capture.title}`}
                  accept="image/*,.pdf"
                />
                <OptionToggle
                  label="Je ne trouve pas cet écran"
                  checked={state.answers[capture.missingKey] === true}
                  onToggle={() =>
                    setAnswer(capture.missingKey, !(state.answers[capture.missingKey] === true))
                  }
                />
              </div>
            </QuestionCard>
          ))}
        </>
      ) : null}

      <Disclosure
        label="Mini-lexique YouTube"
        hint="Ce que nous allons regarder dans tes données · si tu nous as déjà envoyé les fichiers ou les captures, tu n'as rien à recopier ici."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {lexique.map((item) => (
            <MetricCard key={item.term} term={item.term} meaning={item.meaning} why={item.why} />
          ))}
        </div>
      </Disclosure>

      <SawazCallout title="Rappel">
        Tu ne trouves pas une donnée ? Ne perds pas de temps. Indique simplement qu'elle n'est pas
        disponible et continue.
      </SawazCallout>

      <NavigationFooter
        previous={previous}
        next={next}
        nextLabel="Continuer"
        blocker={blocker}
        onBlocked={() => setShowErrors(true)}
      />
    </StepLayout>
  );
}
