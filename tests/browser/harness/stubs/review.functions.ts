import { record } from "./calls";

export type ReviewSummary = Record<string, unknown>;

/** Lecture (non comptée comme enregistrement). */
export async function listClientReviews(input: unknown) {
  record("read:listClientReviews", input);
  return { ok: true as const, data: [] };
}

export async function createReview(input: unknown) {
  record("createReview", input);
  return { ok: false as const, error: "stub" };
}
