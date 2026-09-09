import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, HelpCircle, Table2 } from "lucide-react";

import { ChoiceGroup, MultiChoiceGroup } from "@/components/ChoiceGroup";
import { Disclosure } from "@/components/Disclosure";
import { FileUploader } from "@/components/FileUploader";
import { MetricCard } from "@/components/MetricCard";
import { NavigationFooter } from "@/components/NavigationFooter";
import { OptionToggle } from "@/components/OptionToggle";
import { PathHint, ThreeSeconds, WhyNote } from "@/components/PathHint";
import { QuestionCard } from "@/components/QuestionCard";
import { SectionBlock } from "@/components/SectionBlock";
import { SawazCallout } from "@/components/SawazCallout";
import { StepLayout } from "@/components/StepLayout";
import { TextAnswer } from "@/components/TextAnswer";
import { K, SLOT } from "@/lib/collection/keys";
import { metaBlocker } from "@/lib/collection/status";
import {
  useBoolAnswer,
  useCollection,
  useMultiChoice,
  useSingleChoice,
  useTextAnswer,
} from "@/lib/collection/store";

import { stepNeighbours } from "@/lib/steps";

export const Route = createFileRoute("/collecte/meta")({
  head: () => ({
    meta: [
      { title: "Meta — Comprendre le moteur de volume | LFTC" },
      {
        name: "description",
        content:
          "Période, objectif de campagne, destination, résultats et suivi des conversions dans le gestionnaire de publicités Meta.",
      },
      { property: "og:title", content: "Meta — Comprendre le moteur de volume" },
      {
        property: "og:description",
        content: "Collecte des données Meta Ads pour comprendre le rôle réel de Meta chez LFTC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MetaScreen,
});

const lexique = [
  {
    term: "Amount Spent — Montant dépensé",
    meaning: "Combien as-tu réellement investi sur la période ?",
  },
  {
    term: "Impressions",
    meaning: "Combien de fois tes publicités ont été affichées ?",
  },
  {
    term: "Reach — Couverture",
    meaning: "Combien de personnes différentes ont vu tes publicités ?",
  },
  {
    term: "CTR — Click-Through Rate (taux de clic)",
    meaning: "Combien de personnes cliquent après avoir vu la publicité ?",
  },
  {
    term: "CPC — Cost Per Click (coût par clic)",
    meaning: "Combien coûte un clic en moyenne ?",
  },
  {
    term: "CPM — Cost Per Mille (coût pour mille impressions)",
    meaning: "Combien coûte 1 000 affichages ?",
  },
  {
    term: "Frequency — Fréquence",
    meaning: "Combien de fois une même personne voit ta publicité en moyenne ?",
  },
  {
    term: "Link Clicks — Clics sur le lien",
    meaning: "Combien de personnes ont cliqué sur ton lien ?",
  },
  {
    term: "Landing Page Views — Vues de page de destination",
    meaning: "Combien de personnes ont réellement chargé ta page après le clic ?",
  },
  {
    term: "Cost per Result — Coût par résultat",
    meaning: "Combien te coûte en moyenne chaque résultat obtenu ?",
  },
];

function MetaScreen() {
  const { previous, next } = stepNeighbours("meta");
  const { state, setAnswer } = useCollection();
  const [periode, setPeriode] = useSingleChoice(K.meta.periode);
  const [periodeAutre, setPeriodeAutre] = useTextAnswer(K.meta.periodeAutre);
  const [objectifs, toggleObjectif] = useMultiChoice(K.meta.objectifs);
  const [objectifAutre, setObjectifAutre] = useTextAnswer(K.meta.objectifAutre);
  const [destination, toggleDestination] = useMultiChoice(K.meta.destination);
  const [destinationAutre, setDestinationAutre] = useTextAnswer(K.meta.destinationAutre);
  const [mode, setMode] = useSingleChoice(K.meta.mode);
  const [exportImpossible, toggleExportImpossible] = useBoolAnswer(K.meta.exportImpossible);
  const [results, toggleResult] = useMultiChoice(K.meta.results);
  const [resultsAutre, setResultsAutre] = useTextAnswer(K.meta.resultsAutre);
  const [tracking, setTracking] = useSingleChoice(K.meta.tracking);
  const [resultsMissing, toggleResultsMissing] = useBoolAnswer(K.meta.resultsMissing);
  const blocker = metaBlocker(state);
  const [showErrors, setShowErrors] = useState(false);

  const showExport = mode === "export" && !exportImpossible;
  const showCaptures =
    mode === "captures" || mode === "guide" || (mode === "export" && exportImpossible);

  return (
    <StepLayout
      step="meta"
      title="Meta — Comprendre le moteur de volume"
    >
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <div className="space-y-2 text-sm leading-relaxed text-body">
          <p>Tu nous as indiqué que Meta semble apporter beaucoup plus de volume que YouTube.</p>
          <p>Nous voulons maintenant comprendre :</p>
          <ul className="space-y-1">
            <li>→ combien ce volume coûte ;</li>
            <li>→ quelles campagnes le produisent ;</li>
            <li>→ quelles publicités donnent réellement envie d'avancer ;</li>
            <li>→ où les personnes sont envoyées après le clic ;</li>
            <li>→ et ce que Meta considère aujourd'hui comme une conversion.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-surface-raised p-4">
          <p className="text-eyebrow text-sawaz">Outil · Meta Ads Manager</p>
          <p className="mt-2 text-sm leading-relaxed text-body">
            C'est l'interface utilisée pour gérer et analyser les publicités Facebook et Instagram
            de LFTC.
          </p>
        </div>
      </section>

      <SectionBlock
        eyebrow="Bloc 1"
        title="Le contexte de tes campagnes"
        description="Période observée, objectifs utilisés et destination des personnes après le clic."
      >
      <QuestionCard
        number="Question 01"
        status="required"
        error={
          showErrors && (!periode || (periode === "autre" && !periodeAutre.trim()))
            ? periode === "autre"
              ? "Précise la période choisie."
              : "Sélectionne la période que tu vas transmettre."
            : undefined
        }
        title="Quelle période vas-tu nous transmettre ?"
      >
        <div className="space-y-4">
          <ChoiceGroup
            label="Période Meta"
            value={periode}
            onChange={setPeriode}
            options={[
              { value: "12m", label: "12 derniers mois" },
              { value: "6m", label: "6 derniers mois" },
              { value: "autre", label: "Autre" },
            ]}
          />
          {periode === "autre" ? (
            <TextAnswer
              label="Précise la période"
              placeholder="Exemple : de janvier à mars 2026"
              value={periodeAutre}
              onChange={setPeriodeAutre}
            />
          ) : null}
        </div>
      </QuestionCard>

      <QuestionCard
        number="Question 02"
        status="required"
        error={
          showErrors && (objectifs.length === 0 || (objectifs.includes("autre") && !objectifAutre.trim()))
            ? objectifs.includes("autre")
              ? "Précise l’objectif sélectionné."
              : "Sélectionne au moins un objectif de campagne."
            : undefined
        }
        title="Quel est ou quels sont les principaux objectifs utilisés sur tes campagnes LFTC ?"
        description="Dans Meta, cela s'appelle : Campaign Objective — Objectif de campagne."
        help={{
          title: "Où trouver la donnée",
          body: "Gestionnaire de publicités Meta → colonne Objective — Objectif.",
        }}
      >
        <div className="space-y-4">
          <MultiChoiceGroup
            label="Objectif de campagne"
            values={objectifs}
            onToggle={toggleObjectif}
            options={[
              { value: "trafic", label: "Trafic" },
              { value: "engagement", label: "Engagement" },
              { value: "messages", label: "Messages" },
              { value: "leads", label: "Leads — Prospects" },
              { value: "ventes", label: "Ventes-conversions" },
              { value: "plusieurs", label: "Plusieurs objectifs selon les campagnes" },
              { value: "autre", label: "Autre" },
              { value: "inconnu", label: "Je ne sais pas" },
            ]}
            columns={2}
          />
          {objectifs.includes("autre") ? (
            <TextAnswer
              label="Précise l'objectif"
              value={objectifAutre}
              onChange={setObjectifAutre}
            />
          ) : null}
          <WhyNote>
            L'objectif choisi influence directement le type de personnes que Meta t'envoie.
          </WhyNote>
        </div>
      </QuestionCard>

      <QuestionCard
        number="Question 03"
        status="required"
        error={
          showErrors &&
          (destination.length === 0 || (destination.includes("autre-page") && !destinationAutre.trim()))
            ? destination.includes("autre-page")
              ? "Précise cette autre destination."
              : "Sélectionne au moins une destination après le clic."
            : undefined
        }
        title="Où tes campagnes Meta envoient-elles principalement les personnes ?"
      >
        <div className="space-y-4">
        <MultiChoiceGroup
          label="Destination après le clic"
          values={destination}
          onToggle={toggleDestination}
          options={[
            { value: "landing", label: "Landing page LFTC" },
            { value: "telegram", label: "Telegram public directement" },
            { value: "conversation", label: "Conversation-message" },
            { value: "autre-page", label: "Autre page" },
            { value: "plusieurs", label: "Plusieurs destinations" },
            { value: "inconnu", label: "Je ne sais pas" },
          ]}
          columns={2}
        />
        {destination.includes("autre-page") ? (
          <TextAnswer
            label="Précise cette autre page"
            value={destinationAutre}
            onChange={setDestinationAutre}
          />
        ) : null}
        </div>
      </QuestionCard>

      </SectionBlock>

      <SectionBlock
        eyebrow="Bloc 2"
        title="La transmission des données"
        description="Choisis la méthode la plus simple pour toi : export ou captures. Les deux nous conviennent."
      >
      <QuestionCard
        number="Question 04"
        status="required"
        error={showErrors && !mode ? "Choisis une méthode de transmission Meta." : undefined}
        title="Comment préfères-tu nous transmettre les données Meta ?"
      >
        <ChoiceGroup
          label="Méthode de transmission Meta"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setAnswer(K.meta.exportImpossible, false);
          }}
          options={[
            { value: "export", label: "Exporter le tableau Meta", icon: <Table2 /> },
            { value: "captures", label: "Envoyer des captures", icon: <Camera /> },
            { value: "guide", label: "Je ne sais pas comment faire", icon: <HelpCircle /> },
          ]}
        />
      </QuestionCard>

      {showExport ? (
        <QuestionCard
          number="Option recommandée"
          status="conditional"
          error={
            showErrors && (state.files[SLOT.metaExport]?.length ?? 0) === 0
              ? "Ajoute l’export Meta ou coche « Je n’arrive finalement pas à exporter »."
              : undefined
          }
          title="Option recommandée — Export Meta"
          description="Dans le gestionnaire de publicités : Reports — Rapports, puis Export. Sélectionne la période choisie, puis télécharge le fichier en CSV ou Excel."
        >
          <div className="space-y-4">
            <PathHint steps={["Gestionnaire de publicités", "Reports — Rapports", "Export"]} />
            <div className="rounded-xl border border-border bg-surface-raised p-4">
              <p className="text-eyebrow text-sawaz">Colonnes utiles dans l'export</p>
              <ul className="mt-2 grid gap-1 text-sm leading-relaxed text-body sm:grid-cols-2">
                {[
                  "Amount Spent — Montant dépensé",
                  "Impressions",
                  "Reach — Couverture",
                  "CTR — Taux de clic",
                  "CPC — Coût par clic",
                  "CPM — Coût pour mille",
                  "Frequency — Fréquence",
                  "Link Clicks — Clics sur le lien",
                  "Landing Page Views — Vues de page de destination",
                  "Results — Résultats",
                  "Cost per Result — Coût par résultat",
                ].map((col) => (
                  <li key={col}>→ {col}</li>
                ))}
              </ul>
            </div>
            <FileUploader
              slot={SLOT.metaExport}
              label="Dépose ton export Meta ici"
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

      {showCaptures ? (
        <QuestionCard
          number="Captures Meta"
          status="conditional"
          error={
            showErrors && (state.files[SLOT.metaCaptures]?.length ?? 0) === 0
              ? "Ajoute au moins une capture Meta pour cette méthode de transmission."
              : undefined
          }
          title="Envoie-nous simplement l'écran principal"
          description="Ouvre le gestionnaire de publicités, sélectionne la période choisie, puis fais une capture du tableau des campagnes avec les colonnes de performance visibles."
        >
          <div className="space-y-4">
            <PathHint
              steps={["Gestionnaire de publicités", "Campaigns — Campagnes", "Période choisie"]}
            />
            <ThreeSeconds>
              Le tableau qui montre, campagne par campagne, ce que tu as dépensé et ce que tu as
              obtenu.
            </ThreeSeconds>
            {mode === "guide" ? (
              <ol className="grid gap-2 text-sm leading-relaxed text-body">
                <li>1. Ouvre le gestionnaire de publicités Meta depuis ton ordinateur.</li>
                <li>2. Va dans Campaigns — Campagnes.</li>
                <li>3. En haut à droite, sélectionne la période choisie.</li>
                <li>4. Fais une capture du tableau avec les colonnes de performance visibles.</li>
              </ol>
            ) : null}
            <FileUploader
              slot={SLOT.metaCaptures}
              label="Dépose tes captures Meta ici"
              accept="image/*,.pdf"
            />
          </div>
        </QuestionCard>
      ) : null}

      <Disclosure
        label="Mini-lexique Meta"
        hint="Ce que nous allons regarder dans tes données Meta"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {lexique.map((item) => (
            <MetricCard key={item.term} term={item.term} meaning={item.meaning} />
          ))}
        </div>
      </Disclosure>

      </SectionBlock>

      <SectionBlock
        eyebrow="Bloc 3"
        title="Results et suivi"
        description="Ce que Meta compte comme résultat, et ce qui est réellement mesuré après le clic."
      >
      <QuestionCard
        number="Results"
        status="required"
        error={
          showErrors &&
          !resultsMissing &&
          (
            results.length === 0 ||
            (results.includes("autre") && !resultsAutre.trim()) ||
            (results.includes("inconnu") && (state.files[SLOT.metaResults]?.length ?? 0) === 0)
          )
            ? results.length === 0
              ? "Indique ce que compte la colonne Results, ou signale que tu ne trouves pas la donnée."
              : results.includes("autre") && !resultsAutre.trim()
                ? "Précise ce que compte la colonne Results."
                : "Ajoute une capture de la colonne Results, ou indique que tu ne trouves pas cette donnée."
            : undefined
        }
        title="Results — Résultats"
        description="Dans Meta, la colonne Results — Résultats indique le nombre d'actions obtenues selon l'objectif de la campagne."
      >
        <div className="space-y-4">
          <ThreeSeconds>
            Ce que tu as réellement obtenu : des prospects, des clics, des messages ou des ventes.
          </ThreeSeconds>
          <MultiChoiceGroup
            label="Que compte exactement la colonne Results dans tes campagnes ?"
            values={results}
            onToggle={toggleResult}
            options={[
              { value: "clic", label: "Un clic" },
              { value: "vue-landing", label: "Une vue de landing page" },
              { value: "message", label: "Un message" },
              { value: "lead", label: "Un lead" },
              { value: "formulaire", label: "Un formulaire rempli" },
              { value: "achat", label: "Un achat-conversion" },
              { value: "plusieurs", label: "Plusieurs résultats selon les campagnes" },
              { value: "autre", label: "Autre" },
              { value: "inconnu", label: "Je ne sais pas" },
            ]}
            columns={2}
          />
          {results.includes("autre") ? (
            <TextAnswer
              label="Précise ce que compte la colonne Results"
              value={resultsAutre}
              onChange={setResultsAutre}
            />
          ) : null}
          {results.includes("inconnu") ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-body">
                Pas de souci : dépose simplement une capture de la colonne Results — Résultats,
                nous la lirons pour toi.
              </p>
              <FileUploader
                slot={SLOT.metaResults}
                label="Dépose une capture de la colonne Results"
                accept="image/*,.pdf"
              />
            </div>
          ) : null}
          <WhyNote>
            Sans cette précision, un « résultat » peut signifier des choses très différentes d'une
            campagne à l'autre.
          </WhyNote>
          <OptionToggle
            label="Je ne trouve pas cette donnée"
            checked={resultsMissing}
            onToggle={toggleResultsMissing}
          />
        </div>
      </QuestionCard>

      <QuestionCard
        number="Suivi"
        status="required"
        error={showErrors && !tracking ? "Indique si tu connais le système de suivi Meta installé." : undefined}
        title="Sais-tu si un système de suivi Meta est installé sur la landing page ?"
        help={{
          title: "Aide",
          body: (
            <>
              Tu peux avoir entendu parler du Meta Pixel — Pixel Meta ou de la Conversions API —
              API de conversions. Si ces termes ne te disent rien, sélectionne simplement : Je ne
              sais pas.
            </>
          ),
        }}
      >
        <div className="space-y-4">
          <ChoiceGroup
            label="Suivi des conversions Meta"
            value={tracking}
            onChange={setTracking}
            options={[
              { value: "oui", label: "Oui" },
              { value: "non", label: "Non" },
              { value: "pas-sur", label: "Je pense que oui mais je ne suis pas sûr" },
              { value: "inconnu", label: "Je ne sais pas" },
            ]}
          />
          <WhyNote>
            Pour savoir si Meta mesure uniquement le clic publicitaire ou également ce que la
            personne fait ensuite.
          </WhyNote>
        </div>
      </QuestionCard>


      </SectionBlock>

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
