import { describe, expect, test } from "bun:test";

import { K, SLOT } from "../src/lib/collection/keys";
import {
  confirmedFileCount,
  exclusiveChoicesFor,
  fileProblems,
  hasExclusiveConflict,
  isFileConfirmed,
  missingFlagCorrections,
  missingFlagEvidence,
  missingFlagRule,
  MISSING_FLAG_RULES,
  toggleMultiChoice,
} from "../src/lib/collection/rules";
import {
  clearStaleTransfer,
  remainingUnconfirmed,
  replayUnconfirmedAnswers,
} from "../src/lib/collection/reconcile";
import {
  metaBlocker,
  metaIssues,
  metaSummary,
  youtubeBlocker,
  youtubeIssues,
  youtubeSummary,
} from "../src/lib/collection/status";
import { stateFromSnapshot } from "../src/lib/collection/snapshot";
import type { CollectionState, FileMeta } from "../src/lib/collection/types";

const file = (patch: Partial<FileMeta> = {}): FileMeta => ({
  id: patch.id ?? Math.random().toString(36).slice(2),
  name: "capture.png",
  size: 1000,
  type: "image/png",
  addedAt: 0,
  ...patch,
});
const confirmed = (patch: Partial<FileMeta> = {}) => file({ remoteId: "r1", ...patch });

const state = (
  answers: CollectionState["answers"] = {},
  files: CollectionState["files"] = {},
): CollectionState => ({ version: 1, answers, files, submittedAt: null });

/** État Meta complet et valide, modulable par question. */
const validMeta = (
  answers: CollectionState["answers"] = {},
  files: CollectionState["files"] = {},
) =>
  state(
    {
      [K.meta.periode]: "12m",
      [K.meta.objectifs]: ["trafic"],
      [K.meta.destination]: ["landing"],
      [K.meta.mode]: "captures",
      [K.meta.results]: ["clic"],
      [K.meta.tracking]: "oui",
      ...answers,
    },
    { [SLOT.metaCaptures]: [confirmed()], ...files },
  );

describe("choix multiples : « Je ne sais pas » exclusif", () => {
  const exclusive = exclusiveChoicesFor(K.meta.destination);

  test("les trois questions Meta déclarent « inconnu » comme exclusif", () => {
    for (const key of [K.meta.objectifs, K.meta.destination, K.meta.results]) {
      expect(exclusiveChoicesFor(key)).toEqual(["inconnu"]);
    }
    expect(exclusiveChoicesFor("question.sans.regle")).toEqual([]);
  });

  test("sélectionner « Je ne sais pas » efface les choix précis", () => {
    expect(toggleMultiChoice(["landing", "conversation"], "inconnu", exclusive)).toEqual([
      "inconnu",
    ]);
  });

  test("sélectionner un choix précis retire « Je ne sais pas »", () => {
    expect(toggleMultiChoice(["inconnu"], "landing", exclusive)).toEqual(["landing"]);
  });

  test("plusieurs choix précis restent cumulables, et un clic désélectionne", () => {
    expect(toggleMultiChoice(["landing"], "conversation", exclusive)).toEqual([
      "landing",
      "conversation",
    ]);
    expect(toggleMultiChoice(["landing", "conversation"], "landing", exclusive)).toEqual([
      "conversation",
    ]);
    expect(toggleMultiChoice(["inconnu"], "inconnu", exclusive)).toEqual([]);
  });

  test("sans option exclusive, le comportement reste un simple ajout/retrait", () => {
    expect(toggleMultiChoice(["a"], "inconnu", [])).toEqual(["a", "inconnu"]);
  });

  test("détection des sélections contradictoires héritées", () => {
    expect(hasExclusiveConflict(["landing", "inconnu"], exclusive)).toBe(true);
    expect(hasExclusiveConflict(["inconnu"], exclusive)).toBe(false);
    expect(hasExclusiveConflict(["landing", "plusieurs"], exclusive)).toBe(false);
  });
});

