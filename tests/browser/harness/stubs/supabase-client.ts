import { record } from "./calls";

/** Tout accès au client Supabase est journalisé : le test exige qu'il n'y en ait aucun. */
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      record(`supabase.${String(prop)}`);
      return undefined;
    },
  },
);
