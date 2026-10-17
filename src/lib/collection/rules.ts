import { K, SLOT } from "./keys";
import type { AnswerValue, CollectionState, FileMeta } from "./types";
import type { StepId } from "@/lib/steps";

/**
 * Règles métier pures de cohérence de la collecte, partagées entre l'interface, le
 * store et le serveur (`session.server.ts`). Aucune dépendance navigateur ni serveur :
 * testables indépendamment de React (voir `tests/`).
 */

/* ---------- Fichiers : confirmé ≠ en cours d'envoi ≠ en échec ---------- */

/**
 * Un fichier n'est réellement transmis que s'il est confirmé côté serveur (`remoteId`),
 * sans envoi en cours ni erreur. Seule définition utilisée pour la validation, les
 * récapitulatifs et les confirmations affichées.
 */
export function isFileConfirmed(file: FileMeta): boolean {
  return Boolean(file.remoteId) && !file.pending && !file.error;
}

export function confirmedFileCount(s: CollectionState, slot: string): number {
  return (s.files[slot] ?? []).filter(isFileConfirmed).length;
}

export type FileProblemKind = "pending" | "failed" | "unconfirmed";
export type FileProblem = { slot: string; file: FileMeta; kind: FileProblemKind };

/**
 * Fichiers présents localement mais pas (encore) transmis : en cours d'envoi ou de
 * suppression, en échec, ou jamais confirmés (ex. à re-sélectionner après une
 * actualisation). Une transmission finale ne doit jamais partir tant que cette liste
 * n'est pas vide — sinon ces fichiers seraient perdus sans que l'utilisateur le sache.
 */
export function fileProblems(s: CollectionState): FileProblem[] {
  const problems: FileProblem[] = [];
  for (const [slot, files] of Object.entries(s.files)) {
    for (const file of files) {
      if (isFileConfirmed(file)) continue;
      const kind: FileProblemKind =
        file.pending || file.removing ? "pending" : file.error ? "failed" : "unconfirmed";
      problems.push({ slot, file, kind });
    }
  }
  return problems;
}

/** Libellé et étape de chaque emplacement de fichier, pour orienter l'utilisateur. */
export const SLOT_INFO: Record<string, { label: string; step: StepId }> = {
  [SLOT.ytExport]: { label: "Export YouTube", step: "youtube" },
  [SLOT.ytOverview]: { label: "Capture YouTube · Overview", step: "youtube" },
  [SLOT.ytContent]: { label: "Capture YouTube · Content", step: "youtube" },
  [SLOT.ytAudience]: { label: "Capture YouTube · Audience", step: "youtube" },
  [SLOT.guideVip]: { label: "Zoom Guide VIP", step: "contenus" },
  [SLOT.dixVideos]: { label: "Captures des 10 vidéos", step: "contenus" },
  [SLOT.traffic]: { label: "Traffic Sources", step: "contenus" },
  [SLOT.newReturning]: { label: "New vs Returning Viewers", step: "contenus" },
  [SLOT.metaExport]: { label: "Export Meta", step: "meta" },
  [SLOT.metaCaptures]: { label: "Captures Meta", step: "meta" },
  [SLOT.metaResults]: { label: "Capture Results Meta", step: "meta" },
};

/* ---------- Choix multiples : options exclusives ---------- */

/**
 * Options exclusives par question à choix multiples (configuration déclarative) :
 * « Je ne sais pas » ne peut jamais coexister avec une réponse précise. Une question
 * absente de cette table n'a aucune option exclusive.
 */
export const EXCLUSIVE_CHOICES: Readonly<Record<string, readonly string[]>> = {
  [K.meta.objectifs]: ["inconnu"],
  [K.meta.destination]: ["inconnu"],
  [K.meta.results]: ["inconnu"],
};

const NO_EXCLUSIVE: readonly string[] = [];

export function exclusiveChoicesFor(key: string): readonly string[] {
  return EXCLUSIVE_CHOICES[key] ?? NO_EXCLUSIVE;
}

/**
 * Bascule d'une option : désélection si elle était choisie ; une option exclusive
 * remplace toute la sélection ; une option précise retire les options exclusives.
 */
export function toggleMultiChoice(
  values: readonly string[],
  value: string,
  exclusive: readonly string[],
): string[] {
  if (values.includes(value)) return values.filter((v) => v !== value);
  if (exclusive.includes(value)) return [value];
  return [...values.filter((v) => !exclusive.includes(v)), value];
}

