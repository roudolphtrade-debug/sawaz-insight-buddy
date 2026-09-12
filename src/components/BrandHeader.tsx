import { LftcLogo, SawazMark } from "@/components/brand/Logos";

type BrandHeaderProps = {
  /** Short context line, e.g. "Diagnostic digital · 2026". */
  context?: string;
};

export function BrandHeader({ context = "Diagnostic digital · 2026" }: BrandHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3 sm:px-8 sm:py-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <LftcLogo />
          <span className="hidden h-8 w-px bg-border-strong md:block" aria-hidden="true" />
          <span className="hidden text-xs font-medium text-muted-foreground md:block">
            {context}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border bg-surface/65 p-1.5 pl-3">
          <span className="hidden whitespace-nowrap text-[0.625rem] font-semibold tracking-[0.14em] text-body uppercase sm:block">
            Accompagné par
          </span>
          <SawazMark className="[&_img]:h-7 sm:[&_img]:h-8" />
        </div>
      </div>
    </header>
  );
}
