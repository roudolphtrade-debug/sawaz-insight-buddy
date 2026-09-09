export type AnswerValue = string | string[] | boolean | null;

export type FileMeta = {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: number;
  /** Identifiant serveur une fois le fichier rattaché à la submission. */
  remoteId?: string;
  /** Upload en cours vers le bucket privé. */
  pending?: boolean;
  /** Message d'erreur d'envoi (format, taille, réseau…). */
  error?: string;
};

export type CollectionState = {
  version: 1;
  answers: Record<string, AnswerValue>;
  files: Record<string, FileMeta[]>;
  submittedAt: number | null;
};

export const emptyState: CollectionState = {
  version: 1,
  answers: {},
  files: {},
  submittedAt: null,
};