describe("fichier confirmé ≠ fichier en attente ou en échec", () => {
  test("seul un fichier confirmé côté serveur, sans envoi ni erreur, est transmis", () => {
    expect(isFileConfirmed(confirmed())).toBe(true);
    expect(isFileConfirmed(file())).toBe(false);
    expect(isFileConfirmed(file({ pending: true }))).toBe(false);
    expect(isFileConfirmed(confirmed({ pending: true }))).toBe(false);
    expect(isFileConfirmed(file({ error: "Échec", errorReason: "temporary" }))).toBe(false);
    expect(isFileConfirmed(file({ uploadPath: "a/b/c.png" }))).toBe(false);
  });

  test("confirmedFileCount ignore les fichiers non confirmés", () => {
    const s = state(
      {},
      { [SLOT.ytOverview]: [confirmed(), file({ pending: true }), file({ error: "x" })] },
    );
    expect(confirmedFileCount(s, SLOT.ytOverview)).toBe(1);
    expect(confirmedFileCount(s, SLOT.ytAudience)).toBe(0);
  });

  test("fileProblems classe chaque fichier non transmis", () => {
    const s = state(
      {},
      {
        [SLOT.guideVip]: [
          confirmed({ id: "ok" }),
          file({ id: "p", pending: true }),
          file({ id: "rm", uploadPath: "x", removing: true }),
          file({ id: "f", error: "Échec", errorReason: "temporary" }),
          file({ id: "u" }),
        ],
      },
    );
    expect(fileProblems(s).map((p) => [p.file.id, p.kind])).toEqual([
      ["p", "pending"],
      ["rm", "pending"],
      ["f", "failed"],
      ["u", "unconfirmed"],
    ]);
  });

  test("un récapitulatif n'affiche jamais « Transmis » pour un fichier en échec", () => {
    const s = state(
      { [K.yt.mode]: "captures" },
      { [SLOT.ytOverview]: [file({ error: "Échec", errorReason: "temporary" })] },
    );
    const overview = youtubeSummary(s).items.find((i) => i.label.startsWith("Capture Overview"));
    expect(overview?.status).toBe("attente");
  });

  test("un fichier en attente ne satisfait pas une exigence obligatoire", () => {
    const pending = state(
      { [K.yt.mode]: "export" },
      { [SLOT.ytExport]: [file({ pending: true })] },
    );
    expect(youtubeBlocker(pending)).not.toBeNull();
    const done = state({ [K.yt.mode]: "export" }, { [SLOT.ytExport]: [confirmed()] });
    expect(youtubeBlocker(done)).toBeNull();
  });
});

describe("indicateur « introuvable » ↔ fichier confirmé", () => {
  const pairs: Array<[string, string]> = [
    [K.yt.missingOverview, SLOT.ytOverview],
    [K.yt.missingContent, SLOT.ytContent],
    [K.yt.missingAudience, SLOT.ytAudience],
    [K.contenus.guideVipMissing, SLOT.guideVip],
    [K.contenus.skipDixVideos, SLOT.dixVideos],
    [K.yt.exportImpossible, SLOT.ytExport],
    [K.meta.exportImpossible, SLOT.metaExport],
    [K.meta.resultsMissing, SLOT.metaResults],
  ];

  test("toutes les paires attendues sont déclarées", () => {
    for (const [flag, slot] of pairs) {
      expect(missingFlagRule(flag)?.slots).toContain(slot);
    }
    expect(MISSING_FLAG_RULES.length).toBe(pairs.length);
  });

  test.each(pairs)("%s repasse à false dès qu'un fichier est confirmé", (flag, slot) => {
    expect(missingFlagCorrections(state({ [flag]: true }, { [slot]: [confirmed()] }))).toEqual({
      [flag]: false,
    });
  });

  test.each(pairs)("%s reste inchangé tant que le fichier n'est pas confirmé", (flag, slot) => {
    const s = state(
      { [flag]: true },
      { [slot]: [file({ pending: true }), file({ error: "Échec", errorReason: "temporary" })] },
    );
    expect(missingFlagCorrections(s)).toEqual({});
  });

  test("aucune correction si l'indicateur n'est pas actif", () => {
    expect(
      missingFlagCorrections(
        state({ [K.yt.missingOverview]: false }, { [SLOT.ytOverview]: [confirmed()] }),
      ),
    ).toEqual({});
  });

  test("Results : une réponse précise contredit « je ne trouve pas cette donnée »", () => {
    const rule = missingFlagRule(K.meta.resultsMissing)!;
    expect(missingFlagEvidence(state({ [K.meta.results]: ["clic"] }), rule)).toBe("answer");
    expect(
      missingFlagCorrections(state({ [K.meta.resultsMissing]: true, [K.meta.results]: ["clic"] })),
    ).toEqual({ [K.meta.resultsMissing]: false });
  });

  test("Results : « Je ne sais pas » seul n'est pas une preuve", () => {
    const s = state({ [K.meta.resultsMissing]: true, [K.meta.results]: ["inconnu"] });
    expect(missingFlagCorrections(s)).toEqual({});
  });

  test("la normalisation est appliquée au snapshot serveur comme au client", () => {
    const snap = stateFromSnapshot({
      clientName: "LFTC",
      collectionId: "c",
      submissionId: "s",
      status: "working",
      submittedAt: null,
      answers: { [K.yt.missingAudience]: true },
      files: [
        {
          id: "f1",
          slot: SLOT.ytAudience,
          name: "a.png",
          size: 10,
          mime: "image/png",
          uploadedAt: "2026-10-17T10:00:00Z",
        },
      ],
    });
    expect(missingFlagCorrections(snap)).toEqual({ [K.yt.missingAudience]: false });
  });
});

