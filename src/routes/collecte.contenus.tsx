import { createFileRoute } from "@tanstack/react-router";

import { ChoiceGroup } from "@/components/ChoiceGroup";
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
import {
  useBoolAnswer,
  useSingleChoice,
  useTextAnswer,
} from "@/lib/collection/store";
import { stepNeighbours } from "@/lib/steps";

export const Route = createFileRoute("/collecte/contenus")({
  head: () => ({
    meta: [
      { title: "Contenus YouTube — Rôle des vidéos LFTC" },
      {
        name: "description",
        content:
          "Fonction des vidéos, zoom Guide VIP, 10 vidéos récentes, sources de trafic et nouveaux spectateurs vs spectateurs récurrents.",
      },
      { property: "og:title", content: "Contenus YouTube — Rôle des vidéos LFTC" },
      {
        property: "og:description",
        content: "Distinguer les vidéos qui attirent, celles qui accompagnent les membres LFTC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContenusScreen,
});

const ouiNon = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];

function ContenusScreen() {
  const { previous, next } = stepNeighbours("contenus");
  const [membresVideos, setMembresVideos] = useSingleChoice(K.contenus.membresVideos);
  const [membresDetail, setMembresDetail] = useTextAnswer(K.contenus.membresDetail);
  const [guideVipMissing, toggleGuideVipMissing] = useBoolAnswer(K.contenus.guideVipMissing);
  const [skipDixVideos, toggleSkipDixVideos] = useBoolAnswer(K.contenus.skipDixVideos);
  const [traffic, setTraffic] = useSingleChoice(K.contenus.traffic);
  const [newReturning, setNewReturning] = useSingleChoice(K.contenus.newReturning);

  return (
    <StepLayout
      step="contenus"
      title="Toutes les vidéos n'ont pas le même rôle"
      intro="Certaines vidéos servent à faire découvrir LFTC. D'autres servent surtout à construire la confiance ou à accompagner les membres déjà présents. Nous voulons éviter de comparer des vidéos qui n'ont pas le même objectif."
    >
      <QuestionCard
        number="Question 01"
        status="optional"
        title="Certaines vidéos de ta chaîne sont-elles principalement destinées aux membres déjà présents dans LFTC ?"
      >
        <div className="space-y-4">
          <ChoiceGroup
            label="Vidéos destinées aux membres"
            value={membresVideos}
            onChange={setMembresVideos}
            options={[...ouiNon, { value: "inconnu", label: "Je ne sais pas exactement" }]}
          />
          {membresVideos === "oui" ? (
            <TextAnswer
              long
              label="Peux-tu nous indiquer les principales ?"
              help={"Pas besoin de faire une liste exhaustive.\nIndique simplement les principales vidéos dont tu sais qu'elles servent surtout aux membres déjà présents.\nExemple : Guide pour les membres du groupe privé LFTC."}
              value={membresDetail}
              onChange={setMembresDetail}
            />
          ) : null}
        </div>
      </QuestionCard>

      <QuestionCard
        number="Zoom Guide VIP"
        title="Un zoom particulier sur ton Guide VIP"
        optional
        description="Nous avons identifié la vidéo « Guide pour les membres du groupe privé LFTC » comme un contenu particulier. Elle semble principalement servir à accompagner les membres après leur entrée dans l'écosystème. Nous voulons comprendre d'où viennent réellement ses vues."
        help={{
          title: "Important mais non bloquant",
          body: "Cette demande est importante mais ne doit pas bloquer le formulaire. Si tu ne trouves pas l'écran, coche simplement l'option.",
        }}
      >
        <div className="space-y-4">
          <PathHint
            steps={[
              "YouTube Studio",
              "Content — Contenu",
              "Guide pour les membres du groupe privé LFTC",
              "Analytics",
              "Reach — Couverture",
              "How viewers find this video — Comment les spectateurs trouvent cette vidéo",
            ]}
          />
          <ThreeSeconds>
            Est-ce YouTube qui fait découvrir cette vidéo, ou est-elle surtout regardée depuis
            Telegram / LFTC ?
          </ThreeSeconds>
          <WhyNote>
            Cela nous permettra de savoir si YouTube sert ici d'outil d'acquisition ou
            d'infrastructure pédagogique pour les membres.
          </WhyNote>
          <FileUploader
            slot={SLOT.guideVip}
            label="Dépose une capture de cet écran"
            accept="image/*,.pdf"
          />
          <OptionToggle
            label="Je ne trouve pas cette donnée"
            checked={guideVipMissing}
            onToggle={toggleGuideVipMissing}
          />
        </div>
      </QuestionCard>

      <QuestionCard
        number="Sources de trafic"
        status="optional"
        title="Comment les gens trouvent-ils tes vidéos ?"
        description="YouTube peut notamment distinguer : YouTube Search — Recherche YouTube, Suggested Videos — Vidéos suggérées, Browse Features — Accueil / navigation, External — Sources externes. Cela nous aide à comprendre si LFTC dépend surtout de son audience actuelle ou si YouTube commence réellement à le recommander à de nouvelles personnes."
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-foreground">
            Peux-tu voir la rubrique : « How viewers find your content/video — Comment les
            spectateurs trouvent ton contenu ? »
          </p>
          <ChoiceGroup
            label="Sources de trafic disponibles"
            value={traffic}
            onChange={setTraffic}
            options={[...ouiNon, { value: "inconnu", label: "Je ne sais pas" }]}
          />
          {traffic === "oui" ? (
            <FileUploader
              slot={SLOT.traffic}
              label="Dépose une capture de cet écran"
              accept="image/*,.pdf"
            />
          ) : null}
        </div>
      </QuestionCard>

      <SectionBlock
        eyebrow="Données complémentaires"
        title="Si tu as le temps et l'accès"
        description="Ces éléments sont utiles mais facultatifs. Ne bloque pas dessus."
      >
      <QuestionCard
        number="10 vidéos récentes"
        title="Un dernier zoom sur les vidéos que nous avons déjà étudiées"
        optional
        description="Nous avons déjà analysé publiquement tes 10 vidéos récentes : titres, miniatures, vues publiques, commentaires, sujets, plusieurs appels à l'action. Nous ne te redemandons donc pas ces informations. Il nous manque uniquement les données invisibles publiquement."
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-body">
            Pour chaque vidéo, si cela est simple pour toi :
          </p>
          <PathHint steps={["YouTube Studio", "Content", "Choisir la vidéo", "Analytics"]} />
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              term="Reach — Couverture"
              meaning="Comment la vidéo a-t-elle été découverte ?"
            />
            <MetricCard
              term="Engagement"
              meaning="Combien de temps a-t-elle réellement retenu les spectateurs ?"
            />
            <MetricCard
              term="Audience Retention — Rétention d'audience"
              meaning="Où les spectateurs ont-ils commencé à décrocher ?"
            />
          </div>
          <FileUploader
            slot={SLOT.dixVideos}
            label="Tu peux déposer toutes les captures ici en une seule fois"
            accept="image/*,.pdf"
          />
          <OptionToggle
            label="Je préfère ne pas faire cette partie maintenant"
            checked={skipDixVideos}
            onToggle={toggleSkipDixVideos}
          />
        </div>
      </QuestionCard>

      <QuestionCard
        number="New vs Returning Viewers"
        status="optional"
        title="Nouveaux spectateurs vs spectateurs qui reviennent"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              term="New Viewers — Nouveaux spectateurs"
              meaning="Personnes qui découvrent la chaîne."
            />
            <MetricCard
              term="Returning Viewers — Spectateurs récurrents"
              meaning="Personnes qui avaient déjà regardé la chaîne et qui reviennent."
            />
          </div>
          <WhyNote>
            Pour savoir si YouTube agit surtout comme moteur d'acquisition ou comme moteur de
            fidélisation.
          </WhyNote>
          <PathHint steps={["YouTube Studio", "Analytics", "Audience"]} title="Où" />
          <p className="text-sm font-semibold text-foreground">As-tu accès à cette donnée ?</p>
          <ChoiceGroup
            label="Accès à New vs Returning Viewers"
            value={newReturning}
            onChange={setNewReturning}
            options={[...ouiNon, { value: "introuvable", label: "Je ne la trouve pas" }]}
          />
          {newReturning === "oui" ? (
            <FileUploader
              slot={SLOT.newReturning}
              label="Dépose une capture"
              accept="image/*,.pdf"
            />
          ) : null}
        </div>
      </QuestionCard>

      </SectionBlock>

      <section className="surface-panel p-5 sm:p-6">
        <p className="text-eyebrow text-primary">Fin YouTube</p>
        <h2 className="mt-2 font-display text-lg font-bold text-foreground">
          YouTube : c'est bon.
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-body">
          <p>Avec ces éléments, nous pourrons commencer à vérifier :</p>
          <ul className="space-y-1">
            <li>→ si YouTube apporte réellement moins de volume mais davantage de qualité ;</li>
            <li>→ quelles vidéos servent à attirer ;</li>
            <li>→ lesquelles construisent la confiance ;</li>
            <li>→ lesquelles servent à accompagner les membres déjà présents.</li>
          </ul>
          <p>Passons maintenant à Meta.</p>
        </div>
      </section>

      <SawazCallout title="Rappel">
        Tu ne trouves pas une donnée ? Ne perds pas de temps. Indique simplement qu'elle n'est pas
        disponible et continue.
      </SawazCallout>

      <NavigationFooter previous={previous} next={next} nextLabel="Continuer vers Meta" />
    </StepLayout>
  );
}
