import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou P1-B : la persistance des réponses ne doit jamais revenir à une séquence
 * DELETE -> INSERT. L'unicité (submission_id, question_key) est garantie en base ;
 * persistAnswers doit donc utiliser l'UPSERT ciblé correspondant.
 */
const source = readFileSync(
  join(import.meta.dir, "..", "src", "lib", "collection", "session.server.ts"),
  "utf8",
);

const start = source.indexOf("export async function persistAnswers(");
const end = source.indexOf("\nexport async function createUploadTicket(", start);
const persistAnswersSource = source.slice(start, end);

describe("persistance atomique des réponses", () => {
  test("persistAnswers utilise un UPSERT sur submission_id + question_key", () => {
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(persistAnswersSource).toContain('.from("answers")');
    expect(persistAnswersSource).toContain(".upsert(rows, { onConflict: \"submission_id,question_key\" })");
  });

  test("persistAnswers ne supprime plus les réponses avant leur écriture", () => {
    expect(persistAnswersSource).not.toContain(".delete()");
    expect(persistAnswersSource).not.toContain(".insert(rows)");
  });
});
