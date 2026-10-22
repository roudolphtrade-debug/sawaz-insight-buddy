import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";

import { SawazPilotMark } from "@/components/brand/PilotMark";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { DataStatus } from "@/lib/tenant/types";

/** Bouton de déconnexion de l'en-tête Studio : visible desktop/mobile, jamais silencieux en cas d'échec. */
function SignOutButton() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setBusy(true);
    setError(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      await navigate({ to: "/auth", replace: true });
    } catch {
      setBusy(false);
      setError("La déconnexion a échoué. Réessayez.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised/70 px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut className="size-4" aria-hidden="true" />
        {busy ? "Déconnexion…" : "Se déconnecter"}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const navLink =
  "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium text-[var(--nav-muted)] transition hover:bg-white/5 hover:text-[var(--nav-foreground)]";
const navActive = { className: "bg-white/10 text-[var(--nav-foreground)]" };

/** Navigation principale Sawaz Pilot (Vue d'ensemble · Clients · Missions · Collectes). */
function PilotNav() {
  return (
    <nav aria-label="Navigation principale" className="flex gap-1 overflow-x-auto lg:flex-col">
      <Link
        to="/studio"
        activeOptions={{ exact: true }}
        activeProps={navActive}
        className={navLink}
      >
        Vue d’ensemble
      </Link>
      <Link to="/studio" activeProps={navActive} className={navLink}>
        Clients
      </Link>
      <span aria-disabled="true" className={cn(navLink, "cursor-not-allowed opacity-60 hover:bg-transparent")}>
        Missions
        <span className="rounded border border-white/15 px-1.5 text-[0.625rem] tracking-wide uppercase">
          bientôt
        </span>
      </span>
      <Link to="/collecte" className={navLink}>
        Collectes
      </Link>
    </nav>
  );
}

/** Coque Sawaz Pilot : navigation sombre bleu nuit, zone de travail claire, identique pour tous les clients. */
export function StudioShell({
  title,
  subtitle,
  actions,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("pilot min-h-screen lg:flex", className)}>
      <aside className="flex flex-col gap-4 bg-[var(--nav)] px-4 py-4 text-[var(--nav-foreground)] lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:gap-8 lg:py-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/studio" aria-label="Sawaz Pilot — accueil" className="rounded-md">
            <SawazPilotMark tone="dark" />
          </Link>
          <div className="lg:hidden">
            <SignOutButton />
          </div>
        </div>
        <PilotNav />
        <div className="mt-auto hidden lg:block">
          <SignOutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            {actions}
          </div>

          <div className="mt-6 space-y-5">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function Panel({
  title,
  eyebrow,
  children,
  className,
  aside,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <section className={cn("surface-panel p-5 sm:p-6", className)}>
      {title || eyebrow ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            {eyebrow ? <p className="text-eyebrow text-sawaz">{eyebrow}</p> : null}
            {title ? (
              <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
            ) : null}
          </div>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

const statusTone = {
  disponible: "gold",
  partiel: "sawaz",
  indisponible: "neutral",
  facultatif: "neutral",
} as const;

const statusLabel: Record<DataStatus, string> = {
  disponible: "Disponible",
  partiel: "Partiel",
  indisponible: "Non disponible",
  facultatif: "Facultatif",
};

export function DataStatusBadge({ status }: { status: DataStatus }) {
  return <StatusBadge tone={statusTone[status]}>{statusLabel[status]}</StatusBadge>;
}
