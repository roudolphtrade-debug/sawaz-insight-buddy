import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REVIEW_STATUS_LABEL, type ReviewStatus } from "@/lib/studio/review-content";
import { createReview, listClientReviews } from "@/lib/studio/review.functions";

export function ReviewsPanel({
  clientSlug,
  clientId,
  projects,
  collections,
  canWrite,
}: {
  clientSlug: string;
  clientId: string;
  projects: { id: string; name: string }[];
  collections: { id: string; projectId: string; status: string }[];
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchReviews = useServerFn(listClientReviews);
  const create = useServerFn(createReview);
  const [title, setTitle] = useState("Restitution stratégique");
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");

  const { data } = useQuery({
    queryKey: ["studio-reviews", clientId],
    queryFn: () => fetchReviews({ data: { clientId } }),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const collection = collections.find((c) => c.id === collectionId);
      const projectId = collection?.projectId ?? projects[0]?.id;
      if (!projectId) throw new Error("Aucun projet disponible");

      return create({
        data: {
          clientId,
          projectId,
          collectionId: collection?.id ?? null,
          title,
        },
      });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success("Restitution créée en brouillon");
      void qc.invalidateQueries({ queryKey: ["studio-reviews", clientId] });
      void navigate({
        to: "/studio/$clientId/review/$reviewId",
        params: { clientId: clientSlug, reviewId: res.data.reviewId },
      });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Création impossible"),
  });

  const reviews = data?.ok ? data.data : [];

  return (
    <Panel
      eyebrow="5. Restitution client"
      title="Restitution stratégique (Strategic Review)"
      aside={<StatusBadge tone="neutral">Aucun accès client avant publication</StatusBadge>}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        La restitution est préparée à partir des métriques validées et des analyses destinées au
        client. Les notes internes et les métriques rejetées ou encore à vérifier restent exclues.
      </p>

      {canWrite ? (
        <div className="mt-5 rounded-xl border border-border bg-surface-raised p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Créer une nouvelle restitution</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <label className="text-eyebrow text-muted-foreground" htmlFor="review-title">
                Titre
              </label>
              <Input
                id="review-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="min-w-[220px] flex-1">
              <label className="text-eyebrow text-muted-foreground" htmlFor="review-collection">
                Collecte source
              </label>
              <select
                id="review-collection"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {projects.find((p) => p.id === c.projectId)?.name ?? "Projet"} — {c.status}
                  </option>
                ))}
              </select>
            </div>

            <Button
              disabled={mutation.isPending || collections.length === 0 || !title.trim()}
              onClick={() => mutation.mutate()}
            >
              Créer la restitution
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-eyebrow text-muted-foreground">Restitutions existantes</p>
        <ul className="mt-2 space-y-2">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-raised p-3"
            >
              <span className="text-sm text-foreground">
                {r.projectName}
                <span className="ml-2 text-xs text-muted-foreground">
                  {r.versions.length} version{r.versions.length > 1 ? "s" : ""}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={r.status === "published" ? "gold" : "sawaz"}>
                  {REVIEW_STATUS_LABEL[r.status as ReviewStatus]}
                </StatusBadge>
                <Link
                  to="/studio/$clientId/review/$reviewId"
                  params={{ clientId: clientSlug, reviewId: r.id }}
                  className="text-sm text-sawaz hover:underline"
                >
                  Ouvrir
                </Link>
              </span>
            </li>
          ))}

          {reviews.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Aucune restitution créée pour ce client.
            </li>
          ) : null}
        </ul>
      </div>
    </Panel>
  );
}
