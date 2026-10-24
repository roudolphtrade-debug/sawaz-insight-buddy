/** `useServerFn` : renvoie la fonction stub telle quelle (aucun réseau). */
export function useServerFn<T>(fn: T): T {
  return fn;
}
