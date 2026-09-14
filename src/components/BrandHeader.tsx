import { LftcLogo, SawazMark } from "@/components/brand/Logos";

type BrandHeaderProps = {
  /** Short context line, e.g. "Sawaz Décodage". */
  context?: string;
};

/**
 * Contenu de l'en-tête uniquement — sans fond, bordure ni position propres : il est
 * placé par `StepLayout` dans la même structure fixe que la jauge compacte
 * (`ProgressBar`), qui porte seule le `sticky`/fond/bordure partagés (une seule zone
 * fixe, sans valeur `top` codée en dur).
 */
export function BrandHeader({ context = "Sawaz Décodage" }: BrandHeaderProps) {
  return (
    <header>
      {/* `flex-wrap` + `justify-center` par défaut : si l'espace vient à manquer (très
          petit écran, zoom élevé), l'en-tête s'empile proprement au lieu de déborder ou
          de comprimer les logos. `lg:flex-nowrap` garantit une seule ligne à partir de
          1024px (logo LFTC, intitulé, séparateur, bloc Sawaz), où l'espace disponible
          est toujours suffisant une fois ce mode forcé. */}
      <div className="collecte-shell flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-3 sm:justify-between sm:px-5 sm:py-4 lg:flex-nowrap">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {/* Légende propre au logo (« Décodage stratégique LFTC ») masquée ici : elle
              ferait doublon avec l'intitulé `context` juste à côté, et alourdit
              inutilement la largeur de l'en-tête. Logo modérément réduit (h-8 au lieu
              de h-9) pour la même raison — voir Logos.tsx pour le composant partagé,
              non modifié (utilisé aussi par Studio). */}
          <LftcLogo className="[&>span]:hidden [&_img]:h-7 sm:[&_img]:h-8" />
          <span className="hidden h-8 w-px bg-border-strong md:block" aria-hidden="true" />
          <span className="hidden text-xs font-medium text-muted-foreground md:block">
            {context}
          </span>
        </div>
        {/* Plus d'encadré ici (bordure/fond/arrondi retirés) : seule la plaque blanche
            propre à `SawazMark` (voir Logos.tsx, inchangé) reste visible, nécessaire à
            la lisibilité du logo — le reste s'intègre directement à l'en-tête, sans
            ressembler à un bouton ou une carte cliquable. */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden whitespace-nowrap text-[0.625rem] font-semibold tracking-[0.14em] text-body uppercase sm:block">
            Accompagné par
          </span>
          <SawazMark className="[&_img]:h-7 sm:[&_img]:h-8" />
        </div>
      </div>
    </header>
  );
}
