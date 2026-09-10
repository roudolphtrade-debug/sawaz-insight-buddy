import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import sawazLogo from "@/assets/logo-sawaz.png";
import { BLOCK_LABEL, type ReviewBlockKind } from "@/lib/studio/review-content";
import type { ReviewChart, ReviewContent } from "@/lib/studio/review-content";
import type { EligibleMetric, ReviewTheme } from "@/lib/studio/review.functions";
import { cn } from "@/lib/utils";

/**
 * Preview Client — rendu exact de la future Sawaz Strategic Review.
 * Thème dynamique : les tokens viennent du tenant (clients.theme_tokens),
 * aucun client n'est codé en dur. Ne reçoit que du matériel client-safe.
 */

const TOKEN_MAP: Record<string, string> = {
  background: "--background",
  surface: "--surface",
  surfaceRaised: "--surface-raised",
  foreground: "--foreground",
  mutedForeground: "--muted-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  accent: "--sawaz",
  accentForeground: "--sawaz-foreground",
  border: "--border",
  borderStrong: "--border-strong",
  radius: "--radius",
};

function themeStyle(tokens: Record<string, string>): CSSProperties {
  const style: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(TOKEN_MAP)) {
    const value = tokens[key];
    if (value) style[cssVar] = value;
  }
  style['backgroundColor'] = "var(--background)";
  style['color'] = "var(--foreground)";
  return style as CSSProperties;
}

const KIND_STYLE: Record<ReviewBlockKind, string> = {
  fait: "border-l-primary",
  interpretation: "border-l-sawaz",
  hypothese: "border-l-[var(--border-strong)]",
  recommandation: "border-l-success",
};

const KIND_CHIP: Record<ReviewBlockKind, string> = {
  fait: "bg-primary/15 text-primary",
  interpretation: "bg-sawaz/15 text-sawaz",
  hypothese: "bg-surface-raised text-muted-foreground",
  recommandation: "bg-success/15 text-success",
};

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel p-5 sm:p-7">
      <p className="text-eyebrow text-primary">{eyebrow}</p>
      <h2 className="mt-1 font-display text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ReviewPreview({
  content,
  charts,
  theme,
  metrics,
  showProvenance = true,
}: {
  content: ReviewContent;
  charts: ReviewChart[];
  theme: ReviewTheme;
  metrics: EligibleMetric[];
  /** La traçabilité vers les métriques sources est visible en interne. */
  showProvenance?: boolean;
}) {
  const metricLabel = new Map(metrics.map((m) => [m.id, m.metricKey] as const));
  const group = (kind: ReviewBlockKind) => content.blocks.filter((b) => b.kind === kind);
  const logo = theme.brand['logoUrl'];

  return (
    <div style={themeStyle(theme.tokens)} className="rounded-xl border border-border">
      <header className="border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          {logo ? (
            <img src={logo} alt={theme.brand['logoAlt'] ?? theme.name} className="h-9 w-auto" />
          ) : (
            <span className="font-display text-lg font-extrabold text-primary">{theme.name}</span>
          )}
          <div className="flex items-center gap-3">
            <span className="hidden text-eyebrow text-muted-foreground sm:block">
              Accompagné par
            </span>
            <img src={sawazLogo} alt="Sawaz" className="h-8 w-8 rounded-full bg-foreground/90 object-contain p-1" />
          </div>
        </div>
      </header>

      <div className="space-y-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-eyebrow text-primary">Sawaz Strategic Review</p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {content.title || "Strategic Review"}
          </h1>
          {content.periodLabel ? (
            <p className="mt-2 text-sm text-muted-foreground">{content.periodLabel}</p>
          ) : null}
        </div>

        <Section eyebrow="Synthèse" title="Executive Summary">
          <p className="whitespace-pre-line text-base leading-relaxed text-foreground">
            {content.executiveSummary || "—"}
          </p>
        </Section>

        {(["fait", "interpretation", "hypothese", "recommandation"] as ReviewBlockKind[]).map(
          (kind) => {
            const blocks = group(kind);
            if (blocks.length === 0) return null;
            return (
              <Section key={kind} eyebrow={BLOCK_LABEL[kind]} title={`${BLOCK_LABEL[kind]}s`}>
                <ul className="space-y-3">
                  {blocks.map((b) => (
                    <li
                      key={b.id}
                      className={cn(
                        "rounded-lg border border-border border-l-2 bg-surface-raised p-4",
                        KIND_STYLE[kind],
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-eyebrow",
                          KIND_CHIP[kind],
                        )}
                      >
                        {BLOCK_LABEL[kind]}
                      </span>
                      <p className="mt-2 font-semibold text-foreground">{b.title}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                        {b.body}
                      </p>
                      {showProvenance && b.sourceMetricIds.length > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Source :{" "}
                          {b.sourceMetricIds.map((id) => metricLabel.get(id) ?? id).join(", ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Section>
            );
          },
        )}

        {charts.length > 0 ? (
          <Section eyebrow="Graphiques" title="Lecture des données validées">
            <div className="grid gap-6 lg:grid-cols-2">
              {charts.map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-surface-raised p-4">
                  <p className="text-sm font-semibold text-foreground">{c.title}</p>
                  <div className="mt-3 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      {c.type === "line" ? (
                        <LineChart data={c.points}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
                          <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                          <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              background: "var(--surface-raised)",
                              border: "1px solid var(--border-strong)",
                              borderRadius: 8,
                              color: "var(--foreground)",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="var(--primary)"
                            strokeWidth={2}
                          />
                        </LineChart>
                      ) : (
                        <BarChart data={c.points}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
                          <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                          <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              background: "var(--surface-raised)",
                              border: "1px solid var(--border-strong)",
                              borderRadius: 8,
                              color: "var(--foreground)",
                            }}
                          />
                          <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  {showProvenance ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Métriques sources :{" "}
                      {c.sourceMetricIds.map((id) => metricLabel.get(id) ?? id).join(", ")} ·
                      période {c.periodStart ?? "—"} → {c.periodEnd ?? "—"} · généré le{" "}
                      {new Date(c.generatedAt).toLocaleDateString("fr-FR")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {content.actions.length > 0 ? (
          <Section eyebrow="Prochaines actions" title="Ce que nous proposons de faire ensuite">
            <ol className="space-y-3">
              {content.actions.map((a, i) => (
                <li key={a.id} className="rounded-lg border border-border bg-surface-raised p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {i + 1}. {a.label}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.detail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pilote : {a.owner} {a.horizon ? `· ${a.horizon}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {content.cta.type !== "aucun" && content.cta.label ? (
          <section className="surface-panel flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
            <div>
              <p className="font-display text-base font-bold text-foreground">
                {content.cta.label}
              </p>
              {content.cta.helper ? (
                <p className="mt-1 text-sm text-muted-foreground">{content.cta.helper}</p>
              ) : null}
            </div>
            <span className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {content.cta.label}
            </span>
          </section>
        ) : null}
      </div>
    </div>
  );
}
