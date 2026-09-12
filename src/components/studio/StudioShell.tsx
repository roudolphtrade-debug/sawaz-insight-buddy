import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";

import { SawazMark } from "@/components/brand/Logos";
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

/** Coque interne Sawaz, identique quel que soit le client consulté. */
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
    <div className={cn("min-h-screen bg-background", className)}>
      <header className="border-b border-border bg-surface/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/studio" className="flex items-center gap-3">
            <SawazMark />
            <span className="leading-tight">
              <span className="block font-display text-sm font-extrabold text-foreground">
                Results Studio
              </span>
              <span className="text-eyebrow text-sawaz">Interne Sawaz</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex items-center gap-1 rounded-xl border border-border bg-surface-raised/65 p-1 text-sm text-muted-foreground">
              <Link
                to="/studio"
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-sawaz/15 text-sawaz" }}
                className="rounded-lg px-3 py-2 font-semibold transition hover:bg-sawaz/10 hover:text-foreground"
              >
                Dossiers clients
              </Link>
              <Link
                to="/collecte"
                className="rounded-lg px-3 py-2 font-semibold transition hover:bg-sawaz/10 hover:text-foreground"
              >
                Collectes
              </Link>
            </nav>

            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions}
        </div>

        <div className="mt-8 space-y-6">{children}</div>
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
