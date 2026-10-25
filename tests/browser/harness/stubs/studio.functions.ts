import { record } from "./calls";

export type StudioAnalysis = {
  id: string;
  type: "constat" | "hypothese" | "recommandation" | "note";
  title: string;
  body: string;
  visibility: "client" | "internal";
  createdAt: string;
};

export async function saveStudioAnalysis(input: unknown) {
  record("saveStudioAnalysis", input);
  return { ok: true as const, data: null };
}

export async function deleteStudioAnalysis(input: unknown) {
  record("deleteStudioAnalysis", input);
  return { ok: true as const, data: null };
}

export async function qualifyStudioSubmission(input: unknown) {
  record("qualifyStudioSubmission", input);
  return { ok: true as const, data: null };
}

export async function reviewStudioMetric(input: unknown) {
  record("reviewStudioMetric", input);
  return { ok: true as const, data: null };
}

/** Lecture (non comptée comme enregistrement). */
export async function getStudioFileUrl(input: unknown) {
  record("read:getStudioFileUrl", input);
  return { ok: false as const, error: "stub" };
}
