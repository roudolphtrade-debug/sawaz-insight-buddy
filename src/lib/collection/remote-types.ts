import type { AnswerValue } from "./types";

/** Types partagés client/serveur pour la collecte réelle (aucune dépendance serveur). */

export type RemoteFile = {
  id: string;
  slot: string;
  name: string;
  size: number;
  mime: string;
  uploadedAt: string;
};

export type RemoteSnapshot = {
  clientName: string;
  collectionId: string;
  submissionId: string;
  status: "working" | "submitted";
  submittedAt: string | null;
  answers: Record<string, AnswerValue>;
  files: RemoteFile[];
};
