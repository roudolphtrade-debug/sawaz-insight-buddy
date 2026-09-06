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

/** Liste des Strategic Reviews d'un client + cr├®ation depuis une collecte. */
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
  const [title, setTitle] = useState("Strategic Review");
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
      toast.success("Review cr├®├®e en brouillon");
      void qc.invalidateQueries({ queryKey: ["studio-reviews", clientId] });
      void navigate({
        to: "/studio/$clientId/review/$reviewId",
        params: { clientId: clientSlug, reviewId: res.data.reviewId },
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Cr├®ation impossible"),
  });

  const reviews = data?.ok ? data.data : [];

  return (
    <Panel
      eyebrow="Strategic Review"
      title="Workflow ├®ditorial"
      aside={<StatusBadge tone="neutral">Aucun email, aucun acc├¿s client</StatusBadge>}
    >
      <p className="text-sm text-muted-foreground">
        Une Strategic Review n'est aliment├®e que par des m├®triques valid├®es et des analyses
        destin├®es au client. Les notes internes et les m├®triques rejet├®es ou ├á v├®rifier ne peuvent
        pas y entrer.
      </p>

      {canWrite ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
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
                  {projects.find((p) => p.id === c.projectId)?.name ?? "Projet"} ÔÇö {c.status}
                </option>
              ))}
            </select>
          </div>
          <Button
            disabled={mutation.isPending || collections.length === 0}
            onClick={() => mutation.mutate()}
          >
            Cr├®er une Review
          </Button>
        </div>
      ) : null}

      <ul className="mt-5 space-y-2">
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
          <li className="text-sm text-muted-foreground">Aucune Strategic Review pour ce client.</li>
        ) : null}
      </ul>
    </Panel>
  );
}
