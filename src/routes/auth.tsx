import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import logoAsset from "@/assets/logo-sawaz.png.asset.json";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion équipe — Sawaz Results Studio" },
      {
        name: "description",
        content:
          "Accès réservé à l’équipe Sawaz : connexion sécurisée au Results Studio interne multi-client.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    setBusy(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    if (data.session) {
      await navigate({ to: "/studio", replace: true });
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <img src={logoAsset.url} alt="Sawaz" className="h-10 w-10 rounded-full bg-foreground/90 object-contain p-1" />
          <span className="leading-tight">
            <span className="block font-display text-sm font-extrabold text-foreground">
              Results Studio
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Accès équipe Sawaz
            </span>
          </span>
        </div>

        <form onSubmit={submit} className="glass rounded-2xl space-y-4 p-6">
          <h1 className="font-display text-xl font-extrabold text-foreground">
            Connexion
          </h1>

          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              Email professionnel
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              Mot de passe
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

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer rounded-lg bg-sawaz px-4 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
          >
            {busy ? "Un instant..." : "Se connecter"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Premier accès ? Utilisez le lien d’invitation reçu par email.
          </p>
        </form>
      </div>
    </div>
  );
}
