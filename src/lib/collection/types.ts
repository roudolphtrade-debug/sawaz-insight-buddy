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
  /** Message d'erreur d'envoi (format, taille, réseau…). `undefined` explicite pour
   *  effacer une erreur précédente lors d'une reprise réussie (`exactOptionalPropertyTypes`). */
  error?: string | undefined;
  /**
   * Nature de l'échec, pour piloter l'action proposée à l'utilisateur :
   * - "rejected" : contenu/format/taille refusés — il faut supprimer et remplacer le fichier.
   * - "missing" : objet explicitement confirmé absent du stockage ; ré-envoi possible si la
   *   copie locale existe, sinon nouvelle sélection nécessaire.
   * - "temporary" : erreur réseau/serveur non concluante — nouvelle tentative possible
   *   sur le même chemin de stockage.
   */
  errorReason?: "rejected" | "missing" | "temporary" | undefined;
  /**
   * Chemin de stockage attribué dès l'obtention du ticket d'upload, conservé même en cas
   * d'échec ultérieur : permet de reprendre la confirmation sans recréer d'objet en double.
   */
  uploadPath?: string;
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
