import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, Lock, PenLine } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/studio/EmptyState";
import { Panel } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import {
  deleteStudioAnalysis,
  saveStudioAnalysis,
  type StudioAnalysis,
} from "@/lib/studio/studio.functions";
import { FIELD, PRIMARY_ACTION, SUB_CARD } from "@/lib/studio/sections";
import { cn } from "@/lib/utils";

type AnalysisType = StudioAnalysis["type"];

const TYPE_LABEL: Record<AnalysisType, string> = {
  constat: "Constat",
  hypothese: "Hypothèse",
  recommandation: "Recommandation",
  note: "Note interne",
};

const TYPE_HINT: Record<AnalysisType, string> = {
  constat: "Fait établi à partir des données vérifiées.",
  hypothese: "Explication plausible, à confirmer.",
  recommandation: "Action proposée au client.",
  note: "Réservée à Sawaz, jamais visible côté client.",
};

const TYPE_TONE = {
  constat: "gold",
  hypothese: "sawaz",
  recommandation: "gold",
  note: "neutral",
} as const;

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

  const deleteButton = (id: string) =>
    canWrite ? (
      <button
        type="button"
        onClick={() => deleteMutation.mutate(id)}
        className="text-xs font-semibold text-muted-foreground transition hover:text-destructive"
      >
        Supprimer
      </button>
    ) : null;

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          icon={Lightbulb}
          tone="analyse"
          eyebrow="Analyse Sawaz · interprétation"
          title="Constats, hypothèses et recommandations"
          description="Cette zone transforme les données collectées en enseignements exploitables. Seuls les éléments destinés au client pourront alimenter la restitution."
          aside={
            <StatusBadge tone="neutral">
              {shared.length} élément{shared.length > 1 ? "s" : ""}
            </StatusBadge>
          }
        >
          {shared.length === 0 ? (
            <EmptyState
              title="Aucune analyse rédigée"
              missing="les constats, hypothèses et recommandations tirés du corpus actif."
              why="l’interprétation Sawaz n’a pas encore été formalisée pour ce client."
              next={
                canWrite
                  ? "ajouter un premier constat avec le formulaire « Ajouter un élément d’analyse » ci-dessous, en s’appuyant sur les indicateurs vérifiés."
                  : "un propriétaire ou un analyste Sawaz doit rédiger un premier constat."
              }
            />
          ) : (
            <ul className="space-y-3">
              {shared.map((a) => (
                <li key={a.id} className={`${SUB_CARD} p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge tone={TYPE_TONE[a.type]}>{TYPE_LABEL[a.type]}</StatusBadge>
                    {deleteButton(a.id)}
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{a.title}</p>
                  <p className="mt-1 max-w-3xl text-sm whitespace-pre-wrap text-muted-foreground">
                    {a.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          icon={Lock}
          tone="neutre"
          eyebrow="Confidentiel"
          title="Notes internes"
          description="Notes de travail de l’équipe Sawaz."
          className="border-dashed"
          aside={<StatusBadge tone="neutral">Jamais visibles côté client</StatusBadge>}
        >
          {internal.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune note interne.</p>
          ) : (
            <ul className="space-y-3">
              {internal.map((a) => (
                <li key={a.id} className="rounded-lg border border-dashed border-border-strong p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{a.title}</p>
                    {deleteButton(a.id)}
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {canWrite ? (
        <Panel
          icon={PenLine}
          tone="analyse"
          eyebrow="Nouvelle analyse"
          title="Ajouter un élément d’analyse"
          description="Rien n’est enregistré avant le clic sur Enregistrer."
        >
          <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <fieldset>
              <legend className="mb-2 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                Type d’élément
              </legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {(Object.keys(TYPE_LABEL) as AnalysisType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    aria-pressed={type === t}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left transition",
                      type === t
                        ? "border-sawaz/50 bg-sawaz/[0.06] shadow-[inset_3px_0_0_var(--color-sawaz)]"
                        : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-sm font-semibold",
                        type === t ? "text-sawaz" : "text-foreground",
                      )}
                    >
                      {TYPE_LABEL[t]}
                    </span>
                    <span className="block text-xs text-muted-foreground">{TYPE_HINT[t]}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="max-w-4xl space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre"
                aria-label="Titre de l'analyse"
                className={FIELD}
              />

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Contenu"
                aria-label="Contenu de l'analyse"
                className={cn(FIELD, "min-h-36 resize-y leading-relaxed")}
              />

              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {type === "note"
                    ? "Note interne : jamais visible côté client."
                    : "Destiné au client : pourra alimenter la restitution."}
                </p>
                <button
                  type="button"
                  disabled={!title.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                  className={PRIMARY_ACTION}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
