export type StepId = "introduction" | "youtube" | "contenus" | "meta" | "validation";

export type Step = {
  id: StepId;
  index: number;
  label: string;
  shortLabel: string;
  to: string;
  summary: string;
};

export const STEPS: Step[] = [
  {
    id: "introduction",
    index: 1,
    label: "Introduction",
    shortLabel: "Intro",
    to: "/collecte/",
    summary: "Phase 1 · Étape 2 — première vague de données YouTube + Meta.",
  },
  {
    id: "youtube",
    index: 2,
    label: "YouTube",
    shortLabel: "YouTube",
    to: "/collecte/youtube",
    summary: "Mode de transmission, export ou captures, et lexique YouTube.",
  },
  {
    id: "contenus",
    index: 3,
    label: "Contenus",
    shortLabel: "Contenus",
    to: "/collecte/contenus",
    summary: "Fonction des vidéos, Guide VIP, 10 vidéos, sources de trafic.",
  },
  {
    id: "meta",
    index: 4,
    label: "Meta",
    shortLabel: "Meta",
    to: "/collecte/meta",
    summary: "Période, objectifs, destination, résultats et suivi Meta.",
  },
  {
    id: "validation",
    index: 5,
    label: "Validation",
    shortLabel: "Validation",
    to: "/collecte/validation",
    summary: "Fin de la première vague et envoi des éléments.",
  },
];

export const getStep = (id: StepId): Step => STEPS.find((s) => s.id === id)!;

export const stepNeighbours = (id: StepId) => {
  const i = STEPS.findIndex((s) => s.id === id);
  return { previous: STEPS[i - 1] ?? null, next: STEPS[i + 1] ?? null };
};
