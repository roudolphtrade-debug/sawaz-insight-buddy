import type { RemoteSnapshot } from "./remote-types";
import type { AnswerValue, CollectionState, FileMeta } from "./types";

/**
 * Conversion pure d'un snapshot serveur vers l'état de collecte partagé.
 * Aucune dépendance navigateur ni serveur : réutilisable à la fois par
 * l'interface (affichage, reprise) et par la validation de soumission
 * côté serveur, pour éviter toute divergence entre les deux.
 */
export function stateFromSnapshot(snapshot: RemoteSnapshot): CollectionState {
  const files: Record<string, FileMeta[]> = {};
  for (const f of snapshot.files) {
    const meta: FileMeta = {
      id: f.id,
      remoteId: f.id,
      name: f.name,
      size: f.size,
      type: f.mime,
      addedAt: new Date(f.uploadedAt).getTime(),
    };
    (files[f.slot] ??= []).push(meta);
  }
  return {
    version: 1,
    answers: snapshot.answers as Record<string, AnswerValue>,
    files,
    submittedAt: snapshot.submittedAt ? new Date(snapshot.submittedAt).getTime() : null,
  };
}
