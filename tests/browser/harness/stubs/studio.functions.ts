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
