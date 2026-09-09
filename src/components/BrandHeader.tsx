import { LftcLogo, SawazMark } from "@/components/brand/Logos";

type BrandHeaderProps = {
  /** Short context line, e.g. "Diagnostic digital · 2026". */
  context?: string;
};

export function BrandHeader({ context = "Diagnostic digital · 2026" }: BrandHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:flex sm:justify-between sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <LftcLogo />
          <span className="hidden h-8 w-px bg-border-strong md:block" aria-hidden="true" />
          <span className="hidden text-xs font-medium text-muted-foreground md:block">
            {context}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[0.625rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Accompagné par
          </span>
          <SawazMark />
        </div>
      </div>
    </header>
  );
}
