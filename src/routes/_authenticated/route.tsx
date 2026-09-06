import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Premier acc├¿s ├®quipe : active le r├┤le si l'email figure dans les invitations.
    // Sans invitation, la fonction ne fait rien (aucune ├®l├®vation possible).
    try {
      await supabase.rpc("claim_team_access");
    } catch {
      /* acc├¿s d├®j├á actif ou non invit├® : aucun impact sur la navigation */
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
