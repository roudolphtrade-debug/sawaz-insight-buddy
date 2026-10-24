/**
 * Page dossier minimale pour le test navigateur : vrais `DossierTabs`, `useDossierTab`,
 * `AnalysesPanel` et `ReviewsPanel`, routeur TanStack sur l'historique du navigateur.
 * Les fonctions serveur et le client Supabase sont remplacés par des stubs journalisés.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import { AnalysesPanel } from "@/components/studio/AnalysesPanel";
import { DossierTabs, useDossierTab } from "@/components/studio/DossierTabs";
import { ReviewsPanel } from "@/components/studio/ReviewsPanel";

function Dossier() {
  const tab = useDossierTab();
  return (
    <DossierTabs
      active={tab.active}
      onSelect={tab.select}
      panels={{
        "vue-ensemble": () => <p>Corpus actif du diagnostic</p>,
        missions: () => <p>Missions et collectes</p>,
        reponses: () => (
          <div>
            <p>Réponse de référence</p>
            <button type="button">Ouvrir</button>
          </div>
        ),
        indicateurs: () => <p>Vérification des indicateurs</p>,
        analyse: () => <AnalysesPanel clientId="client-lftc" analyses={[]} canWrite />,
        restitution: () => (
          <ReviewsPanel
            clientSlug="lftc"
            clientId="client-lftc"
            projects={[{ id: "project-1", name: "Vague 1" }]}
            collections={[{ id: "collection-1", projectId: "project-1", status: "open" }]}
            canWrite
          />
        ),
      }}
    />
  );
}

const rootRoute = createRootRoute({ component: () => <Outlet /> });
const dossierRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/studio/$clientId",
  component: Dossier,
});
const router = createRouter({ routeTree: rootRoute.addChildren([dossierRoute]) });
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
