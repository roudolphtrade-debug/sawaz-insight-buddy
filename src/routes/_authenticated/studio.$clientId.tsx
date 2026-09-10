import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/studio/$clientId")({
  component: StudioClientLayout,
});

function StudioClientLayout() {
  return <Outlet />;
}