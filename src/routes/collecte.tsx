import { Outlet, createFileRoute } from "@tanstack/react-router";
import { CollectionProvider } from "@/lib/collection/store";
import { useCollectionNavGuard } from "@/lib/collection/useCollectionNavGuard";

export const Route = createFileRoute("/collecte")({
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
 *  `useCollection()`, donc doit être rendu à l'intérieur de `<CollectionProvider>`. */
function GuardedOutlet() {
  useCollectionNavGuard();
  return <Outlet />;
}
