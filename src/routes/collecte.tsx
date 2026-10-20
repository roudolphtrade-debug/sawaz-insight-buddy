import { Outlet, createFileRoute, retainSearchParams } from "@tanstack/react-router";
import { SessionInvalidScreen } from "@/components/SessionInvalidScreen";
import { CollectionProvider, useCollection } from "@/lib/collection/store";
import { useCollectionNavGuard } from "@/lib/collection/useCollectionNavGuard";

type CollecteSearch = {
  demo?: "1";
};

export const Route = createFileRoute("/collecte")({
  validateSearch: (search: Record<string, unknown>): CollecteSearch =>
    search["demo"] === 1 || search["demo"] === "1" ? { demo: "1" } : {},
  search: {
    middlewares: [retainSearchParams(["demo"])],
  },
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: CollecteLayout,
});

function CollecteLayout() {
  const { demo } = Route.useSearch();
  const demoMode = demo === "1";

  return (
    <CollectionProvider demoMode={demoMode}>
      {demoMode ? (
        <div
          role="status"
          className="border-b border-primary/35 bg-primary/10 px-4 py-2.5 text-center text-xs font-semibold leading-relaxed text-foreground"
        >
          <span className="font-extrabold uppercase tracking-[0.16em] text-primary">
            Mode démonstration
          </span>
          <span className="mx-2 text-muted-foreground">·</span>
          Les informations saisies ici restent dans ce navigateur et ne sont jamais envoyées à Sawaz.
        </div>
      ) : null}
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
