import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const storeSource = readFileSync(
  join(import.meta.dir, "..", "src", "lib", "collection", "store.tsx"),
  "utf8",
);
const layoutSource = readFileSync(
  join(import.meta.dir, "..", "src", "routes", "collecte.tsx"),
  "utf8",
);
const validationSource = readFileSync(
  join(import.meta.dir, "..", "src", "routes", "collecte.validation.tsx"),
  "utf8",
);
const normalizedStoreSource = storeSource.replace(/\r\n/g, "\n");

describe("mode démonstration sans écriture distante", () => {
  test("le paramètre demo est explicite et conservé pendant la navigation", () => {
    expect(layoutSource).toContain('demo: search.demo === "1" ? "1" : undefined');
    expect(layoutSource).toContain('retainSearchParams(["demo"])');
    expect(layoutSource).toContain("<CollectionProvider demoMode={demoMode}>");
  });

  test("l'hydratation démo s'arrête avant toute ouverture de lien ou snapshot", () => {
    const demoGuard = storeSource.indexOf("if (demoRef.current) {");
    const firstOpenLink = storeSource.indexOf("collectionService.openLink(token)");
    const firstSnapshot = storeSource.indexOf("collectionService.snapshot()");
    expect(demoGuard).toBeGreaterThanOrEqual(0);
    expect(firstOpenLink).toBeGreaterThan(demoGuard);
    expect(firstSnapshot).toBeGreaterThan(demoGuard);
  });

  test("les réponses et fichiers démo restent locaux", () => {
    expect(normalizedStoreSource).toContain(
      "if (demoRef.current) {\n      pendingAnswers.current = {};",
    );
    expect(normalizedStoreSource).toContain("remoteId: `demo:${id}`");
    expect(normalizedStoreSource).toContain(
      "if (demoRef.current) {\n        collectionService.forgetFile(id);",
    );
    expect(normalizedStoreSource).toContain(
      "if (demoRef.current) return;\n    void collectionService.snapshot()",
    );
  });

  test("la transmission finale démo ne peut pas appeler submit", () => {
    const handlerStart = validationSource.indexOf("const handleSubmit = async () =>");
    const demoSubmit = validationSource.indexOf("if (demoMode)", handlerStart);
    const liveSubmit = validationSource.indexOf("collectionService.submit(expected)", handlerStart);
    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(demoSubmit).toBeGreaterThan(handlerStart);
    expect(liveSubmit).toBeGreaterThan(demoSubmit);
    expect(validationSource.slice(demoSubmit, liveSubmit)).toContain("markSubmitted(Date.now())");
    expect(validationSource.slice(demoSubmit, liveSubmit)).toContain("return;");
  });
});
