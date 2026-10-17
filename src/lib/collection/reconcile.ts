import type { AnswerValue, CollectionState, FileMeta } from "./types";

/**
 * Réconciliation pure entre l'état serveur et les modifications locales non encore
 * confirmées (voir `store.tsx`). Le serveur reste la source de vérité pour tout ce
 * qu'il a confirmé ; une modification locale jamais confirmée, elle, n'est jamais
 * écrasée silencieusement par une valeur serveur : elle est réaffichée et renvoyée.
 */

/**
 * File d'envoi après reprise : les réponses non confirmées persistées localement
 * (session précédente, rechargement, fermeture) complètent la file en mémoire, qui
 * l'emporte toujours (saisie plus récente dans cette page).
 */
export function replayUnconfirmedAnswers(
  persisted: Record<string, AnswerValue>,
  inMemory: Record<string, AnswerValue>,
): Record<string, AnswerValue> {
  return { ...persisted, ...inMemory };
}

/**
 * Réponses encore non confirmées après le succès d'un lot : une clé n'en sort que si
 * la valeur confirmée est exactement celle encore attendue (même référence) — une
 * saisie plus récente faite pendant l'envoi reste à confirmer.
 */
export function remainingUnconfirmed(
  unconfirmed: Record<string, AnswerValue>,
  confirmedBatch: Record<string, AnswerValue>,
): Record<string, AnswerValue> {
  const next: Record<string, AnswerValue> = { ...unconfirmed };
  for (const [key, value] of Object.entries(confirmedBatch)) {
    if (key in next && next[key] === value) delete next[key];
  }
  return next;
}

/**
 * Un indicateur d'envoi ou de suppression en cours relu depuis le cache local
 * (actualisation pendant l'opération) ne correspond plus à aucune requête de cette
 * page : il est levé, pour que le fichier ne reste jamais affiché « Envoi… » à vie.
 */
export function clearStaleTransfer(file: FileMeta): FileMeta {
  if (!file.pending && !file.removing) return file;
  return { ...file, pending: false, removing: false };
}

export function withoutStaleTransfers(files: CollectionState["files"]): CollectionState["files"] {
  const next: CollectionState["files"] = {};
  for (const [slot, list] of Object.entries(files)) next[slot] = list.map(clearStaleTransfer);
  return next;
}
