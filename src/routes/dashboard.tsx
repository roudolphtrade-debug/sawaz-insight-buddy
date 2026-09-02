import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import logoAsset from "@/assets/logo-sawaz.png.asset.json";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Sawaz Client Intelligence" },
      {
        name: "description",
        content: "Live account intelligence: risk scores, relationship health, alerts, and AI briefs for every client in your book.",
      },
      { property: "og:title", content: "Dashboard — Sawaz Client Intelligence" },
      {
        property: "og:description",
        content: "Live account intelligence: risk scores, relationship health, alerts, and AI briefs for every client in your book.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Tone = "bad" | "warn" | "good";

interface TimelineItem {
  time: string;
  text: string;
  tone: Tone;
}

interface Client {
  id: string;
  initials: string;
  name: string;
  segment: string;
  owner: string;
  risk: number;
  health: number;
  churn: string;
  nextTouch: string;
  tone: Tone;
  signal: string;
  spark: number[];
  aiBrief: string;
  timeline: TimelineItem[];
}

const clients: Client[] = [
  {
    id: "meridian",
    initials: "ML",
    name: "Meridian Logistics",
    segment: "Enterprise",
    owner: "A. Reyes",
    risk: 91,
    health: 31,
    churn: "High",
    nextTouch: "Overdue",
    tone: "bad",
    signal: "Churn signal · 3 invoices overdue",
    spark: [35, 42, 38, 55, 60, 74, 91],
    aiBrief:
      "Payment behavior has deteriorated for three consecutive cycles while support escalations doubled. Renewal is in 45 days — sequence an executive sponsor call this week with a revised payment plan on the table.",
    timeline: [
      { time: "2h ago", text: "Invoice #4412 marked overdue (2nd notice)", tone: "bad" },
      { time: "1d ago", text: "Support escalation opened by ops lead", tone: "warn" },
      { time: "4d ago", text: "Champion response time slipped to 3 days", tone: "warn" },
      { time: "2w ago", text: "QBR rescheduled by client", tone: "warn" },
    ],
  },
  {
    id: "kromwell",
    initials: "KH",
    name: "Kromwell Health",
    segment: "Enterprise",
    owner: "L. Fontaine",
    risk: 81,
    health: 44,
    churn: "High",
    nextTouch: "3d",
    tone: "bad",
    signal: "Budget freeze announced internally",
    spark: [40, 44, 52, 58, 63, 70, 81],
    aiBrief:
      "An internal budget freeze plus procurement turnover points to a competitive review. Two open escalations remain unresolved — close them before the 18th, when the renewal window opens.",
    timeline: [
      { time: "5h ago", text: "Procurement head departed the account", tone: "bad" },
      { time: "2d ago", text: "Escalation #118 still open (11 days)", tone: "bad" },
      { time: "6d ago", text: "Usage down 18% week over week", tone: "warn" },
      { time: "3w ago", text: "Annual contract review noted on calendar", tone: "good" },
    ],
  },
  {
    id: "northwind",
    initials: "NP",
    name: "Northwind Pharma",
    segment: "Mid-market",
    owner: "D. Osei",
    risk: 64,
    health: 64,
    churn: "Medium",
    nextTouch: "1d",
    tone: "warn",
    signal: "Stale comms · 9 days no touch",
    spark: [30, 34, 38, 42, 50, 58, 64],
    aiBrief:
      "Nine days without a touchpoint is the longest silence this account has shown. Usage is steady, so the relationship — not the product — needs attention. Book a working session, not a check-in call.",
    timeline: [
      { time: "9d ago", text: "Last logged touchpoint (email, no reply)", tone: "warn" },
      { time: "2w ago", text: "Seat utilization dipped below 60%", tone: "warn" },
      { time: "1mo ago", text: "QBR completed · action items logged", tone: "good" },
    ],
  },
  {
    id: "volt",
    initials: "VE",
    name: "Volt Energy Group",
    segment: "Enterprise",
    owner: "M. Castellanos",
    risk: 58,
    health: 71,
    churn: "Medium",
    nextTouch: "2d",
    tone: "warn",
    signal: "Key contact changed roles",
    spark: [25, 30, 33, 40, 44, 52, 58],
    aiBrief:
      "Your economic buyer moved to a new division. Map the replacement within 10 days and re-anchor the value story with the new stakeholder before budget planning closes.",
    timeline: [
      { time: "1d ago", text: "Champion listed a new role on LinkedIn", tone: "warn" },
      { time: "5d ago", text: "Expansion pilot in division B on track", tone: "good" },
      { time: "2w ago", text: "Security review passed", tone: "good" },
    ],
  },
  {
    id: "velmora",
    initials: "VR",
    name: "Velmora Retail",
    segment: "Mid-market",
    owner: "D. Osei",
    risk: 47,
    health: 68,
    churn: "Medium",
    nextTouch: "5d",
    tone: "warn",
    signal: "Pricing queries spiked this week",
    spark: [22, 26, 30, 34, 38, 43, 47],
    aiBrief:
      "Three pricing questions in one week from two different stakeholders suggests a benchmarking exercise. Prepare a value recap with usage outcomes before they ask for a discount.",
    timeline: [
      { time: "6h ago", text: "Pricing page visited 4 times", tone: "warn" },
      { time: "3d ago", text: "New stakeholder added to workspace", tone: "good" },
      { time: "2w ago", text: "Support CSAT 9/10", tone: "good" },
    ],
  },
  {
    id: "cascade",
    initials: "CR",
    name: "Cascade Retail",
    segment: "Enterprise",
    owner: "A. Reyes",
    risk: 22,
    health: 88,
    churn: "Low",
    nextTouch: "7d",
    tone: "good",
    signal: "Expansion likely · +2 seats",
    spark: [40, 36, 32, 30, 27, 24, 22],
    aiBrief:
      "Two new teams activated organically and seat utilization is at 94%. Present the expansion quote at next week's touchpoint — the timing window is open now.",
    timeline: [
      { time: "3h ago", text: "2 seats requested by analytics team", tone: "good" },
      { time: "2d ago", text: "Champion shared internal success story", tone: "good" },
      { time: "1w ago", text: "Usage up 23% month over month", tone: "good" },
    ],
  },
  {
    id: "bluefin",
    initials: "BA",
    name: "Bluefin Advisory",
    segment: "SMB",
    owner: "L. Fontaine",
    risk: 12,
    health: 91,
    churn: "Low",
    nextTouch: "14d",
    tone: "good",
    signal: "Healthy · NPS 9",
    spark: [28, 24, 22, 20, 17, 14, 12],
    aiBrief:
      "Strongest account in the book this quarter. NPS 9 and zero open issues — a good moment to ask for a referral into their partner network.",
    timeline: [
      { time: "1d ago", text: "NPS survey returned: 9", tone: "good" },
      { time: "1w ago", text: "Renewal signed 60 days early", tone: "good" },
      { time: "3w ago", text: "Feature request shipped (reporting)", tone: "good" },
    ],
  },
  {
    id: "hexal",
    initials: "HX",
    name: "Hexal Systems",
    segment: "Mid-market",
    owner: "M. Castellanos",
    risk: 35,
    health: 76,
    churn: "Low",
    nextTouch: "4d",
    tone: "good",
    signal: "Onboarding complete · adoption rising",
    spark: [52, 48, 44, 42, 39, 37, 35],
    aiBrief:
      "Post-onboarding adoption is trending up and the admin is engaged. Keep cadence weekly until utilization crosses 70%, then shift to expansion motion.",
    timeline: [
      { time: "8h ago", text: "Weekly active users crossed 60%", tone: "good" },
      { time: "4d ago", text: "Admin completed certification", tone: "good" },
      { time: "2w ago", text: "Onboarding milestone 4/4 done", tone: "good" },
    ],
  },
];

const toneDot: Record<Tone, string> = { bad: "bg-bad", warn: "bg-warn", good: "bg-good" };
const toneText: Record<Tone, string> = { bad: "text-bad", warn: "text-warn", good: "text-good" };
const toneRing: Record<Tone, string> = { bad: "ring-bad/40", warn: "ring-warn/40", good: "ring-good/40" };

function Dashboard() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("meridian");
  const [tab, setTab] = useState<"all" | "at-risk">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (tab === "at-risk" && c.tone === "good") return false;
      if (!q) return true;
      return [c.name, c.owner, c.segment, c.signal].join(" ").toLowerCase().includes(q);
    });
  }, [query, tab]);

  const selected = clients.find((c) => c.id === selectedId) ?? clients[0]!;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased">
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="Sawaz logo" className="h-7 w-7 rounded-full bg-foreground/90 object-contain p-1" />
            <span className="font-display text-sm font-bold tracking-tight">Sawaz</span>
          </Link>
          <nav className="hidden items-center gap-5 text-[13px] text-muted-foreground md:flex">
            <span className="font-medium text-foreground">Clients</span>
            <span className="cursor-pointer transition-colors hover:text-foreground">Alerts</span>
            <span className="cursor-pointer transition-colors hover:text-foreground">Reports</span>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="glass hidden rounded-full px-3 py-1 text-[11px] text-muted-foreground sm:block">
              Updated 2 min ago
            </span>
            <Link to="/" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
              Back to site
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* KPI STRIP */}
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
            <p className="mt-2 font-display text-3xl font-bold">$4.2M</p>
            <p className="mt-1 text-xs text-muted-foreground">contracted ARR exposed</p>
          </div>
        </div>

        {/* LIST + DETAIL */}
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {/* CLIENT LIST */}
          <div className="glass rounded-2xl p-4 lg:col-span-2">
            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients, owners, signals…"
                className="w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="mt-3 flex gap-1 rounded-lg border border-border bg-background/60 p-1">
              <button
                onClick={() => setTab("all")}
                className={`flex-1 rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                  tab === "all" ? "bg-card font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All clients
              </button>
              <button
                onClick={() => setTab("at-risk")}
                className={`flex-1 rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                  tab === "at-risk" ? "bg-card font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                At risk
              </button>
            </div>

            <div className="mt-3 divide-y divide-border border-t border-border">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex w-full items-center gap-3 px-2 py-3 text-left transition-colors hover:bg-secondary/50 ${
                    selected.id === c.id ? "bg-secondary/60" : ""
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 font-display text-[11px] font-bold ring-1 ${toneRing[c.tone]} ${
                      c.tone === "bad" ? "text-bad" : "text-primary"
                    }`}
                  >
                    {c.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {c.segment} · {c.owner}
                    </span>
                  </span>
                  <span className={`font-display text-sm font-bold ${toneText[c.tone]}`}>{c.risk}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">No clients match “{query}”.</p>
              )}
            </div>
          </div>

          {/* DETAIL */}
          <div className="glass rounded-2xl p-5 lg:col-span-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 font-display text-sm font-bold ring-1 ${toneRing[selected.tone]} ${
                    selected.tone === "bad" ? "text-bad" : "text-primary"
                  }`}
                >
                  {selected.initials}
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selected.segment} · Owner {selected.owner}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  selected.tone === "bad"
                    ? "bg-bad/15 text-bad"
                    : selected.tone === "warn"
                      ? "bg-warn/15 text-warn"
                      : "bg-good/15 text-good"
                }`}
              >
                {selected.tone === "bad" ? "Critical" : selected.tone === "warn" ? "Watch" : "Stable"}
              </span>
            </div>

            {/* SCORES */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Risk</p>
                <p className={`mt-1 font-display text-3xl font-bold ${toneText[selected.tone]}`}>
                  {selected.risk}
                  <span className="text-sm font-medium text-muted-foreground">/100</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Health</p>
                <p className="mt-1 font-display text-3xl font-bold">
                  {selected.health}
                  <span className="text-sm font-medium text-muted-foreground">/100</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Churn risk</p>
                <p className="mt-1 font-display text-3xl font-bold">{selected.churn}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Next touch</p>
                <p className="mt-1 font-display text-3xl font-bold">{selected.nextTouch}</p>
              </div>
            </div>

            {/* SPARK BARS */}
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Risk trend · 7 weeks</p>
              <div className="mt-3 flex h-16 items-end gap-1.5">
                {selected.spark.map((v, i) => (
                  <span
                    key={i}
                    className={`flex-1 rounded-sm ${i === selected.spark.length - 1 ? toneDot[selected.tone] : "bg-primary/35"}`}
                    style={{ height: `${v}%` }}
                  />
                ))}
              </div>
            </div>

            {/* AI BRIEF */}
            <div className="mt-6 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">AI insight</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">{selected.aiBrief}</p>
            </div>

            {/* TIMELINE */}
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Recent activity</p>
              <div className="mt-3 space-y-2.5">
                {selected.timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${toneDot[t.tone]}`} />
                    <span className="flex-1 text-foreground/85">{t.text}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex gap-3 border-t border-border pt-4">
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
                Create action
              </button>
              <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary">
                Export brief
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
