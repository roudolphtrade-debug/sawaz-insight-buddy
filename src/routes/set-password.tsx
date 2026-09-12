import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { SawazMark } from "@/components/brand/Logos";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/set-password")({
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!active) return;

      if (sessionError || !data.session) {
        setHasSession(false);
        setError(
          "Le lien d’invitation n’est plus valide ou la session a expiré."
        );
      } else {
        setHasSession(true);
      }

      setChecking(false);
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (session) {
        setHasSession(true);
        setError(null);
        setChecking(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setBusy(false);
      setError(updateError.message);
      return;
    }

    const { error: claimError } = await supabase.rpc("claim_team_access");

    if (claimError) {
      setBusy(false);
      setError(
        "Le mot de passe est enregistré, mais l’accès équipe n’a pas pu être activé."
      );
      return;
    }

    await navigate({ to: "/studio", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <SawazMark />
          <span className="leading-tight">
            <span className="block font-display text-sm font-extrabold text-foreground">
              Results Studio
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Activation de votre accès
            </span>
          </span>
        </div>

        <form onSubmit={submit} className="glass rounded-2xl space-y-4 p-6">
          <h1 className="font-display text-xl font-extrabold text-foreground">
            Choisir votre mot de passe
          </h1>

          <p className="text-sm text-muted-foreground">
            Finalisez votre accès à l’équipe Sawaz.
          </p>

          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              Nouveau mot de passe
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              Confirmer le mot de passe
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || checking || !hasSession}
            className="w-full rounded-lg bg-sawaz px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {checking
              ? "Vérification..."
              : busy
                ? "Activation..."
                : "Activer mon accès"}
          </button>

          {!checking && !hasSession ? (
            <button
              type="button"
              onClick={() => navigate({ to: "/auth" })}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Retour à la connexion
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
