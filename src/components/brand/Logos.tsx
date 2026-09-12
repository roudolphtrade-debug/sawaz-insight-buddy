import lftcLogo from "@/assets/logo-lftc.png";
import sawazLogo from "@/assets/logo-sawaz.png";
import { cn } from "@/lib/utils";

/**
 * LFTC — marque cliente dominante.
 * Logo fourni, utilisé tel quel : aucune recréation, aucun étirement.
 */
export function LftcLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-3.5", className)}>
      <img
        src={lftcLogo}
        alt="LFTC"
        width={1481}
        height={211}
        className="h-7 w-auto object-contain sm:h-9"
      />
      <span className="hidden min-w-0 leading-tight sm:block">
        <span className="block text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Décodage stratégique LFTC
        </span>
      </span>
    </span>
  );
}

/**
 * Sawaz Entertainment — signature d'accompagnement, plus discrète.
 * Logo fourni tel quel, posé sur une plaque claire pour rester lisible sur fond sombre.
 */
export function SawazMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-white/15",
        className,
      )}
    >
      <img
        src={sawazLogo}
        alt="Sawaz Entertainment"
        width={210}
        height={120}
        className="h-8 w-auto object-contain"
      />
    </span>
  );
}
