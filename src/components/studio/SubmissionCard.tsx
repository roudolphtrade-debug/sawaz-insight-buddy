import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { Panel } from "@/components/studio/StudioShell";
import { StatusBadge } from "@/components/StatusBadge";
import { getStudioFileUrl, type StudioSubmission } from "@/lib/studio/studio.functions";
import { answerLabel, deterministicRespondent } from "@/lib/studio/submission-presentation";

const VALUE_LABEL: Record<string, string> = {
  export: "Export",
  captures: "Captures d’écran",
  guide: "Procédure guidée",
  oui: "Oui",
  non: "Non",
  inconnu: "Je ne sais pas / non disponible",
  "pas-sur": "Probablement, sans certitude",
  "6m": "6 derniers mois",
  "12m": "12 derniers mois",
  trafic: "Trafic",
  engagement: "Engagement",
  messages: "Messages",
  leads: "Prospects",
  ventes: "Ventes / conversions",
  plusieurs: "Plusieurs",
  landing: "Page de destination",
  telegram: "Telegram",
  conversation: "Conversation / message",
  "autre-page": "Autre page",
  clic: "Clic",
  "vue-landing": "Vue de page de destination",
  message: "Message",
  lead: "Prospect",
  formulaire: "Formulaire rempli",
  achat: "Achat / conversion",
};

const FILE_SLOT_LABEL: Record<string, string> = {
  "yt.export": "YouTube — Export",
  "yt.capture.overview": "YouTube — Vue d’ensemble",
  "yt.capture.content": "YouTube — Contenu",
  "yt.capture.audience": "YouTube — Audience",
  "c.guideVip": "YouTube — Guide VIP",
  "c.dixVideos": "YouTube — 10 vidéos récentes",
  "c.traffic": "YouTube — Sources de trafic",
  "c.newReturning": "YouTube — Nouveaux / récurrents",
  "m.export": "Meta — Export",
  "m.captures": "Meta — Captures",
  "m.results": "Meta — Résultats",
};

function formatSize(bytes: number) {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function humanValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => VALUE_LABEL[String(item)] ?? String(item)).join(", ");
  }

  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (value === null || value === undefined || value === "") return "—";

  const text = String(value);
  return VALUE_LABEL[text] ?? text;
}

export function SubmissionCard({ submission }: { submission: StudioSubmission }) {
  const fileUrl = useServerFn(getStudioFileUrl);
  const [lightbox, setLightbox] = useState<{ fileId: string; url: string; name: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const provided = submission.answers.filter((a) => !a.notFound);
  const missing = submission.answers.filter((a) => a.notFound);

  // getStudioDossier currently supplies invitees via collection_id, not the submitter.
  const identity = deterministicRespondent(submission, "collection-recipient");
  const respondentLabel = identity
    ? [identity.respondent, identity.respondentEmail].filter(Boolean).join(" · ")
    : "Répondant non identifié";

  const submissionTitle = submission.submittedAt
    ? `Réponse reçue le ${formatDate(submission.submittedAt)}`
    : identity?.respondent
      ? `En cours — ${identity.respondent}`
      : "Collecte en cours";

  async function open(fileId: string, mode: "download" | "preview") {
    setError(null);
    const res = await fileUrl({ data: { fileId } });
    if (!res.ok) {
      setError(res.error);
      return;
    }

    if (mode === "preview") {
      setLightbox({ fileId, url: res.data.url, name: res.data.name });
    } else {
      triggerDownload(res.data.url, res.data.name);
    }
  }

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  return (
    <Panel
      eyebrow={submission.projectName}
      title={submissionTitle}
      aside={
        <StatusBadge tone={submission.status === "submitted" ? "gold" : "sawaz"}>
          {submission.status === "submitted" ? "Soumise" : "En cours"}
        </StatusBadge>
      }
    >
      <p className="text-xs text-muted-foreground">
        {respondentLabel} · {" "}
        dernière activité {formatDate(submission.updatedAt)}
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-eyebrow text-sawaz">Réponses transmises</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {provided.length === 0 ? (
              <li className="text-muted-foreground">Aucune réponse enregistrée.</li>
            ) : (
              provided.map((a) => (
                <li key={a.key} className="border-b border-border py-2">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{answerLabel(a.key)}</span>
                    <span className="max-w-[55%] text-right font-medium text-foreground">
                      {humanValue(a.value)}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-eyebrow text-sawaz">Données indisponibles</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {missing.length === 0 ? (
              <li className="text-muted-foreground">Aucune donnée déclarée indisponible.</li>
            ) : (
              missing.map((a) => (
                <li key={a.key} className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-muted-foreground">
                  {answerLabel(a.key)}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-eyebrow text-sawaz">Documents transmis</h3>
          <span className="text-xs text-muted-foreground">
            {submission.files.length} fichier{submission.files.length > 1 ? "s" : ""}
          </span>
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <ul className="mt-3 space-y-2">
          {submission.files.map((f) => (
            <li key={f.id} className="rounded-lg border border-border bg-surface-raised p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-sawaz">
                    {FILE_SLOT_LABEL[f.slot] ?? f.slot}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-foreground">{f.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatSize(f.size)} · {f.mime || "type inconnu"} · {formatDate(f.uploadedAt)}
                  </p>
                </div>

                <div className="flex gap-2">
                  {f.isImage ? (
                    <button
                      type="button"
                      onClick={() => open(f.id, "preview")}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Aperçu
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => open(f.id, "download")}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Télécharger
                  </button>
                </div>
              </div>

            </li>
          ))}

          {submission.files.length === 0 ? (
            <li className="text-sm text-muted-foreground">Aucun document reçu.</li>
          ) : null}
        </ul>
      </div>

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Aperçu de ${lightbox.name}`}
          className="fixed inset-0 z-50 flex flex-col bg-foreground/85 p-3 sm:p-6"
          onClick={() => setLightbox(null)}
        >
          <div
            className="mx-auto flex w-full max-w-[95vw] items-center justify-between gap-3 pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="min-w-0 truncate text-sm font-medium text-background">{lightbox.name}</p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => open(lightbox.fileId, "download")}
                className="rounded-lg border border-background/40 px-3 py-1.5 text-xs font-semibold text-background hover:bg-background/10"
              >
                Télécharger
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => setLightbox(null)}
                className="rounded-lg border border-background/40 px-3 py-1.5 text-xs font-semibold text-background hover:bg-background/10"
              >
                Fermer ✕
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <img
              src={lightbox.url}
              alt={`Aperçu de ${lightbox.name}`}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[95vw] object-contain"
            />
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

/** Ajoute `download=<nom>` à l'URL signée sans toucher au token, puis déclenche le téléchargement. */
export function buildDownloadUrl(signedUrl: string, name: string) {
  const u = new URL(signedUrl);
  u.searchParams.set("download", name);
  return u.toString();
}

function triggerDownload(signedUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = buildDownloadUrl(signedUrl, name);
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
