import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";

import { useCollection } from "@/lib/collection/store";
import type { Step } from "@/lib/steps";
import { cn } from "@/lib/utils";

const DEFAULT_NOTE = "Tes réponses sont enregistrées automatiquement.";

export function NavigationFooter({
  previous,
  next,
  nextLabel,
  onNext,
  onBlocked,
  blocker = null,
  busy = false,
  disabled = false,
  note,
}: {
  previous?: Step | null;
  next?: Step | null;
  nextLabel?: string;
  onNext?: (() => void) | undefined;
  onBlocked?: (() => void) | undefined;
  blocker?: string | null;
  busy?: boolean;
  disabled?: boolean;
  /** Remplace le statut d'enregistrement affiché par défaut (ex. pendant une
   *  transmission finale, où le statut pertinent n'est plus celui des réponses). */
  note?: string | undefined;
}) {
  const navigate = useNavigate();
  const { saveStatus, flushAnswers, scopeStatus, retryScopeSync } = useCollection();
  const blocked = Boolean(blocker);
  const unavailable = busy || disabled;

  const saveNote =
    note ??
    (saveStatus === "saving"
      ? "Enregistrement…"
      : saveStatus === "error"
        ? "Échec de l'enregistrement — nouvelle tentative possible."
        : saveStatus === "saved"
          ? "Enregistré."
          : DEFAULT_NOTE);

  const NoteIcon =
    saveStatus === "saving" ? LoaderCircle : saveStatus === "error" ? AlertTriangle : CheckCircle2;

  const revealErrors = () => {
    onBlocked?.();
    window.setTimeout(() => {
      document
        .querySelector('[data-question-error="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const nextClass = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-all",
    "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
    unavailable && "cursor-not-allowed opacity-50 hover:opacity-50",
  );

  return (
    <footer className="sticky bottom-0 z-30 -mx-5 mt-10 border-t border-border bg-background/95 px-5 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md sm:-mx-8 sm:px-8">
      <div className="mx-auto">
        {scopeStatus === "offline" ? (
          <div
            role="status"
            aria-live="polite"
            className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-border-strong bg-surface-raised px-3.5 py-3 text-foreground"
          >
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wide">Mode hors ligne</p>
              <p className="mt-0.5 text-sm font-semibold leading-relaxed">
                Connexion impossible pour l'instant. Tes réponses restent enregistrées sur cet
                appareil et seront transmises au serveur dès que la connexion reviendra.
              </p>
            </div>
            <button
              type="button"
              onClick={() => retryScopeSync()}
              className="shrink-0 rounded-lg border border-border-strong bg-background px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-surface"
            >
              Réessayer
            </button>
          </div>
        ) : null}

        {scopeStatus === "mismatch" ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-3 flex items-start gap-2.5 rounded-xl border border-destructive/50 bg-destructive/10 px-3.5 py-3 text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wide">Session changée</p>
              <p className="mt-0.5 text-sm font-semibold leading-relaxed">
                Cette session ne correspond plus à celle confirmée par le serveur. Ferme cette
                page et rouvre le lien de collecte que tu as reçu pour continuer.
              </p>
            </div>
          </div>
        ) : null}

        {saveStatus === "error" ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-destructive/50 bg-destructive/10 px-3.5 py-3 text-destructive"
          >
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wide">
                Échec de l'enregistrement
              </p>
              <p className="mt-0.5 text-sm font-semibold leading-relaxed">
                Une réponse n'a pas pu être enregistrée sur le serveur.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void flushAnswers()}
              className="shrink-0 rounded-lg border border-destructive/40 bg-background px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10"
            >
              Réessayer
            </button>
          </div>
        ) : null}

        {blocker ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-3 flex items-start gap-2.5 rounded-xl border border-destructive/50 bg-destructive/10 px-3.5 py-3 text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wide">Réponse requise</p>
              <p className="mt-0.5 text-sm font-semibold leading-relaxed">{blocker}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {previous ? (
            <Link
              to={previous.to}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface-raised"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="truncate">{previous.label}</span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}

          {next ? (
            <button
              type="button"
              disabled={unavailable}
              aria-disabled={blocked || unavailable}
              onClick={() => {
                if (unavailable) return;
                if (blocked) {
                  revealErrors();
                  return;
                }
                void navigate({ to: next.to });
              }}
              className={nextClass}
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              <span className="truncate">{nextLabel ?? `Continuer · ${next.label}`}</span>
              {!busy ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
            </button>
          ) : onNext ? (
            <button
              type="button"
              disabled={unavailable}
              aria-disabled={blocked || unavailable}
              onClick={() => {
                if (unavailable) return;
                if (blocked) {
                  revealErrors();
                  return;
                }
                onNext();
              }}
              className={nextClass}
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              <span className="truncate">{nextLabel ?? "Envoyer"}</span>
              {!busy ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
            </button>
          ) : null}
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <NoteIcon
            className={cn(
              "size-3.5",
              saveStatus === "error" ? "text-destructive" : "text-primary",
              saveStatus === "saving" && "animate-spin",
            )}
            aria-hidden="true"
          />
          <span>{saveNote}</span>
        </p>
      </div>
    </footer>
  );
}
