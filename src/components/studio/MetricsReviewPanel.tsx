import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Panel } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { reviewStudioMetric, type StudioMetric } from "@/lib/studio/studio.functions";

const STATUS_LABEL = {
  a_verifier: "À vérifier",
  valide: "Validé",
  rejete: "Rejeté",
} as const;

const STATUS_TONE = {
  a_verifier: "sawaz",
  valide: "gold",
  rejete: "neutral",
} as const;

/** Revue humaine des métriques extraites, avec correction traçable. */
export function MetricsReviewPanel({
  metrics,
  canWrite,
}: {
  metrics: StudioMetric[];
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const review = useServerFn(reviewStudioMetric);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (input: {
      id: string;
      reviewStatus: StudioMetric["reviewStatus"];
      valueNum?: number | null;
      note?: string | null;
    }) => review({ data: input }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["studio-dossier"] }),
  });

  return (
    <Panel
      eyebrow="3. Données extraites"
      title="Revue et validation des métriques"
      aside={
        <StatusBadge tone="neutral">
          {metrics.filter((m) => m.reviewStatus === "a_verifier").length} à vérifier
        </StatusBadge>
      }
    >
      {metrics.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune métrique extraite pour l'instant. Elles apparaîtront ici dès leur extraction depuis
          les fichiers reçus.
        </p>
      ) : (
        <ul className="space-y-3">
          {metrics.map((m) => (
            <li key={m.id} className="rounded-lg border border-border bg-surface-raised p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">
                    {m.metricKey}
                    {m.platform ? (
                      <span className="ml-2 text-xs text-muted-foreground">{m.platform}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.valueNum ?? m.valueText ?? "—"} {m.unit ?? ""} ·{" "}
                    {m.periodStart ?? "?"} → {m.periodEnd ?? "?"} · provenance {m.provenance}
                    {m.confidence !== null
                      ? ` · confiance ${Math.round(m.confidence * 100)}%`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Source : {m.sourceFileName ?? "non rattachée"}
                    {m.originalValueNum !== null || m.originalValueText !== null
                      ? ` · valeur d'origine ${m.originalValueNum ?? m.originalValueText}`
                      : ""}
                  </p>
                </div>
                <StatusBadge tone={STATUS_TONE[m.reviewStatus]}>
                  {STATUS_LABEL[m.reviewStatus]}
                </StatusBadge>
              </div>

              {canWrite ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    aria-label={`Valeur corrigée pour ${m.metricKey}`}
                    placeholder="Valeur corrigée"
                    value={drafts[m.id] ?? ""}
                    onChange={(e) => setDrafts({ ...drafts, [m.id]: e.target.value })}
                    className="w-40 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-sawaz"
                  />
                  <input
                    aria-label={`Note de revue pour ${m.metricKey}`}
                    placeholder="Note de revue"
                    value={notes[m.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [m.id]: e.target.value })}
                    className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-sawaz"
                  />
                  {(["valide", "rejete", "a_verifier"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={mutation.isPending}
                      onClick={() => {
                        const raw = drafts[m.id];
                        mutation.mutate({
                          id: m.id,
                          reviewStatus: status,
                          ...(raw !== undefined && raw !== ""
                            ? { valueNum: Number(raw) }
                            : {}),
                          note: notes[m.id] ?? null,
                        });
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
