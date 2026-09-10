import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel, StudioShell } from "@/components/studio/StudioShell";
import { PublicationPanel } from "@/components/studio/PublicationPanel";
import { ReviewPreview } from "@/components/studio/ReviewPreview";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BLOCK_HINT,
  BLOCK_KINDS,
  BLOCK_LABEL,
  CTA_LABEL,
  NEXT_STATUS,
  REVIEW_STATUS_LABEL,
  type ReviewBlockKind,
  type ReviewChart,
  type ReviewContent,
  type ReviewCtaType,
  type ReviewStatus,
} from "@/lib/studio/review-content";
import {
  getReviewWorkspace,
  saveReviewVersion,
  transitionReviewVersion,
} from "@/lib/studio/review.functions";

export const Route = createFileRoute("/_authenticated/studio/$clientId/review/$reviewId")({
  head: () => ({
    meta: [
      { title: "Strategic Review Builder — Sawaz" },
      {
        name: "description",
        content:
          "Construction d'une Sawaz Strategic Review : faits, interprétations, hypothèses, recommandations et graphiques issus des métriques validées.",
      },
      { property: "og:title", content: "Strategic Review Builder — Sawaz" },
      {
        property: "og:description",
        content: "Workflow éditorial Draft → In Review → Approved → Published.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewBuilder,
});

const uid = () => crypto.randomUUID();

function ReviewBuilder() {
  const { clientId, reviewId } = Route.useParams();
  const qc = useQueryClient();
  const fetchWorkspace = useServerFn(getReviewWorkspace);
  const save = useServerFn(saveReviewVersion);
  const transition = useServerFn(transitionReviewVersion);

  const [versionId, setVersionId] = useState<string | null>(null);
  const [content, setContent] = useState<ReviewContent | null>(null);
  const [charts, setCharts] = useState<ReviewChart[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["review-workspace", reviewId, versionId],
    queryFn: () => fetchWorkspace({ data: { reviewId, versionId } }),
  });

  const ws = data?.ok ? data.data : null;

  useEffect(() => {
    if (ws) {
      setContent(ws.content);
      setCharts(ws.charts);
    }
  }, [ws?.version.id, ws?.version.updatedAt]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!ws || !content) return null;
      return save({ data: { versionId: ws.version.id, content, charts } });
    },
    onSuccess: (res) => {
      if (!res) return;
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data.forked) {
        toast.success("Version publiée immuable — nouvelle version créée");
        setVersionId(res.data.versionId);
      } else {
        toast.success("Version enregistrée");
      }
      void qc.invalidateQueries({ queryKey: ["review-workspace"] });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async (to: ReviewStatus) => {
      if (!ws) return null;
      return transition({ data: { versionId: ws.version.id, to } });
    },
    onSuccess: (res) => {
      if (!res) return;
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Statut : ${REVIEW_STATUS_LABEL[res.data.status]}`);
      if (res.data.access) {
        toast.success(
          res.data.access.notified.length > 0
            ? `Accès client ouvert — notifié : ${res.data.access.notified.join(", ")}`
            : "Accès client ouvert — aucun contact notifié",
        );
      }
      void qc.invalidateQueries({ queryKey: ["review-workspace"] });
      void qc.invalidateQueries({ queryKey: ["review-publication"] });
    },
  });

  if (isLoading || (!ws && !data)) {
    return (
      <StudioShell title="Strategic Review">
        <Panel>ChargementÔÇª</Panel>
      </StudioShell>
    );
  }

  if (!ws || !content) {
    return (
      <StudioShell title="Strategic Review">
        <Panel>
          <p className="text-sm text-destructive">
            {data && !data.ok ? data.error : "Review indisponible"}
          </p>
          <Link
            to="/studio/$clientId"
            params={{ clientId }}
            className="mt-3 inline-block text-sm text-sawaz"
          >
            Retour au dossier
          </Link>
        </Panel>
      </StudioShell>
    );
  }

  const isOwner = ws.role === "owner";
  const canWrite = isOwner || ws.role === "analyst";
  const locked = ws.version.status === "published" || ws.version.status === "archived";
  const nextStatuses = NEXT_STATUS[ws.version.status];

  const patch = (p: Partial<ReviewContent>) => setContent({ ...content, ...p });

  const addBlock = (kind: ReviewBlockKind) =>
    patch({
      blocks: [
        ...content.blocks,
        { id: uid(), kind, title: "", body: "", sourceMetricIds: [], analysisId: null },
      ],
    });

  const importAnalysis = (analysisId: string) => {
    const a = ws.analyses.find((x) => x.id === analysisId);
    if (!a) return;
    const kind: ReviewBlockKind =
      a.type === "constat" ? "fait" : a.type === "hypothese" ? "hypothese" : "recommandation";
    patch({
      blocks: [
        ...content.blocks,
        {
          id: uid(),
          kind,
          title: a.title ?? "",
          body: a.body ?? "",
          sourceMetricIds: [],
          analysisId: a.id,
        },
      ],
    });
  };

  const addChartFromMetrics = () => {
    const selected = ws.metrics.filter((m) => m.valueNum !== null).slice(0, 6);
    if (selected.length === 0) {
      toast.error("Aucune métrique validée numérique disponible");
      return;
    }
    setCharts([
      ...charts,
      {
        id: uid(),
        title: "Métriques validées",
        type: "bar",
        sourceMetricIds: selected.map((m) => m.id),
        periodStart: selected[0]?.periodStart ?? null,
        periodEnd: selected[0]?.periodEnd ?? null,
        generatedAt: new Date().toISOString(),
        points: selected.map((m) => ({
          label: m.metricKey,
          value: Number(m.valueNum),
          unit: m.unit,
          metricId: m.id,
        })),
      },
    ]);
  };

  return (
    <StudioShell
      title={`Strategic Review — ${ws.theme.name}`}
      subtitle={`${ws.review.projectName} · version ${ws.version.versionNo} · rôle : ${ws.role ?? "aucun"}`}
      actions={
        <Link
          to="/studio/$clientId"
          params={{ clientId }}
          className="text-sm text-sawaz hover:underline"
        >
          Retour au dossier
        </Link>
      }
    >
      <Panel
        eyebrow="Workflow"
        title={`Statut : ${REVIEW_STATUS_LABEL[ws.version.status]}`}
        aside={
          <div className="flex flex-wrap gap-2">
            {ws.review.versions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVersionId(v.id)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                v{v.versionNo} · {REVIEW_STATUS_LABEL[v.status]}
              </button>
            ))}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {nextStatuses.map((s) => {
            const ownerOnly = s === "published" || s === "archived";
            return (
              <Button
                key={s}
                size="sm"
                variant={s === "published" ? "default" : "outline"}
                disabled={!canWrite || (ownerOnly && !isOwner) || transitionMutation.isPending}
                onClick={() => transitionMutation.mutate(s)}
              >
                {s === "published" ? "Publier" : `Passer en ${REVIEW_STATUS_LABEL[s]}`}
              </Button>
            );
          })}
          <Button
            size="sm"
            variant="secondary"
            disabled={!canWrite || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {locked ? "Créer une nouvelle version" : "Enregistrer"}
          </Button>
          {!isOwner ? (
            <StatusBadge tone="neutral">Publication réservée au rôle owner</StatusBadge>
          ) : null}
          {locked ? (
            <StatusBadge tone="sawaz">
              Version {ws.version.status === "published" ? "publiée" : "archivée"} — immuable
            </StatusBadge>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          La publication rend la version immuable, ouvre un lien sécurisé révocable et déclenche
          une notification unique par destinataire.
        </p>
      </Panel>

      <PublicationPanel reviewId={ws.review.id} />

      <Panel eyebrow="Cadre" title="Executive Summary">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="rv-title">Titre</Label>
            <Input
              id="rv-title"
              value={content.title}
              disabled={!canWrite}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="rv-period">Période</Label>
            <Input
              id="rv-period"
              value={content.periodLabel}
              disabled={!canWrite}
              onChange={(e) => patch({ periodLabel: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="rv-summary">Synthèse</Label>
          <Textarea
            id="rv-summary"
            rows={4}
            value={content.executiveSummary}
            disabled={!canWrite}
            onChange={(e) => patch({ executiveSummary: e.target.value })}
          />
        </div>
      </Panel>

      <Panel
        eyebrow="Contenu"
        title="Fait / Interprétation / Hypothèse / Recommandation"
        aside={
          <div className="flex flex-wrap gap-2">
            {BLOCK_KINDS.map((k) => (
              <Button
                key={k}
                size="sm"
                variant="outline"
                disabled={!canWrite}
                onClick={() => addBlock(k)}
              >
                + {BLOCK_LABEL[k]}
              </Button>
            ))}
          </div>
        }
      >
        {ws.analyses.length > 0 ? (
          <div className="mb-4 rounded-lg border border-border bg-surface-raised p-3">
            <p className="text-eyebrow text-sawaz">Analyses éligibles (jamais les notes internes)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ws.analyses.map((a) => (
                <Button
                  key={a.id}
                  size="sm"
                  variant="ghost"
                  disabled={!canWrite}
                  onClick={() => importAnalysis(a.id)}
                >
                  {a.type} — {a.title ?? "sans titre"}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {content.blocks.map((b) => (
            <div key={b.id} className="rounded-lg border border-border bg-surface-raised p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <StatusBadge tone={b.kind === "fait" ? "gold" : "sawaz"}>
                    {BLOCK_LABEL[b.kind]}
                  </StatusBadge>
                  <p className="mt-1 text-xs text-muted-foreground">{BLOCK_HINT[b.kind]}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canWrite}
                  onClick={() => patch({ blocks: content.blocks.filter((x) => x.id !== b.id) })}
                >
                  Supprimer
                </Button>
              </div>
              <Input
                className="mt-3"
                placeholder="Titre"
                value={b.title}
                disabled={!canWrite}
                onChange={(e) =>
                  patch({
                    blocks: content.blocks.map((x) =>
                      x.id === b.id ? { ...x, title: e.target.value } : x,
                    ),
                  })
                }
              />
              <Textarea
                className="mt-2"
                rows={3}
                placeholder="Contenu"
                value={b.body}
                disabled={!canWrite}
                onChange={(e) =>
                  patch({
                    blocks: content.blocks.map((x) =>
                      x.id === b.id ? { ...x, body: e.target.value } : x,
                    ),
                  })
                }
              />
              <div className="mt-3">
                <p className="text-eyebrow text-muted-foreground">
                  Métriques sources (validées uniquement)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ws.metrics.map((m) => {
                    const active = b.sourceMetricIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={!canWrite}
                        onClick={() =>
                          patch({
                            blocks: content.blocks.map((x) =>
                              x.id === b.id
                                ? {
                                    ...x,
                                    sourceMetricIds: active
                                      ? x.sourceMetricIds.filter((id) => id !== m.id)
                                      : [...x.sourceMetricIds, m.id],
                                  }
                                : x,
                            ),
                          })
                        }
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          active
                            ? "border-primary text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {m.metricKey}
                      </button>
                    );
                  })}
                  {ws.metrics.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Aucune métrique validée pour l'instant.
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {content.blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun bloc pour l'instant.</p>
          ) : null}
        </div>
      </Panel>

      <Panel
        eyebrow="Graphiques"
        title="Data-driven, traçables jusqu'aux métriques sources"
        aside={
          <Button type="button" size="sm" variant="outline" disabled={!canWrite || ws.metrics.every((m) => m.valueNum === null)} onClick={addChartFromMetrics}>
            + Graphique
          </Button>
        }
      >
        <div className="space-y-3">
          {charts.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3"
            >
              <div className="min-w-[200px] flex-1">
                <Input
                  value={c.title}
                  disabled={!canWrite}
                  onChange={(e) =>
                    setCharts(
                      charts.map((x) => (x.id === c.id ? { ...x, title: e.target.value } : x)),
                    )
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.sourceMetricIds.length} métriques · généré le{" "}
                  {new Date(c.generatedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!canWrite}
                onClick={() =>
                  setCharts(
                    charts.map((x) =>
                      x.id === c.id ? { ...x, type: x.type === "bar" ? "line" : "bar" } : x,
                    ),
                  )
                }
              >
                {c.type === "bar" ? "Barres" : "Courbe"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!canWrite}
                onClick={() => setCharts(charts.filter((x) => x.id !== c.id))}
              >
                Supprimer
              </Button>
            </div>
          ))}
          {charts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun graphique.</p>
          ) : null}
        </div>
      </Panel>

      <Panel
        eyebrow="Suite"
        title="Prochaines actions et CTA"
        aside={
          <Button
            size="sm"
            variant="outline"
            disabled={!canWrite}
            onClick={() =>
              patch({
                actions: [
                  ...content.actions,
                  { id: uid(), label: "", detail: "", owner: "sawaz", horizon: "" },
                ],
              })
            }
          >
            + Action
          </Button>
        }
      >
        <div className="space-y-3">
          {content.actions.map((a) => (
            <div key={a.id} className="rounded-lg border border-border bg-surface-raised p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Action"
                  value={a.label}
                  disabled={!canWrite}
                  onChange={(e) =>
                    patch({
                      actions: content.actions.map((x) =>
                        x.id === a.id ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                />
                <Input
                  placeholder="Horizon (ex : 30 jours)"
                  value={a.horizon}
                  disabled={!canWrite}
                  onChange={(e) =>
                    patch({
                      actions: content.actions.map((x) =>
                        x.id === a.id ? { ...x, horizon: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
              <Textarea
                className="mt-2"
                rows={2}
                placeholder="Détail"
                value={a.detail}
                disabled={!canWrite}
                onChange={(e) =>
                  patch({
                    actions: content.actions.map((x) =>
                      x.id === a.id ? { ...x, detail: e.target.value } : x,
                    ),
                  })
                }
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(["sawaz", "client", "partage"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    disabled={!canWrite}
                    onClick={() =>
                      patch({
                        actions: content.actions.map((x) =>
                          x.id === a.id ? { ...x, owner: o } : x,
                        ),
                      })
                    }
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      a.owner === o
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {o}
                  </button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canWrite}
                  onClick={() =>
                    patch({ actions: content.actions.filter((x) => x.id !== a.id) })
                  }
                >
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-border bg-surface-raised p-4">
          <p className="text-eyebrow text-sawaz">CTA final</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(CTA_LABEL) as ReviewCtaType[]).map((t) => (
              <button
                key={t}
                type="button"
                disabled={!canWrite}
                onClick={() => patch({ cta: { ...content.cta, type: t } })}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  content.cta.type === t
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {CTA_LABEL[t]}
              </button>
            ))}
          </div>
          {content.cta.type !== "aucun" ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Libellé du bouton"
                value={content.cta.label}
                disabled={!canWrite}
                onChange={(e) => patch({ cta: { ...content.cta, label: e.target.value } })}
              />
              <Input
                placeholder="Lien (optionnel)"
                value={content.cta.url}
                disabled={!canWrite}
                onChange={(e) => patch({ cta: { ...content.cta, url: e.target.value } })}
              />
              <Input
                className="sm:col-span-2"
                placeholder="Phrase d'accompagnement"
                value={content.cta.helper}
                disabled={!canWrite}
                onChange={(e) => patch({ cta: { ...content.cta, helper: e.target.value } })}
              />
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel eyebrow="Preview client" title="Rendu exact de la Strategic Review">
        <ReviewPreview
          content={content}
          charts={charts}
          theme={ws.theme}
          metrics={ws.metrics}
        />
      </Panel>
    </StudioShell>
  );
}
