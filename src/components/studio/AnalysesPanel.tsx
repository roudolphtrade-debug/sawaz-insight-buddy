import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Panel } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import {
  deleteStudioAnalysis,
  saveStudioAnalysis,
  type StudioAnalysis,
} from "@/lib/studio/studio.functions";

type AnalysisType = StudioAnalysis["type"];

const TYPE_LABEL: Record<AnalysisType, string> = {
  constat: "Constat",
  hypothese: "Hypoth├¿se",
  recommandation: "Recommandation",
  note: "Note interne",
};

const TYPE_TONE = {
  constat: "gold",
  hypothese: "sawaz",
  recommandation: "gold",
  note: "neutral",
} as const;

/**
 * Analyses internes. Les notes internes sont visuellement isol├®es et
 * forc├®es en visibilit├® `internal` c├┤t├® serveur : jamais expos├®es au client.
 */
export function AnalysesPanel({
  clientId,
  analyses,
  canWrite,
}: {
  clientId: string;
  analyses: StudioAnalysis[];
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveStudioAnalysis);
  const remove = useServerFn(deleteStudioAnalysis);

  const [type, setType] = useState<AnalysisType>("constat");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["studio-dossier"] });

  const createMutation = useMutation({
    mutationFn: async () =>
      save({
        data: {
          clientId,
          type,
          title,
          body,
          visibility: type === "note" ? "internal" : "client",
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle("");
      setBody("");
      setError(null);
      void invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => remove({ data: { id, clientId } }),
    onSuccess: () => void invalidate(),
  });

  const shared = analyses.filter((a) => a.type !== "note");
  const internal = analyses.filter((a) => a.type === "note");

  return (
    <div className="space-y-6">
      <Panel eyebrow="Analyse Sawaz" title="Constats, hypoth├¿ses et recommandations">
        {shared.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune analyse enregistr├®e pour ce client.
          </p>
        ) : (
          <ul className="space-y-3">
            {shared.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-surface-raised p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusBadge tone={TYPE_TONE[a.type]}>{TYPE_LABEL[a.type]}</StatusBadge>
                  {canWrite ? (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(a.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Supprimer
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 font-semibold text-foreground">{a.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        eyebrow="Confidentiel"
        title="Notes internes Sawaz"
        className="border-dashed"
        aside={<StatusBadge tone="neutral">Jamais visible c├┤t├® client</StatusBadge>}
      >
        {internal.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune note interne.</p>
        ) : (
          <ul className="space-y-3">
            {internal.map((a) => (
              <li key={a.id} className="rounded-lg border border-dashed border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{a.title}</p>
                  {canWrite ? (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(a.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Supprimer
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {canWrite ? (
        <Panel eyebrow="Nouvelle entr├®e" title="Ajouter une analyse">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_LABEL) as AnalysisType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    type === t
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre"
              aria-label="Titre de l'analyse"
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-sawaz"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Contenu"
              aria-label="Contenu de l'analyse"
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-sawaz"
            />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
