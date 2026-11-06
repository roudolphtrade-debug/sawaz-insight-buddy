import logoOnDark from "@/assets/sawaz-pilot-logo-on-dark.png";
import logoOnLight from "@/assets/sawaz-pilot-logo-on-light.png";
import { cn } from "@/lib/utils";

/**
 * Signature Sawaz Pilot : logo officiel Sawaz (non recoloré, non déformé) + « PILOT »
 * en signature typographique. `tone` choisit la version du logo selon le fond.
 */
export function SawazPilotMark({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  const onDark = tone === "dark";
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <img
        src={onDark ? logoOnDark : logoOnLight}
        alt="Sawaz"
        width={onDark ? 519 : 1706}
        height={onDark ? 280 : 914}
        className="h-9 w-auto object-contain"
      />
      <span
        className={cn(
          "border-l pl-3 font-display text-sm font-bold tracking-[0.32em]",
          onDark ? "border-white/20 text-white" : "border-border-strong text-foreground",
        )}
      >
        PILOT
      </span>
    </span>
  );
}
