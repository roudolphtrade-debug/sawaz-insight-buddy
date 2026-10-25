import { CalendarDays, ChevronDown, FileStack, History, MessageSquareText } from "lucide-react";
import { useState, type ReactNode } from "react";

import { CardHeader, SectionIcon } from "@/components/studio/DossierUI";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ATTRIBUTION_LABEL,
  formatParisDateTime,
  partitionSubmissions,
  qualificationLabel,
  submissionStatusLabel,
} from "@/lib/studio/qualification";
import { plural, PRIMARY_ACTION, SECONDARY_ACTION } from "@/lib/studio/sections";
import type { StudioSubmission } from "@/lib/studio/studio.functions";
import { cn } from "@/lib/utils";

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
        <CardHeader
          id="reference-title"
          icon={MessageSquareText}
          tone="reponses"
          eyebrow="Réponses · corpus actif"
          title="Réponse de référence"
          description="Donnée brute déclarée par les répondants, présentée avec la qualification Sawaz."
          aside={
            qualificationsAvailable ? (
              <StatusBadge tone="sawaz">{plural(active.length, "référence")}</StatusBadge>
            ) : null
          }
        />

        {!qualificationsAvailable ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Qualification indisponible pour le moment : aucune réponse n’est retenue dans le corpus
            actif. Toutes les réponses restent consultables dans l’historique ci-dessous.
          </p>
        ) : active.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucune réponse de référence : ouvre une réponse de l’historique et qualifie-la en «
            Référence » pour activer le corpus d’analyse.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {active.map((s) => (
              <li key={s.id} data-reference-submission={s.id}>
                <ReferenceRow submission={s} open={openId === s.id} onToggle={() => toggle(s.id)} />
                {openId === s.id ? <div className="mt-2">{renderDetail(s)}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <details data-history className="group surface-panel p-0 [&[open]]:pb-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3.5 transition hover:bg-surface-raised/60 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            <SectionIcon icon={History} tone="neutre" size="sm" />
            <span className="font-display text-base font-bold text-foreground">
              Historique / essais
            </span>
            <StatusBadge tone="neutral">
              {history.length} réponse{history.length > 1 ? "s" : ""} hors corpus actif
            </StatusBadge>
          </span>
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted-foreground transition group-open:rotate-180">
            <ChevronDown className="size-4" aria-hidden="true" />
          </span>
        </summary>

        {history.length === 0 ? (
          <p className="px-4 pb-1 text-sm text-muted-foreground sm:px-5">Aucun historique.</p>
        ) : (
          <div className="mx-4 overflow-x-auto rounded-lg border border-border sm:mx-5">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="bg-surface-raised/70">
                <tr className="border-b border-border text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="px-3 py-2.5 text-left font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center font-semibold">
                    Statut technique
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center font-semibold">
                    Qualification
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center font-semibold">
                    Réponses
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center font-semibold">
                    Documents
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
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
  const name = q?.respondentLabel ?? "Répondant non identifié";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-sawaz/25 bg-sawaz/[0.04] px-4 py-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-sawaz font-display text-lg font-extrabold text-sawaz-foreground"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-extrabold text-foreground">{name}</span>
            <StatusBadge tone="sawaz">{qualificationLabel(q)}</StatusBadge>
            {q?.respondentLabel ? (
              <StatusBadge tone="slate">{ATTRIBUTION_LABEL[q.attributionSource]}</StatusBadge>
            ) : null}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatParisDateTime(submission.submittedAt ?? submission.updatedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageSquareText className="size-3.5" aria-hidden="true" />
              {submission.answers.length} réponse{submission.answers.length > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileStack className="size-3.5" aria-hidden="true" />
              {submission.files.length} document{submission.files.length > 1 ? "s" : ""}
            </span>
          </p>
        </div>
      </div>
      <button type="button" onClick={onToggle} aria-expanded={open} className={PRIMARY_ACTION}>
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
        <td className="px-3 py-2.5 text-left text-foreground">
          {submission.submittedAt
            ? formatParisDateTime(submission.submittedAt)
            : `Mise à jour ${formatParisDateTime(submission.updatedAt)}`}
        </td>
        <td className="px-3 py-2.5 text-center text-muted-foreground">
          {submissionStatusLabel(submission.status)}
        </td>
        <td className="px-3 py-2.5 text-center">
          <StatusBadge tone="neutral">{qualificationLabel(submission.qualification)}</StatusBadge>
        </td>
        <td className="px-3 py-2.5 text-center font-semibold text-foreground tabular-nums">
          {submission.answers.length}
        </td>
        <td className="px-3 py-2.5 text-center font-semibold text-foreground tabular-nums">
          {submission.files.length}
        </td>
        <td className="px-3 py-2.5 text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className={cn(SECONDARY_ACTION, "h-8 px-3 text-xs")}
          >
            {open ? "Fermer" : "Ouvrir"}
          </button>
        </td>
      </tr>
      {detail ? (
        <tr>
          <td colSpan={6} className="px-3 pb-3">
            {detail}
          </td>
        </tr>
      ) : null}
    </>
  );
}
