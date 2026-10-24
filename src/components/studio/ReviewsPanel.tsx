import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/studio/EmptyState";
import { Panel } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatParisDateTime, splitReviews } from "@/lib/studio/qualification";
import { REVIEW_STATUS_LABEL, type ReviewStatus } from "@/lib/studio/review-content";
import { createReview, listClientReviews, type ReviewSummary } from "@/lib/studio/review.functions";

const COLLECTION_STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouverte",
  partially_submitted: "Partiellement reçue",
  submitted: "Reçue",
  closed: "Clôturée",
};

function ReviewRow({ review, clientSlug }: { review: ReviewSummary; clientSlug: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2.5">
      <span className="text-sm text-foreground">
        {review.projectName}
        <span className="ml-2 text-xs text-muted-foreground">
          {review.versions.length} version{review.versions.length > 1 ? "s" : ""}
          {review.createdAt ? ` · créée le ${formatParisDateTime(review.createdAt)}` : ""}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={review.status === "published" ? "gold" : "sawaz"}>
          {REVIEW_STATUS_LABEL[review.status as ReviewStatus]}
        </StatusBadge>
        <Link
          to="/studio/$clientId/review/$reviewId"
          params={{ clientId: clientSlug, reviewId: review.id }}
          className="text-sm text-sawaz hover:underline"
        >
          Ouvrir
        </Link>
      </span>
    </li>
  );
}

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
  // Restitutions en double (même mission, même collecte) : la plus récente reste dans
  // le parcours principal, les autres sont repliées comme historique, jamais supprimées.
  const { primary, older } = splitReviews(reviews);

  return (
    <Panel
      eyebrow="Restitution client"
      title="Restitution stratégique"
      aside={<StatusBadge tone="neutral">Aucun accès client avant partage</StatusBadge>}
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
                    {projects.find((p) => p.id === c.projectId)?.name ?? "Projet"} · collecte{" "}
                    {(COLLECTION_STATUS_LABEL[c.status] ?? "en cours").toLowerCase()}
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
        {reviews.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              title="Aucune restitution préparée"
              missing="un brouillon de restitution pour la collecte de ce client."
              why="la restitution s’appuie sur les indicateurs validés et les analyses destinées au client ; rien n’est partagé avant publication."
              next={
                canWrite
                  ? "créer un brouillon avec le formulaire ci-dessus, de préférence après validation des premiers indicateurs."
                  : "un propriétaire ou un analyste Sawaz doit créer le premier brouillon."
              }
            />
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {primary.map((r) => (
              <ReviewRow key={r.id} review={r} clientSlug={clientSlug} />
            ))}
          </ul>
        )}

        {older.length > 0 ? (
          <details data-older-reviews className="group mt-3 rounded-lg border border-border">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
              Autres restitutions ({older.length}) · historique
            </summary>
            <p className="px-3 text-xs text-muted-foreground">
              Restitution(s) plus ancienne(s) pour la même mission et la même collecte, conservée(s)
              telle(s) quelle(s).
            </p>
            <ul className="space-y-2 p-3">
              {older.map((r) => (
                <ReviewRow key={r.id} review={r} clientSlug={clientSlug} />
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </Panel>
  );
}
