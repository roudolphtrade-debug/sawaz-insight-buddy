import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

/**
 * Point d'entrée de Sawaz Pilot : jamais une page de démonstration. Utilisateur
 * authentifié → `/studio` (la session est revérifiée par `_authenticated`), sinon
 * `/auth`. L'ancien tableau de bord fictif reste accessible à `/dashboard`, hors du
 * parcours normal.
 */
export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sawaz Pilot" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/studio" : "/auth", replace: true });
  },
  component: () => null,
});
