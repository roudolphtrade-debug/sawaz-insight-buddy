import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import sawazLogo from "@/assets/logo-sawaz.png";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import type { DataStatus } from "@/lib/tenant/types";

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
            <img
              src={sawazLogo}
              alt="Sawaz"
              className="h-9 w-9 rounded-xl bg-foreground/90 object-contain p-1"
            />
            <span className="leading-tight">
              <span className="block font-display text-sm font-extrabold text-foreground">
                Results Studio
              </span>
              <span className="text-eyebrow text-sawaz">Interne Sawaz</span>
            </span>
          </Link>

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
