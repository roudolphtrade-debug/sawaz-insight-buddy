import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { EmptyState } from "@/components/studio/EmptyState";
import { Panel } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { reviewStudioMetric, type StudioMetric } from "@/lib/studio/studio.functions";

const STATUS_LABEL = {
  a_verifier: "À vérifier",
  valide: "Validé",
  rejete: "Rejeté",
} as const;

const PROVENANCE_LABEL: Record<string, string> = {
  manual: "saisie manuelle",
  csv: "import CSV",
  capture_ocr: "lecture de capture",
  derived: "calcul dérivé",
};

const STATUS_TONE = {
  a_verifier: "sawaz",
  valide: "gold",
  rejete: "neutral",
} as const;

/** Revue humaine des métriques extraites, avec correction traçable. */
export function MetricsReviewPanel({
  metrics,
  canWrite,
  analyzableDocuments,
}: {
  metrics: StudioMetric[];
  canWrite: boolean;
  /** Documents du corpus actif, pour expliquer l'état vide. */
  analyzableDocuments: number;
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
      eyebrow="Indicateurs · ce que les données montrent"
      title="Vérification des indicateurs"
      aside={
        <StatusBadge tone="neutral">
          {metrics.filter((m) => m.reviewStatus === "a_verifier").length} à vérifier
        </StatusBadge>
      }
    >
      {metrics.length === 0 ? (
        <EmptyState
          title="Aucun indicateur pour l’instant"
          missing="les indicateurs chiffrés (audience, dépenses, résultats) issus des documents transmis."
          why={
            analyzableDocuments > 0
              ? `aucune extraction n’a encore été réalisée sur les ${analyzableDocuments} documents analysables du corpus actif.`
              : "aucune réponse de référence ne fournit encore de documents analysables."
          }
          next={
            analyzableDocuments > 0
              ? "extraire les indicateurs des documents de la réponse de référence, puis les vérifier ici avant toute restitution."
              : "qualifier une réponse de référence dans la section Réponses."
          }
        />
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
                    {m.valueNum ?? m.valueText ?? "Valeur absente"} {m.unit ?? ""} ·{" "}
                    {m.periodStart ?? "?"} → {m.periodEnd ?? "?"} · provenance{" "}
                    {PROVENANCE_LABEL[m.provenance] ?? "inconnue"}
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
