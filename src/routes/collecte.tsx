import { Outlet, createFileRoute } from "@tanstack/react-router";
import { SessionInvalidScreen } from "@/components/SessionInvalidScreen";
import { CollectionProvider, useCollection } from "@/lib/collection/store";
import { useCollectionNavGuard } from "@/lib/collection/useCollectionNavGuard";

export const Route = createFileRoute("/collecte")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: CollecteLayout,
});

function CollecteLayout() {
  return (
    <CollectionProvider>
      <GuardedOutlet />
    </CollectionProvider>
  );
}

/** Séparé de `CollecteLayout` : `useCollectionNavGuard` a besoin du contexte
 *  `useCollection()`, donc doit être rendu à l'intérieur de `<CollectionProvider>`.
 *  Un lien ou une session refusés par le serveur bloquent toute la collecte. */
function GuardedOutlet() {
  useCollectionNavGuard();
  const { scopeStatus } = useCollection();
  if (scopeStatus === "invalid") return <SessionInvalidScreen />;
  return <Outlet />;
}
