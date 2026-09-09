import { Outlet, createFileRoute } from "@tanstack/react-router";
import { CollectionProvider } from "@/lib/collection/store";

export const Route = createFileRoute("/collecte")({
  component: CollecteLayout,
});

function CollecteLayout() {
  return (
    <CollectionProvider>
      <Outlet />
    </CollectionProvider>
  );
}