import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronDown, CircleSlash, FileText, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionIcon } from "@/components/studio/DossierUI";
import { EmptyState } from "@/components/studio/EmptyState";
import { Panel } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatParisDateTime, splitReviews } from "@/lib/studio/qualification";
import { REVIEW_STATUS_LABEL, type ReviewStatus } from "@/lib/studio/review-content";
import { createReview, type ReviewSummary } from "@/lib/studio/review.functions";
import {
  COLLECTION_STATUS_LABEL,
  FIELD,
  joinMeta,
  PRIMARY_ACTION,
  SECONDARY_ACTION,
  SUB_CARD,
} from "@/lib/studio/sections";
import { useClientReviews } from "@/lib/studio/use-client-reviews";

function ReviewRow({
  review,
  clientSlug,
  primary = false,
}: {
  review: ReviewSummary;
  clientSlug: string;
  primary?: boolean;
}) {
  const latestVersion = review.versions.reduce((max, v) => Math.max(max, v.versionNo), 0);
  return (
    <li
      data-review
      className={`${SUB_CARD} flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${primary ? "bg-surface" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <SectionIcon icon={FileText} tone="restitution" size="sm" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">
              {primary ? "Restitution principale" : review.projectName}
            </span>
            <StatusBadge tone={review.status === "published" ? "gold" : "sawaz"}>
              {REVIEW_STATUS_LABEL[review.status as ReviewStatus]}
            </StatusBadge>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {joinMeta([
              primary ? review.projectName : null,
              review.createdAt ? `Créée le ${formatParisDateTime(review.createdAt)}` : null,
              latestVersion ? `Version ${latestVersion}` : null,
              review.versions.length > 1 ? `${review.versions.length} versions` : null,
            ])}
          </p>
        </div>
      </div>
      <Link
        to="/studio/$clientId/review/$reviewId"
        params={{ clientId: clientSlug, reviewId: review.id }}
        className={SECONDARY_ACTION}
      >
        Ouvrir
      </Link>
    </li>
  );
}

const SOURCES = [
  { icon: Check, included: true, text: "Métriques validées par Sawaz" },
  { icon: Check, included: true, text: "Analyses destinées au client" },
  {
    icon: CircleSlash,
    included: false,
    text: "Exclus : notes internes, métriques rejetées ou encore à vérifier",
  },
] as const;

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
  const create = useServerFn(createReview);
  const [title, setTitle] = useState("Restitution stratégique");
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");

  const { data } = useClientReviews(clientId);

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
    onError: (e) => toast.error(e instanceof Error ? e.message : "Création impossible"),
  });

  const reviews = data?.ok ? data.data : [];
  // Restitutions en double (même mission, même collecte) : la plus récente reste dans
  // le parcours principal, les autres sont repliées comme historique, jamais supprimées.
  const { primary, older } = splitReviews(reviews);

  return (
    <Panel
      icon={FileText}
      tone="restitution"
      eyebrow="Restitution client"
      title="Restitution stratégique"
      description="La restitution est préparée à partir des métriques validées et des analyses destinées au client. Les notes internes et les métriques rejetées ou encore à vérifier restent exclues."
      aside={
        <StatusBadge tone="neutral" icon={<Lock />}>
          Aucun accès client avant partage
        </StatusBadge>
      }
    >
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {SOURCES.map(({ icon: Icon, included, text }) => (
          <li key={text} className="inline-flex items-center gap-2 text-body">
            <Icon
              className={included ? "size-4 text-good" : "size-4 text-muted-foreground"}
              aria-hidden="true"
            />
            {text}
          </li>
        ))}
      </ul>

      {canWrite ? (
        <section
          aria-labelledby="review-new-title"
          className={`${SUB_CARD} mt-5 p-4`}
          data-new-review
        >
          <h3 id="review-new-title" className="font-display text-base font-bold text-foreground">
            Nouvelle restitution
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <div>
              <label
                className="mb-1 block text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase"
                htmlFor="review-title"
              >
                Titre
              </label>
              <input
                id="review-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`${FIELD} h-10`}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase"
                htmlFor="review-collection"
              >
                Collecte source
              </label>
              <select
                id="review-collection"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className={`${FIELD} h-10`}
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {projects.find((p) => p.id === c.projectId)?.name ?? "Projet"} · collecte{" "}
                    {(COLLECTION_STATUS_LABEL[c.status] ?? "en cours").toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={mutation.isPending || collections.length === 0 || !title.trim()}
              onClick={() => mutation.mutate()}
              className={`${PRIMARY_ACTION} h-10 w-full px-5 md:w-auto`}
            >
              Créer la restitution
            </button>
          </div>
        </section>
      ) : null}

      <div className="mt-5">
        <h3 className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
          Restitutions existantes
        </h3>
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
              <ReviewRow key={r.id} review={r} clientSlug={clientSlug} primary />
            ))}
          </ul>
        )}

        {older.length > 0 ? (
          <details data-older-reviews className="group mt-3 rounded-lg border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground [&::-webkit-details-marker]:hidden">
              Autres restitutions ({older.length}) · historique
              <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="px-4 text-xs text-muted-foreground">
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
