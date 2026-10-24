import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { DocumentGroups } from "@/components/studio/DocumentGroups";
import { usePanelActive } from "@/components/studio/DossierTabs";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ATTRIBUTION_LABEL,
  CLASSIFICATIONS,
  CLASSIFICATION_LABEL,
  formatParisDateTime,
  qualificationLabel,
  type AttributionSource,
  type Classification,
} from "@/lib/studio/qualification";
import {
  getStudioFileUrl,
  qualifyStudioSubmission,
  type StudioSubmission,
} from "@/lib/studio/studio.functions";
import { answerLabel } from "@/lib/studio/submission-presentation";

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

function humanValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => VALUE_LABEL[String(item)] ?? String(item)).join(", ");
  }
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (value === null || value === undefined || value === "") return "Non renseigné";
  const text = String(value);
  return VALUE_LABEL[text] ?? text;
}

/**
 * Détail d'une réponse, ouvert à la demande : réponses brutes, documents regroupés
 * et qualification Sawaz, présentée à part de la donnée brute. Lightbox et
 * téléchargement passent par une URL signée temporaire (bucket privé).
 */
export function SubmissionDetail({
  submission,
  canWrite,
}: {
  submission: StudioSubmission;
  canWrite: boolean;
}) {
  const fileUrl = useServerFn(getStudioFileUrl);
  const [lightbox, setLightbox] = useState<{ fileId: string; url: string; name: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  // Onglet quitté (clic, Retour / Suivant) : la lightbox se referme et libère le
  // défilement de la page, le panneau restant monté mais masqué.
  const panelActive = usePanelActive();
  useEffect(() => {
    if (!panelActive) setLightbox(null);
  }, [panelActive]);

  const provided = submission.answers.filter((a) => !a.notFound);
  const missing = submission.answers.filter((a) => a.notFound);

  async function open(fileId: string, mode: "download" | "preview") {
    setError(null);
    const res = await fileUrl({ data: { fileId } });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (mode === "preview") setLightbox({ fileId, url: res.data.url, name: res.data.name });
    else triggerDownload(res.data.url, res.data.name);
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
    <div className="space-y-5 border-t border-border pt-4">
      <QualificationBlock submission={submission} canWrite={canWrite} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-label="Réponses transmises">
          <h4 className="text-eyebrow text-sawaz">
            Réponses transmises · {provided.length}
          </h4>
          {provided.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aucune réponse enregistrée.</p>
          ) : (
            <dl className="mt-2 divide-y divide-border text-sm">
              {provided.map((a) => (
                <div key={a.key} className="flex justify-between gap-4 py-1.5">
                  <dt className="text-muted-foreground">{answerLabel(a.key)}</dt>
                  <dd className="max-w-[55%] text-right font-medium text-foreground">
                    {humanValue(a.value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section aria-label="Données indisponibles">
          <h4 className="text-eyebrow text-sawaz">Données indisponibles · {missing.length}</h4>
          {missing.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aucune donnée déclarée indisponible.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {missing.map((a) => (
                <li
                  key={a.key}
                  className="rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-muted-foreground"
                >
                  {answerLabel(a.key)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-label="Documents transmis">
        <h4 className="text-eyebrow text-sawaz">Documents transmis · {submission.files.length}</h4>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-2">
          <DocumentGroups files={submission.files} onOpen={(id, mode) => void open(id, mode)} />
        </div>
      </section>

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
                onClick={() => void open(lightbox.fileId, "download")}
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
    </div>
  );
}

/** Qualification Sawaz : lecture pour tous, (re)qualification pour owner / analyst. */
function QualificationBlock({
  submission,
  canWrite,
}: {
  submission: StudioSubmission;
  canWrite: boolean;
}) {
  const q = submission.qualification;
  const [editing, setEditing] = useState(false);

  return (
    <section
      aria-label="Qualification Sawaz"
      className="rounded-lg border border-dashed border-border bg-surface-raised/60 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-eyebrow text-muted-foreground">Qualification Sawaz · décision interne</p>
          <p className="mt-1 text-sm text-foreground">
            <span className="font-semibold">{qualificationLabel(q)}</span>
            {q ? (
              <>
                {" · "}
                {q.includedInAnalysis ? "incluse dans l’analyse" : "hors corpus actif"}
                {q.respondentLabel ? ` · ${q.respondentLabel} (${ATTRIBUTION_LABEL[q.attributionSource]})` : ""}
              </>
            ) : (
              " · cette réponse n’alimente pas le corpus actif"
            )}
          </p>
          {q?.reason ? <p className="mt-0.5 text-xs text-muted-foreground">{q.reason}</p> : null}
          {q ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Qualifiée le {formatParisDateTime(q.qualifiedAt)}
              {q.qualifiedBy ? "" : " · initialisation Sawaz"}
            </p>
          ) : null}
        </div>
        {canWrite && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-sawaz transition hover:bg-sawaz/5"
          >
            {q ? "Requalifier" : "Qualifier"}
          </button>
        ) : null}
      </div>
      {canWrite && editing ? (
        <QualificationForm submission={submission} onDone={() => setEditing(false)} />
      ) : null}
    </section>
  );
}

function QualificationForm({
  submission,
  onDone,
}: {
  submission: StudioSubmission;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const qualify = useServerFn(qualifyStudioSubmission);
  const q = submission.qualification;
  const [classification, setClassification] = useState<Classification>(
    q?.classification ?? "historical",
  );
  const [label, setLabel] = useState(q?.respondentLabel ?? "");
  const [source, setSource] = useState<AttributionSource>(q?.attributionSource ?? "unknown");
  const [reason, setReason] = useState(q?.reason ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      qualify({
        data: {
          submissionId: submission.id,
          classification,
          respondentLabel: label.trim() || null,
          attributionSource: source,
          reason: reason.trim() || null,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) return;
      void qc.invalidateQueries({ queryKey: ["studio-dossier"] });
      void qc.invalidateQueries({ queryKey: ["studio-clients"] });
      onDone();
    },
  });

  const labelWithoutSource = label.trim() !== "" && source === "unknown";
  const result = mutation.data;

  return (
    <form
      className="mt-3 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!labelWithoutSource) mutation.mutate();
      }}
    >
      <label className="text-xs font-semibold text-muted-foreground">
        Qualification
        <select
          value={classification}
          onChange={(e) => setClassification(e.target.value as Classification)}
          className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground"
        >
          {CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>
              {CLASSIFICATION_LABEL[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-muted-foreground">
        Source de l’attribution
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as AttributionSource)}
          className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground"
        >
          <option value="manual_sawaz">{ATTRIBUTION_LABEL.manual_sawaz}</option>
          <option value="technical">{ATTRIBUTION_LABEL.technical}</option>
          <option value="unknown">{ATTRIBUTION_LABEL.unknown}</option>
        </select>
      </label>
      <label className="text-xs font-semibold text-muted-foreground">
        Répondant attribué (facultatif)
        <input
          value={label}
          maxLength={120}
          onChange={(e) => setLabel(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground"
        />
      </label>
      <label className="text-xs font-semibold text-muted-foreground">
        Motif (facultatif)
        <input
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground"
        />
      </label>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        Seule une référence alimente le corpus actif. Une attribution Sawaz n’est pas une identité
        techniquement prouvée. Chaque qualification est tracée et ne supprime aucune donnée.
      </p>
      {labelWithoutSource ? (
        <p role="alert" className="text-xs text-destructive sm:col-span-2">
          Indique la source de l’attribution avant de nommer un répondant.
        </p>
      ) : null}
      {result && !result.ok ? (
        <p role="alert" className="text-xs text-destructive sm:col-span-2">
          {result.error}
        </p>
      ) : null}
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={mutation.isPending || labelWithoutSource}
          className="rounded-md bg-sawaz px-3 py-1.5 text-xs font-semibold text-sawaz-foreground transition hover:bg-sawaz/90 disabled:opacity-60"
        >
          {mutation.isPending ? "Enregistrement…" : "Enregistrer la qualification"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

/** Badge de qualification, visuellement distinct du statut technique. */
export function QualificationBadge({ submission }: { submission: StudioSubmission }) {
  const q = submission.qualification;
  return (
    <StatusBadge tone={q?.classification === "reference" ? "gold" : "neutral"}>
      {qualificationLabel(q)}
    </StatusBadge>
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
