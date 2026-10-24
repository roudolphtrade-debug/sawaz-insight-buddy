import { ChevronDown, FileStack, MessageSquareText } from "lucide-react";
import { useState, type ReactNode } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import {
  ATTRIBUTION_LABEL,
  formatParisDateTime,
  partitionSubmissions,
  qualificationLabel,
  submissionStatusLabel,
} from "@/lib/studio/qualification";
import type { StudioSubmission } from "@/lib/studio/studio.functions";

/**
 * Page Réponses : la (ou les) réponse(s) de référence en cartes compactes, puis
 * l'historique et les essais dans un bloc replié par défaut. Aucun détail (réponses,
 * documents) n'est rendu tant qu'une réponse n'est pas explicitement ouverte.
 * `renderDetail` reçoit la réponse ouverte (détail interactif fourni par l'appelant).
 */
export function SubmissionsSection({
  submissions,
  qualificationsAvailable,
  renderDetail,
}: {
  submissions: readonly StudioSubmission[];
  qualificationsAvailable: boolean;
  renderDetail: (submission: StudioSubmission) => ReactNode;
}) {
  const { active, history } = partitionSubmissions(submissions);
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((current) => (current === id ? null : id));

  return (
    <div className="space-y-4">
      <section aria-labelledby="reference-title" className="surface-panel p-4 sm:p-5">
        <h3 id="reference-title" className="font-display text-base font-bold text-foreground">
          Réponse de référence
        </h3>

        {!qualificationsAvailable ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Qualification indisponible pour le moment : aucune réponse n’est retenue dans le corpus
            actif. Toutes les réponses restent consultables dans l’historique ci-dessous.
          </p>
        ) : active.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Aucune réponse de référence : ouvre une réponse de l’historique et qualifie-la en «
            Référence » pour activer le corpus d’analyse.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {active.map((s) => (
              <li key={s.id} data-reference-submission={s.id}>
                <ReferenceRow submission={s} open={openId === s.id} onToggle={() => toggle(s.id)} />
                {openId === s.id ? <div className="mt-1 px-1">{renderDetail(s)}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <details data-history className="group surface-panel p-0 [&[open]]:pb-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="font-display text-base font-bold text-foreground">
              Historique / essais
            </span>
            <span className="ml-2 text-sm text-muted-foreground">
              {history.length} réponse{history.length > 1 ? "s" : ""} hors corpus actif
            </span>
          </span>
          <ChevronDown
            className="size-4 text-muted-foreground transition group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        {history.length === 0 ? (
          <p className="px-4 pb-3 text-sm text-muted-foreground sm:px-5">Aucun historique.</p>
        ) : (
          <div className="overflow-x-auto px-2 sm:px-3">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="px-2 py-2 text-left font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-2 py-2 text-center font-semibold">
                    Statut technique
                  </th>
                  <th scope="col" className="px-2 py-2 text-center font-semibold">
                    Qualification
                  </th>
                  <th scope="col" className="px-2 py-2 text-center font-semibold">
                    Réponses
                  </th>
                  <th scope="col" className="px-2 py-2 text-center font-semibold">
                    Documents
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <HistoryRow
                    key={s.id}
                    submission={s}
                    open={openId === s.id}
                    onToggle={() => toggle(s.id)}
                    detail={openId === s.id ? renderDetail(s) : null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </div>
  );
}

function ReferenceRow({
  submission,
  open,
  onToggle,
}: {
  submission: StudioSubmission;
  open: boolean;
  onToggle: () => void;
}) {
  const q = submission.qualification;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/[0.04] px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-extrabold text-foreground">
            {q?.respondentLabel ?? "Répondant non identifié"}
          </span>
          <StatusBadge tone="gold">{qualificationLabel(q)}</StatusBadge>
          {q?.respondentLabel ? (
            <span className="text-xs text-muted-foreground">
              {ATTRIBUTION_LABEL[q.attributionSource]}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{formatParisDateTime(submission.submittedAt ?? submission.updatedAt)}</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquareText className="size-3.5" aria-hidden="true" />
            {submission.answers.length} réponse{submission.answers.length > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileStack className="size-3.5" aria-hidden="true" />
            {submission.files.length} document{submission.files.length > 1 ? "s" : ""}
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="rounded-md bg-sawaz px-3 py-1.5 text-xs font-semibold text-sawaz-foreground transition hover:bg-sawaz/90"
      >
        {open ? "Fermer" : "Ouvrir"}
      </button>
    </div>
  );
}

function HistoryRow({
  submission,
  open,
  onToggle,
  detail,
}: {
  submission: StudioSubmission;
  open: boolean;
  onToggle: () => void;
  detail: ReactNode;
}) {
  return (
    <>
      <tr className="border-b border-border last:border-b-0">
        <td className="px-2 py-2 text-left text-foreground">
          {submission.submittedAt
            ? formatParisDateTime(submission.submittedAt)
            : `Mise à jour ${formatParisDateTime(submission.updatedAt)}`}
        </td>
        <td className="px-2 py-2 text-center text-muted-foreground">
          {submissionStatusLabel(submission.status)}
        </td>
        <td className="px-2 py-2 text-center">
          <StatusBadge tone="neutral">{qualificationLabel(submission.qualification)}</StatusBadge>
        </td>
        <td className="px-2 py-2 text-center font-semibold text-foreground">
          {submission.answers.length}
        </td>
        <td className="px-2 py-2 text-center font-semibold text-foreground">
          {submission.files.length}
        </td>
        <td className="px-2 py-2 text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-sawaz transition hover:bg-sawaz/5"
          >
            {open ? "Fermer" : "Ouvrir"}
          </button>
        </td>
      </tr>
      {detail ? (
        <tr>
          <td colSpan={6} className="px-2 pb-3">
            {detail}
          </td>
        </tr>
      ) : null}
    </>
  );
}
