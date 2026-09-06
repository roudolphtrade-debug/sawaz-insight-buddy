import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  getPublicationState,
  regenerateReviewLink,
  revokeReviewAccess,
} from "@/lib/studio/publication.functions";

/** Pass 3F ÔÇö ├ëtat de publication, destinataires, lien s├®curis├® et historique. */

function date(value: string | null) {
  if (!value) return "ÔÇö";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export function PublicationPanel({ reviewId }: { reviewId: string }) {
  const qc = useQueryClient();
  const fetchState = useServerFn(getPublicationState);
  const rotate = useServerFn(regenerateReviewLink);
  const revoke = useServerFn(revokeReviewAccess);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["review-publication", reviewId],
    queryFn: () => fetchState({ data: { reviewId } }),
  });

  const state = data?.ok ? data.data : null;
  const isOwner = state?.role === "owner";

  const rotateMutation = useMutation({
    mutationFn: () => rotate({ data: { reviewId } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setFreshUrl(res.data.url);
      toast.success("Nouveau lien g├®n├®r├® ÔÇö l'ancien est r├®voqu├®");
      void qc.invalidateQueries({ queryKey: ["review-publication", reviewId] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => revoke({ data: { reviewId } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setFreshUrl(null);
      toast.success("Acc├¿s client r├®voqu├®");
      void qc.invalidateQueries({ queryKey: ["review-publication", reviewId] });
    },
  });

  if (!state) return null;

  const activeLink = state.links.find((l) => l.active) ?? null;

  return (
    <Panel
      eyebrow="Publication"
      title="Acc├¿s client"
      aside={
        state.publishedVersionNo ? (
          <StatusBadge tone="gold">Publi├®e ÔÇö v{state.publishedVersionNo}</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Non publi├®e</StatusBadge>
        )
      }
    >
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-eyebrow text-muted-foreground">Date de publication</dt>
          <dd className="text-sm text-foreground">{date(state.publishedAt)}</dd>
        </div>
        <div>
          <dt className="text-eyebrow text-muted-foreground">Destinataires</dt>
          <dd className="text-sm text-foreground">
            {state.recipients.length === 0
              ? "Aucun contact enregistr├®"
              : state.recipients
                  .map((r) => `${r.email}${r.isPrimary ? " (principal)" : ""}`)
                  .join(", ")}
          </dd>
        </div>
        <div>
          <dt className="text-eyebrow text-muted-foreground">Lien</dt>
          <dd className="text-sm text-foreground">
            {activeLink ? (
              <>
                Actif ┬À {activeLink.useCount} ouverture{activeLink.useCount > 1 ? "s" : ""} ┬À
                expire le {date(activeLink.expiresAt)}
              </>
            ) : (
              "Aucun lien actif"
            )}
          </dd>
        </div>
      </dl>

      {freshUrl ? (
        <p className="mt-4 break-all rounded-lg border border-sawaz/40 bg-sawaz/10 p-3 text-xs text-foreground">
          Lien affich├® une seule fois (seul son hash est conserv├®) : {freshUrl}
        </p>
      ) : null}

      {isOwner ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={rotateMutation.isPending || !state.publishedVersionNo}
            onClick={() => rotateMutation.mutate()}
          >
            R├®g├®n├®rer le lien
          </Button>
          <Button
            variant="ghost"
            disabled={revokeMutation.isPending || !activeLink}
            onClick={() => revokeMutation.mutate()}
          >
            R├®voquer l'acc├¿s
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Publication, rotation et r├®vocation du lien sont r├®serv├®es au r├┤le owner.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-eyebrow text-muted-foreground">Historique des publications</p>
          <ul className="mt-2 space-y-1.5">
            {state.history.map((h) => (
              <li key={h.versionNo} className="text-sm text-muted-foreground">
                v{h.versionNo} ┬À {date(h.publishedAt)} ┬À {h.status}
              </li>
            ))}
            {state.history.length === 0 ? (
              <li className="text-sm text-muted-foreground">Aucune publication.</li>
            ) : null}
          </ul>
        </div>
        <div>
          <p className="text-eyebrow text-muted-foreground">Notifications envoy├®es</p>
          <ul className="mt-2 space-y-1.5">
            {state.notifications.map((n) => (
              <li key={n.id} className="text-sm text-muted-foreground">
                {n.recipient} ┬À v{n.versionNo ?? "ÔÇö"} ┬À {n.status} ┬À {date(n.sentAt ?? n.createdAt)}
              </li>
            ))}
            {state.notifications.length === 0 ? (
              <li className="text-sm text-muted-foreground">Aucune notification.</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-eyebrow text-muted-foreground">Liens ├®mis</p>
        <ul className="mt-2 space-y-1.5">
          {state.links.map((l) => (
            <li key={l.id} className="text-sm text-muted-foreground">
              v{l.versionNo ?? "ÔÇö"} ┬À cr├®├® le {date(l.createdAt)} ┬À{" "}
              {l.revokedAt ? `r├®voqu├® le ${date(l.revokedAt)}` : l.active ? "actif" : "expir├®"} ┬À
              derni├¿re ouverture {date(l.lastUsedAt)}
            </li>
          ))}
          {state.links.length === 0 ? (
            <li className="text-sm text-muted-foreground">Aucun lien ├®mis.</li>
          ) : null}
        </ul>
      </div>
    </Panel>
  );
}