describe("règles de validation de la soumission", () => {
  test("un état Meta complet est accepté", () => {
    expect(metaBlocker(validMeta())).toBeNull();
  });

  test.each([K.meta.objectifs, K.meta.destination, K.meta.results])(
    "%s : « Je ne sais pas » combiné à une autre réponse bloque la transmission",
    (key) => {
      const s = validMeta({ [key]: ["inconnu", key === K.meta.results ? "clic" : "trafic"] });
      expect(metaBlocker(s)).toContain("Je ne sais pas");
    },
  );

  test("destination : l'ancienne valeur « plusieurs » reste lisible et valide", () => {
    expect(metaBlocker(validMeta({ [K.meta.destination]: ["plusieurs"] }))).toBeNull();
    const item = metaSummary(validMeta({ [K.meta.destination]: ["plusieurs"] })).items.find(
      (i) => i.label === "Destination après le clic",
    );
    expect(item?.status).toBe("transmis");
  });

  test("Results « Je ne sais pas » exige une capture confirmée, ou l'indicateur introuvable", () => {
    expect(metaIssues(validMeta({ [K.meta.results]: ["inconnu"] })).map((i) => i.id)).toContain(
      "meta-results",
    );
    expect(
      metaBlocker(
        validMeta({ [K.meta.results]: ["inconnu"] }, { [SLOT.metaResults]: [confirmed()] }),
      ),
    ).toBeNull();
    expect(
      metaBlocker(
        validMeta(
          { [K.meta.results]: ["inconnu"] },
          { [SLOT.metaResults]: [file({ pending: true })] },
        ),
      ),
    ).not.toBeNull();
    expect(
      metaBlocker(validMeta({ [K.meta.results]: ["inconnu"], [K.meta.resultsMissing]: true })),
    ).toBeNull();
  });

  test("captures YouTube : fichier confirmé ou indicateur introuvable, pour chaque écran", () => {
    const base = { [K.yt.mode]: "captures" };
    expect(youtubeIssues(state(base)).map((i) => i.id)).toEqual([
      "yt-capture-overview",
      "yt-capture-content",
      "yt-capture-audience",
    ]);
    const s = state(
      { ...base, [K.yt.missingContent]: true },
      { [SLOT.ytOverview]: [confirmed()], [SLOT.ytAudience]: [confirmed()] },
    );
    expect(youtubeBlocker(s)).toBeNull();
  });
});

describe("reprise des réponses non confirmées", () => {
  test("les réponses persistées rejoignent la file, la saisie en mémoire l'emporte", () => {
    expect(replayUnconfirmedAnswers({ a: "local", b: ["x"] }, { b: ["y"] })).toEqual({
      a: "local",
      b: ["y"],
    });
  });

  test("seules les valeurs effectivement confirmées sortent de la liste", () => {
    const sent = ["landing"];
    const newer = ["landing", "conversation"];
    expect(remainingUnconfirmed({ a: sent, b: "x" }, { a: sent })).toEqual({ b: "x" });
    expect(remainingUnconfirmed({ a: newer }, { a: sent })).toEqual({ a: newer });
  });

  test("un envoi relu depuis le cache n'est plus affiché comme en cours", () => {
    expect(clearStaleTransfer(file({ pending: true })).pending).toBe(false);
    expect(clearStaleTransfer(file({ removing: true })).removing).toBe(false);
    const untouched = confirmed();
    expect(clearStaleTransfer(untouched)).toBe(untouched);
  });
});
