import { Lock } from "lucide-react";

import { BrandHeader } from "@/components/BrandHeader";

/**
 * Lien ou session refusés par le serveur (absents, expirés, révoqués, épuisés) : la
 * collecte est entièrement bloquée — jamais un « mode hors ligne » qui laisserait
 * croire que la saisie sera enregistrée. Message volontairement non technique : le
 * motif précis n'est jamais affiché.
 */
export function SessionInvalidScreen() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background/85">
        <BrandHeader />
      </div>
      <main className="collecte-shell px-4 pt-10 pb-16 sm:px-5 sm:pt-16">
        <section
          role="alert"
          aria-live="assertive"
          className="surface-panel mx-auto max-w-xl p-6 sm:p-8"
        >
          <div className="flex items-start gap-4">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-raised text-muted-foreground"
              aria-hidden="true"
            >
              <Lock className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-eyebrow text-primary">Accès sécurisé</p>
              <h1 className="mt-1 font-display text-xl font-extrabold text-foreground sm:text-2xl">
                Ce lien n'est plus actif
              </h1>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-body">
                <p>
                  Pour protéger tes données, l'accès à cette collecte passe par un lien sécurisé
                  personnel. Celui-ci a expiré ou n'est plus valide.
                </p>
                <p>
                  Ouvre le dernier lien que tu as reçu de l'équipe Sawaz, ou demande-lui un nouveau
                  lien. Les réponses déjà enregistrées ne sont pas perdues.
                </p>
                <p className="font-semibold text-foreground">
                  Tant que tu n'as pas rouvert un lien valide, rien de ce que tu saisirais ici ne
                  pourrait être enregistré.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
