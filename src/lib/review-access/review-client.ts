/**
 * Pass 3F ÔÇö Contrat client-safe de la surface Strategic Review.
 * Ce module est importable c├┤t├® navigateur : il ne contient que des types.
 * Tout ce qui n'appara├«t pas ici ne peut pas atteindre le client (analyses
 * internes, notes, m├®triques rejet├®es, fichiers bruts, versions non publi├®es).
 */

import type { ReviewChart, ReviewContent } from "@/lib/studio/review-content";

export type ReviewClientTheme = {
  name: string;
  brand: Record<string, string>;
  tokens: Record<string, string>;
};

export type ReviewClientPayload = {
  reviewTitle: string;
  versionNo: number;
  publishedAt: string;
  content: ReviewContent;
  charts: ReviewChart[];
  theme: ReviewClientTheme;
};
