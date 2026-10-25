/**
 * Pages de test navigateur, routeur TanStack sur l'historique du navigateur. Les
 * fonctions serveur et le client Supabase sont remplacés par des stubs journalisés.
 *
 * - `/studio/lftc` : page minimale (vrais `DossierTabs`, `AnalysesPanel`, `ReviewsPanel`).
 * - `/plein/studio/lftc` : dossier complet (`StudioShell` + `DossierView`, styles réels),
 *   données LFTC ; `/rempli/studio/lftc` ajoute indicateurs, analyses et restitutions.
 */
import "@/styles.css";

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
import { DossierView } from "@/components/studio/DossierView";
import { ReviewsPanel } from "@/components/studio/ReviewsPanel";
import { StudioShell } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";

import { lftcDossier, lftcReviews } from "./dossier-fixture";

const basepath = ["/plein", "/rempli"].find((p) => location.pathname.startsWith(`${p}/`));
const rempli = basepath === "/rempli";
if (rempli) window.__reviews = lftcReviews;

function FullDossier() {
  const dossier = lftcDossier(rempli);
  return (
    <StudioShell
      title={dossier.client.name}
      subtitle={dossier.client.sector ?? undefined}
      meta={<StatusBadge tone="sawaz">Propriétaire</StatusBadge>}
    >
      <DossierView dossier={dossier} clientSlug="lftc" />
    </StudioShell>
  );
}

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
  component: basepath ? FullDossier : Dossier,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([dossierRoute]),
  ...(basepath ? { basepath } : {}),
});
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
