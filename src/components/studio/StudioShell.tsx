import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { SawazPilotMark } from "@/components/brand/PilotMark";
import { CardHeader } from "@/components/studio/DossierUI";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toneClass, type SectionTone } from "@/lib/studio/sections";
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

const navSoon = cn(navLink, "cursor-not-allowed opacity-60 hover:bg-transparent");

function SoonBadge() {
  return (
    <span className="rounded border border-white/15 px-1.5 text-[0.625rem] tracking-wide uppercase">
      bientôt
    </span>
  );
}

/**
 * Navigation principale Sawaz Pilot. « Clients » est l'unique entrée active (liste et
 * dossiers) ; Missions et Collectes n'ont pas encore d'écran Pilot dédié : l'ancien lien
 * « Collectes » ouvrait le formulaire des répondants, hors de l'espace interne.
 */
function PilotNav() {
  return (
    <nav aria-label="Navigation principale" className="flex gap-1 overflow-x-auto lg:flex-col">
      <Link to="/studio" activeProps={navActive} className={navLink}>
        Clients
      </Link>
      <span aria-disabled="true" className={navSoon}>
        Missions
        <SoonBadge />
      </span>
      <span aria-disabled="true" className={navSoon}>
        Collectes
        <SoonBadge />
      </span>
    </nav>
  );
}

/** Coque Sawaz Pilot : navigation sombre bleu nuit, zone de travail claire, identique pour tous les clients. */
export function StudioShell({
  title,
  subtitle,
  meta,
  actions,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Badges affichés à côté du titre (ex. rôle de l'utilisateur). */
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("pilot min-h-screen lg:flex", className)}>
      <aside className="flex flex-col gap-4 bg-[var(--nav)] px-4 py-4 text-[var(--nav-foreground)] lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:shrink-0 lg:gap-8 lg:py-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/studio" aria-label="Sawaz Pilot · accueil" className="rounded-md">
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

      {/* Canevas large : jusqu'à 1480 px utiles, marges réduites, textes longs bornés. */}
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-7 lg:py-6 2xl:px-10">
        <div className="mx-auto w-full max-w-[1480px]" data-pilot-canvas>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.75rem]">
                  {title}
                </h1>
                {meta}
              </div>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            {actions}
          </div>

          <div className="mt-4 space-y-4">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Carte de section Pilot : en-tête commun (icône, surtitre, titre, explication, action). */
export function Panel({
  title,
  eyebrow,
  description,
  icon,
  tone,
  children,
  className,
  aside,
}: {
  title?: string;
  eyebrow?: string;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: SectionTone;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "surface-panel p-4 sm:p-5",
        tone ? cn("section-accent", toneClass(tone)) : null,
        className,
      )}
    >
      {title || eyebrow ? (
        <div className="mb-4">
          <CardHeader
            icon={icon}
            tone={tone}
            eyebrow={eyebrow}
            title={title}
            description={description}
            aside={aside}
          />
        </div>
      ) : null}
      {children}
    </section>
  );
}

const statusTone = {
  disponible: "success",
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
