import { createFileRoute, Link } from "@tanstack/react-router";
import logoAsset from "@/assets/logo-sawaz.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sawaz Client Intelligence — See every client before the risk hits" },
      {
        name: "description",
        content:
          "Risk scoring, relationship health, and AI account briefs for account and sales teams who carry the revenue. Sawaz Client Intelligence.",
      },
      { property: "og:title", content: "Sawaz Client Intelligence — See every client before the risk hits" },
      {
        property: "og:description",
        content: "Risk scoring, relationship health, and AI account briefs for the teams who carry the revenue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const clients = [
  { name: "Meridian Logistics", note: "Churn signal · 3 invoices overdue", score: 91, tone: "bad" },
  { name: "Northwind Pharma", note: "Stale comms · 9 days no touch", score: 64, tone: "warn" },
  { name: "Volt Energy Group", note: "Key contact changed roles", score: 58, tone: "warn" },
  { name: "Cascade Retail", note: "Expansion likely · +2 seats", score: 22, tone: "good" },
  { name: "Bluefin Advisory", note: "Healthy · NPS 9", score: 12, tone: "good" },
] as const;

const health = [
  { name: "Meridian Logistics", value: 31, tone: "bad" },
  { name: "Northwind Pharma", value: 64, tone: "warn" },
  { name: "Cascade Retail", value: 88, tone: "good" },
] as const;

const toneDot: Record<string, string> = {
  bad: "bg-bad",
  warn: "bg-warn",
  good: "bg-good",
};
const toneText: Record<string, string> = {
  bad: "text-bad",
  warn: "text-warn",
  good: "text-good",
};

function Index() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased">
      {/* NAV */}
      <header className="flex w-full items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <img src={logoAsset.url} alt="Sawaz logo" className="h-8 w-8 rounded-full bg-foreground/90 object-contain p-1" />
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Sawaz Client Intelligence
          </span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a className="transition-colors hover:text-foreground" href="#dashboard">Platform</a>
          <a className="transition-colors hover:text-foreground" href="#dashboard">Risk Engine</a>
          <a className="transition-colors hover:text-foreground" href="#dashboard">Relationship</a>
          <a className="transition-colors hover:text-foreground" href="#dashboard">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link className="text-sm text-foreground/80" to="/dashboard">Sign in</Link>
          <Link
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            to="/dashboard"
          >
            Launch app
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="night-sky relative w-full overflow-hidden">
        <div className="orb-cyan absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-80" />
        <div className="grid-floor absolute inset-x-0 bottom-0 h-40 opacity-40" />
        <div className="relative mx-auto max-w-5xl px-8 pb-28 pt-16 text-center">
          <span className="glass inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-signal rise">
            AI Client Intelligence
          </span>
          <h1 className="chrome-text mt-6 font-display text-6xl font-bold leading-[0.95] tracking-tight md:text-7xl rise-late">
            See every client
            <br />
            before the risk hits
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-foreground/70 rise-late">
            Risk scoring, relationship health and account analytics for the account &amp; sales
            teams who carry the revenue.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 rise-late">
            <Link
              className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[0_0_28px_oklch(0.705_0.131_232/35%)] transition-transform hover:-translate-y-0.5"
              to="/dashboard"
            >
              Start free pilot
            </Link>
            <Link
              className="glass rounded-full px-6 py-3 font-semibold text-foreground transition-transform hover:-translate-y-0.5"
              to="/dashboard"
            >
              See live demo
            </Link>
          </div>
        </div>
      </section>

      {/* DASHBOARD */}
      <section id="dashboard" className="relative z-10 -mt-10 w-full bg-background">
        <div className="mx-auto max-w-6xl px-8 pb-20">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Account Intelligence</h2>
              <p className="text-sm text-muted-foreground">Live view · 248 active relationships monitored</p>
            </div>
            <span className="glass rounded-full px-3 py-1 text-xs text-muted-foreground">Updated 2 min ago</span>
          </div>

          {/* KPI ROW */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Portfolio risk</p>
              <p className="mt-2 font-display text-3xl font-bold text-bad">
                68<span className="text-base font-medium text-muted-foreground">/100</span>
              </p>
              <p className="mt-1 text-xs text-bad">▲ 6 pts vs last week</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Avg relationship</p>
              <p className="mt-2 font-display text-3xl font-bold text-good">
                74<span className="text-base font-medium text-muted-foreground">/100</span>
              </p>
              <p className="mt-1 text-xs text-good">▲ 3 pts steady</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">At-risk accounts</p>
              <p className="mt-2 font-display text-3xl font-bold text-warn">12</p>
              <p className="mt-1 text-xs text-muted-foreground">of 248 monitored</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Revenue at risk</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">$4.2M</p>
              <p className="mt-1 text-xs text-muted-foreground">contracted ARR exposed</p>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* CLIENT LIST */}
            <div className="glass rounded-2xl p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-foreground">Account intelligence</h3>
                <span className="text-xs text-muted-foreground">Sorted by risk</span>
              </div>
              <div className="divide-y divide-border">
                {clients.map((c) => (
                  <div key={c.name} className="flex items-center gap-4 py-3">
                    <span className={`size-2.5 shrink-0 rounded-full ${toneDot[c.tone]}`} />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.note}</p>
                    </div>
                    <span className={`font-display text-lg font-bold ${toneText[c.tone]}`}>{c.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RISK GAUGE */}
            <div className="glass flex flex-col rounded-2xl p-5">
              <h3 className="font-display text-lg font-semibold text-foreground">Risk distribution</h3>
              <div className="chrome-ring relative mt-4 size-44 self-center rounded-full grid place-items-center">
                <div className="absolute inset-3 rounded-full bg-card" />
                <div className="relative text-center">
                  <p className="font-display text-4xl font-bold text-foreground">12</p>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">high risk</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="size-2.5 shrink-0 rounded-full bg-bad" />
                  <span className="flex-1 text-foreground/70">Critical</span>
                  <span className="font-semibold text-foreground">5</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="size-2.5 shrink-0 rounded-full bg-warn" />
                  <span className="flex-1 text-foreground/70">Elevated</span>
                  <span className="font-semibold text-foreground">7</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="size-2.5 shrink-0 rounded-full bg-good" />
                  <span className="flex-1 text-foreground/70">Stable</span>
                  <span className="font-semibold text-foreground">236</span>
                </div>
              </div>
            </div>
          </div>

          {/* HEALTH */}
          <div className="glass mt-4 rounded-2xl p-5">
            <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
              Relationship health · top accounts
            </h3>
            <div className="grid gap-5 md:grid-cols-3">
              {health.map((h) => (
                <div key={h.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-foreground/80">{h.name}</span>
                    <span className={`font-semibold ${toneText[h.tone]}`}>{h.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                    <div className={`h-full rounded-full ${toneDot[h.tone]}`} style={{ width: `${h.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <footer className="mt-14 flex items-center justify-between border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <img src={logoAsset.url} alt="" className="h-5 w-5 rounded-full bg-foreground/90 object-contain p-0.5" />
              <span className="text-sm font-semibold text-foreground/80">Sawaz</span>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 Sawaz · Client Intelligence</p>
          </footer>
        </div>
      </section>
    </div>
  );
}
