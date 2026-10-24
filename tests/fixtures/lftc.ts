import type { Classification, StudioQualification } from "../../src/lib/studio/qualification";
import type { StudioFile, StudioSubmission } from "../../src/lib/studio/studio.functions";

/** Forme du dossier LFTC (7 submissions, 31 documents) et qualifications initiales P3.5-A2. */
export function qualification(
  classification: Classification,
  includedInAnalysis = false,
  respondentLabel: string | null = null,
): StudioQualification {
  return {
    id: `q-${classification}-${respondentLabel ?? "anon"}`,
    classification,
    includedInAnalysis,
    respondentLabel,
    attributionSource: respondentLabel ? "manual_sawaz" : "unknown",
    reason: null,
    qualifiedBy: null,
    qualifiedAt: "2026-10-24T10:00:00Z",
  };
}

const slots = [
  "yt.capture.overview",
  "yt.export",
  "c.guideVip",
  "m.export",
  "m.results",
  "x.autre",
];

function files(submissionId: string, n: number): StudioFile[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${submissionId}-f${i}`,
    slot: slots[i % slots.length] ?? "x.autre",
    name: `document-${i + 1}.png`,
    size: 1.2 * 1024 * 1024,
    mime: "image/png",
    uploadedAt: "2026-10-21T11:30:00Z",
    scanStatus: "clean",
    isImage: true,
  }));
}

function submission(
  id: string,
  submittedAt: string | null,
  answers: number,
  fileCount: number,
  q: StudioQualification | null,
  collectionId = "9b42c950",
): StudioSubmission {
  return {
    id,
    collectionId,
    projectName: "Diagnostic LFTC",
    status: submittedAt ? "submitted" : "working",
    submittedAt,
    updatedAt: submittedAt ?? "2026-10-20T08:00:00Z",
    respondent: null,
    respondentEmail: null,
    answers: Array.from({ length: answers }, (_, i) => ({
      key: `q.${i}`,
      value: "oui",
      notFound: false,
    })),
    files: files(id, fileCount),
    qualification: q,
  };
}

export function lftcSubmissions(): StudioSubmission[] {
  return [
    submission(
      "96203894-0000-4000-8000-000000000001",
      "2026-09-09T20:32:00Z",
      12,
      3,
      qualification("historical"),
    ),
    submission(
      "4e4e7ef9-0000-4000-8000-000000000002",
      "2026-09-09T21:34:00Z",
      14,
      1,
      qualification("historical"),
    ),
    submission("f7c57492-a2a6-491a-aedd-b21d7f2ab3c0", null, 18, 1, qualification("draft")),
    submission(
      "1391bbdc-0000-4000-8000-000000000004",
      "2026-10-18T03:30:00Z",
      14,
      3,
      qualification("historical"),
    ),
    submission(
      "a045f0ff-0000-4000-8000-000000000005",
      "2026-10-18T23:32:00Z",
      16,
      6,
      qualification("historical"),
    ),
    submission(
      "831da37a-661e-424b-9449-9e77edf3908f",
      "2026-10-21T11:39:00Z",
      14,
      16,
      qualification("reference", true, "Raphaël"),
    ),
    submission(
      "86b0c97e-3be6-4702-b6bc-7e6c5eac2227",
      "2026-10-21T20:13:00Z",
      13,
      1,
      qualification("excluded"),
      "3101bc6c",
    ),
  ];
}
