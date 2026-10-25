import { record } from "./calls";

export type ReviewSummary = Record<string, unknown>;

declare global {
  interface Window {
    /** Restitutions renvoyées par la lecture, fixées par la page de harnais. */
    __reviews?: ReviewSummary[];
  }
}

/** Lecture (non comptée comme enregistrement). */
export async function listClientReviews(input: unknown) {
  record("read:listClientReviews", input);
  return { ok: true as const, data: window.__reviews ?? [] };
}

export async function createReview(input: unknown) {
  record("createReview", input);
  return { ok: false as const, error: "stub" };
}
