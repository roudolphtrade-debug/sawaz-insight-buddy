import { describe, expect, test } from "bun:test";

import {
  activeCorpus,
  fileGroupOf,
  formatFileSize,
  formatParisDateTime,
  groupFiles,
  isInActiveCorpus,
  parseQualificationRow,
  partitionSubmissions,
  qualificationLabel,
  roleLabel,
  splitReviews,
  type StudioQualification,
} from "../src/lib/studio/qualification";
import { lftcSubmissions, qualification } from "./fixtures/lftc";

describe("lecture d'une qualification Sawaz Core", () => {
  const row = {
    id: "q1",
    submission_id: "s1",
    classification: "reference",
    included_in_analysis: true,
    respondent_label: "Raphaël",
    attribution_source: "manual_sawaz",
    reason: "Attribution métier validée par Sawaz pour le diagnostic LFTC",
    qualified_by: null,
    qualified_at: "2026-10-24T10:00:00Z",
  };

  test("une ligne valide devient une qualification distincte de la submission", () => {
    expect(parseQualificationRow(row)).toEqual({
      id: "q1",
      submissionId: "s1",
      classification: "reference",
      includedInAnalysis: true,
      respondentLabel: "Raphaël",
      attributionSource: "manual_sawaz",
      reason: "Attribution métier validée par Sawaz pour le diagnostic LFTC",
      qualifiedBy: null,
      qualifiedAt: "2026-10-24T10:00:00Z",
    });
  });

  test("une ligne illisible ou incohérente est ignorée (fallback « À qualifier »)", () => {
    expect(parseQualificationRow(null)).toBeNull();
    expect(parseQualificationRow({ ...row, classification: "gold" })).toBeNull();
    expect(parseQualificationRow({ ...row, attribution_source: "guess" })).toBeNull();
    expect(parseQualificationRow({ ...row, included_in_analysis: false })).toBeNull();
    expect(parseQualificationRow({ ...row, classification: "excluded" })).toBeNull();
    const { id: _id, ...withoutId } = row;
    expect(parseQualificationRow(withoutId)).toBeNull();
    expect(qualificationLabel(null)).toBe("À qualifier");
  });
});

describe("corpus actif", () => {
  test("seules les submissions included_in_analysis = true alimentent les KPI actifs", () => {
    const subs = lftcSubmissions();
    const corpus = activeCorpus(subs);
    expect(subs.filter(isInActiveCorpus).map((s) => s.id)).toEqual([
      "831da37a-661e-424b-9449-9e77edf3908f",
    ]);
    expect(corpus.references).toBe(1);
    expect(corpus.documents).toBe(16);
    // Les 31 documents bruts restent présents, mais hors KPI principal.
    expect(subs.reduce((n, s) => n + s.files.length, 0)).toBe(31);
  });

  test("Raphaël : la submission de 13:39 est la référence, attribution Sawaz", () => {
    const corpus = activeCorpus(lftcSubmissions());
    expect(corpus.respondents).toEqual([{ label: "Raphaël", attributionSource: "manual_sawaz" }]);
    expect(formatParisDateTime(corpus.lastReferenceAt)).toBe("21 oct. 2026 · 13:39");
  });

  test("la réponse de 22:13 ne rentre pas dans le corpus actif", () => {
    const { active, history } = partitionSubmissions(lftcSubmissions());
    const late = "86b0c97e-3be6-4702-b6bc-7e6c5eac2227";
    expect(active.some((s) => s.id === late)).toBe(false);
    expect(history.find((s) => s.id === late)?.qualification?.classification).toBe("excluded");
  });

  test("l'historique regroupe les autres réponses, sans jamais les compter", () => {
    const corpus = activeCorpus(lftcSubmissions());
    expect(corpus.historyCount).toBe(6);
    expect(corpus.historyByLabel).toEqual(
      expect.arrayContaining([
        { label: "Exclue", count: 1 },
        { label: "Historique", count: 4 },
        { label: "Brouillon", count: 1 },
      ]),
    );
  });

  test("plusieurs références légitimes dans une même collecte sont toutes comptées", () => {
    const subs = lftcSubmissions().map((s) =>
      s.id === "a045f0ff-0000-4000-8000-000000000005"
        ? { ...s, qualification: qualification("reference", true, "Second répondant") }
        : s,
    );
    const corpus = activeCorpus(subs);
    expect(corpus.references).toBe(2);
    expect(corpus.respondents.map((r) => r.label)).toEqual(["Raphaël", "Second répondant"]);
    expect(corpus.documents).toBe(22);
  });

  test("sans qualification lisible, aucune réponse n'est présentée comme référence", () => {
    const subs = lftcSubmissions().map((s) => ({
      ...s,
      qualification: null as StudioQualification | null,
    }));
    const corpus = activeCorpus(subs);
    expect(corpus.references).toBe(0);
    expect(corpus.documents).toBe(0);
    expect(corpus.lastReferenceAt).toBeNull();
    expect(corpus.historyByLabel).toEqual([{ label: "À qualifier", count: 7 }]);
  });
});

describe("documents regroupés", () => {
  test("YouTube (yt.*, c.*), Meta (m.*) et Autres, dans cet ordre, sans groupe vide", () => {
    expect(fileGroupOf("yt.capture.overview")).toBe("youtube");
    expect(fileGroupOf("c.dixVideos")).toBe("youtube");
    expect(fileGroupOf("m.results")).toBe("meta");
    expect(fileGroupOf("x.inconnu")).toBe("autres");
    const groups = groupFiles([
      { slot: "m.export" },
      { slot: "yt.export" },
      { slot: "m.captures" },
    ]);
    expect(groups.map((g) => [g.label, g.files.length])).toEqual([
      ["YouTube", 1],
      ["Meta", 2],
    ]);
  });

  test("tailles et dates au format français", () => {
    expect(formatFileSize(1.2 * 1024 * 1024)).toBe("1,2 Mo");
    expect(formatFileSize(340 * 1024)).toBe("340 Ko");
    expect(formatParisDateTime(null)).toBe("Date inconnue");
  });
});

describe("restitutions en double et terminologie", () => {
  test("la restitution la plus récente reste principale, l'ancienne passe en historique", () => {
    const { primary, older } = splitReviews([
      { id: "old", projectId: "p", collectionId: "c", createdAt: "2026-09-10T01:51:00Z" },
      { id: "new", projectId: "p", collectionId: "c", createdAt: "2026-09-10T01:54:00Z" },
      { id: "other", projectId: "p2", collectionId: null, createdAt: "2026-09-01T00:00:00Z" },
    ]);
    expect(primary.map((r) => r.id)).toEqual(["new", "other"]);
    expect(older.map((r) => r.id)).toEqual(["old"]);
  });

  test("les rôles techniques sont traduits", () => {
    expect(roleLabel("owner")).toBe("Propriétaire");
    expect(roleLabel("analyst")).toBe("Analyste");
    expect(roleLabel("viewer")).toBe("Lecteur");
    expect(roleLabel(null)).toBe("Aucun rôle");
  });
});
