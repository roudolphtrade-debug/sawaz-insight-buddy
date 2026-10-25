/**
 * Dossier LFTC de démonstration pour le harnais : forme réelle du corpus (7 réponses,
 * une référence « Raphaël », 31 documents). `rempli` ajoute indicateurs et analyses pour
 * vérifier aussi les états non vides. Données de test uniquement, jamais lues en base.
 */
import type { ReviewSummary } from "../../../src/lib/studio/review.functions";
import type { StudioDossier } from "../../../src/lib/studio/studio.functions";
import { lftcSubmissions } from "../../fixtures/lftc";

export function lftcDossier(rempli: boolean): StudioDossier {
  return {
    client: { id: "client-lftc", slug: "lftc", name: "LFTC", sector: "Média · divertissement" },
    projects: [
      {
        id: "project-lftc",
        name: "Diagnostic LFTC",
        periodLabel: "Vague 1 · automne 2026",
        status: "active",
      },
    ],
    collections: [
      {
        id: "9b42c950",
        projectId: "project-lftc",
        status: "open",
        openedAt: "2026-09-07T09:00:00Z",
        createdAt: "2026-09-06T16:00:00Z",
      },
      {
        id: "3101bc6c",
        projectId: "project-lftc",
        status: "open",
        openedAt: null,
        createdAt: "2026-10-21T08:30:00Z",
      },
    ],
    submissions: lftcSubmissions(),
    metrics: rempli
      ? [
          {
            id: "m1",
            submissionId: "831da37a-661e-424b-9449-9e77edf3908f",
            metricKey: "Abonnés YouTube",
            platform: "YouTube",
            valueNum: 48200,
            valueText: null,
            unit: "abonnés",
            periodStart: "2026-07-01",
            periodEnd: "2026-09-30",
            provenance: "capture_ocr",
            sourceFileId: null,
            sourceFileName: "document-1.png",
            confidence: 0.92,
            reviewStatus: "a_verifier",
            originalValueNum: null,
            originalValueText: null,
            reviewNote: null,
            correctedAt: null,
          },
          {
            id: "m2",
            submissionId: "831da37a-661e-424b-9449-9e77edf3908f",
            metricKey: "Dépenses Meta",
            platform: "Meta",
            valueNum: 1250,
            valueText: null,
            unit: "€",
            periodStart: "2026-09-01",
            periodEnd: "2026-09-30",
            provenance: "manual",
            sourceFileId: null,
            sourceFileName: null,
            confidence: null,
            reviewStatus: "valide",
            originalValueNum: null,
            originalValueText: null,
            reviewNote: null,
            correctedAt: null,
          },
        ]
      : [],
    analyses: rempli
      ? [
          {
            id: "a1",
            type: "constat",
            title: "Audience YouTube concentrée sur deux formats",
            body: "Les vidéos longues et les extraits live portent l’essentiel des vues.",
            visibility: "client",
            collectionId: null,
            submissionId: null,
            updatedAt: "2026-10-22T09:00:00Z",
          },
          {
            id: "a2",
            type: "note",
            title: "Vérifier l’export Meta",
            body: "Export partiel, à redemander au client.",
            visibility: "internal",
            collectionId: null,
            submissionId: null,
            updatedAt: "2026-10-22T09:30:00Z",
          },
        ]
      : [],
    role: "owner",
    qualificationsAvailable: true,
  };
}

const review = (id: string, createdAt: string, versions: number): ReviewSummary => ({
  id,
  clientId: "client-lftc",
  projectId: "project-lftc",
  projectName: "Diagnostic LFTC",
  collectionId: "9b42c950",
  status: "draft",
  publishedAt: null,
  currentVersionId: null,
  createdAt,
  versions: Array.from({ length: versions }, (_, i) => ({
    id: `${id}-v${i + 1}`,
    versionNo: i + 1,
    status: "draft",
    createdAt,
    updatedAt: createdAt,
    approvedAt: null,
    publishedAt: null,
  })),
});

/** Deux restitutions de la même mission et collecte : une principale, une en historique. */
export const lftcReviews: ReviewSummary[] = [
  review("review-2", "2026-10-23T14:05:00Z", 2),
  review("review-1", "2026-10-22T10:00:00Z", 1),
];