/** Sélection contradictoire (option exclusive combinée à une autre réponse) — possible
 *  uniquement pour des données enregistrées avant l'introduction de cette règle. */
export function hasExclusiveConflict(values: readonly string[], exclusive: readonly string[]) {
  return values.length > 1 && values.some((v) => exclusive.includes(v));
}

/** Réponse précise (hors options exclusives « Je ne sais pas ») pour cette question. */
export function hasPreciseAnswer(s: CollectionState, key: string): boolean {
  const value = s.answers[key];
  const exclusive = exclusiveChoicesFor(key);
  if (Array.isArray(value)) return value.some((v) => !exclusive.includes(v));
  if (typeof value === "string") return value.trim() !== "" && !exclusive.includes(value);
  return false;
}

/* ---------- Indicateurs « introuvable » ↔ preuves réellement fournies ---------- */

/**
 * Un indicateur « Je ne trouve pas cette donnée » (ou équivalent) et la preuve qu'il
 * nie : un fichier confirmé sur l'un des `slots`, ou une réponse précise sur l'une des
 * `answerKeys`. Les deux ne doivent jamais coexister.
 */
export type MissingFlagRule = {
  flagKey: string;
  slots: readonly string[];
  answerKeys?: readonly string[];
  /** Explication affichée si l'utilisateur tente d'activer l'indicateur alors qu'un
   *  fichier confirmé existe déjà. */
  fileNotice: string;
  answerNotice?: string;
};

const CAPTURE_NOTICE =
  "Tu nous as déjà transmis un fichier pour cet élément. Si tu ne trouves finalement pas cette donnée, supprime d'abord ce fichier.";
const EXPORT_NOTICE =
  "Ton export a bien été reçu. Si tu n'arrives finalement pas à exporter, supprime d'abord ce fichier.";

export const MISSING_FLAG_RULES: readonly MissingFlagRule[] = [
  { flagKey: K.yt.missingOverview, slots: [SLOT.ytOverview], fileNotice: CAPTURE_NOTICE },
  { flagKey: K.yt.missingContent, slots: [SLOT.ytContent], fileNotice: CAPTURE_NOTICE },
  { flagKey: K.yt.missingAudience, slots: [SLOT.ytAudience], fileNotice: CAPTURE_NOTICE },
  { flagKey: K.yt.exportImpossible, slots: [SLOT.ytExport], fileNotice: EXPORT_NOTICE },
  { flagKey: K.contenus.guideVipMissing, slots: [SLOT.guideVip], fileNotice: CAPTURE_NOTICE },
  {
    flagKey: K.contenus.skipDixVideos,
    slots: [SLOT.dixVideos],
    fileNotice:
      "Tu nous as déjà transmis des captures pour cette partie. Pour la passer, supprime d'abord ces fichiers.",
  },
  { flagKey: K.meta.exportImpossible, slots: [SLOT.metaExport], fileNotice: EXPORT_NOTICE },
  {
    flagKey: K.meta.resultsMissing,
    slots: [SLOT.metaResults],
    answerKeys: [K.meta.results],
    fileNotice: CAPTURE_NOTICE,
    answerNotice:
      "Tu as déjà indiqué ce que compte la colonne Results. Si tu ne trouves finalement pas cette donnée, retire d'abord ta sélection.",
  },
];

export function missingFlagRule(flagKey: string): MissingFlagRule | undefined {
  return MISSING_FLAG_RULES.find((rule) => rule.flagKey === flagKey);
}

/** Nature de la preuve qui contredit l'indicateur, ou `null` s'il n'y en a aucune. */
export function missingFlagEvidence(
  s: CollectionState,
  rule: MissingFlagRule,
): "file" | "answer" | null {
  if (rule.slots.some((slot) => confirmedFileCount(s, slot) > 0)) return "file";
  if ((rule.answerKeys ?? []).some((key) => hasPreciseAnswer(s, key))) return "answer";
  return null;
}

/**
 * Corrections à appliquer : chaque indicateur actif contredit par une preuve réelle
 * repasse à `false`. Un fichier en cours d'envoi ou en échec n'est jamais une preuve.
 */
export function missingFlagCorrections(s: CollectionState): Record<string, AnswerValue> {
  const corrections: Record<string, AnswerValue> = {};
  for (const rule of MISSING_FLAG_RULES) {
    if (s.answers[rule.flagKey] === true && missingFlagEvidence(s, rule) !== null) {
      corrections[rule.flagKey] = false;
    }
  }
  return corrections;
}
