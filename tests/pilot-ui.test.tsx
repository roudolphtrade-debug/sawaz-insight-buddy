import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { DocumentGroups } from "../src/components/studio/DocumentGroups";
import { EmptyState } from "../src/components/studio/EmptyState";
import { SubmissionsSection } from "../src/components/studio/SubmissionsSection";
import { lftcSubmissions } from "./fixtures/lftc";

describe("page Réponses", () => {
  test("la référence s'affiche en carte compacte, l'historique est replié par défaut", () => {
    let detailRendered = 0;
    const html = renderToStaticMarkup(
      <SubmissionsSection
        submissions={lftcSubmissions()}
        qualificationsAvailable
        renderDetail={() => {
          detailRendered += 1;
          return <p>détail</p>;
        }}
      />,
    );

    expect(html).toContain("Réponse de référence");
    expect(html).toContain("Raphaël");
    expect(html).toContain("Attribution Sawaz");
    expect(html).toContain("21 oct. 2026 · 13:39");
    expect(html).toContain("14 réponses");
    expect(html).toContain("16 documents");
    expect(html).toContain("Ouvrir");

    const history = html.match(/<details[^>]*data-history[^>]*>/)?.[0] ?? "";
    expect(history).not.toBe("");
    expect(history).not.toContain(" open");
    expect(html).toContain("Historique / essais");
    expect(html).toContain("6 réponses hors corpus actif");

    // Aucun détail (réponses, documents) n'est rendu tant qu'une réponse n'est pas ouverte.
    expect(detailRendered).toBe(0);
    expect(html).not.toContain("document-1.png");
  });

  test("qualification indisponible : repli propre, aucune référence affichée", () => {
    const subs = lftcSubmissions().map((s) => ({ ...s, qualification: null }));
    const html = renderToStaticMarkup(
      <SubmissionsSection
        submissions={subs}
        qualificationsAvailable={false}
        renderDetail={() => null}
      />,
    );
    expect(html).toContain("Qualification indisponible pour le moment");
    expect(html).not.toContain("data-reference-submission");
    expect(html).toContain("À qualifier");
    expect(html).toContain("7 réponses hors corpus actif");
  });
});

describe("documents d'une réponse", () => {
  test("regroupés YouTube / Meta / Autres avec compteurs, accordéons repliés", () => {
    const reference = lftcSubmissions().find((s) => s.id.startsWith("831da37a"));
    const html = renderToStaticMarkup(
      <DocumentGroups files={reference?.files ?? []} onOpen={() => {}} />,
    );
    const groups = [...html.matchAll(/<details[^>]*data-file-group="([a-z]+)"[^>]*>/g)];
    expect(groups.map((m) => m[1])).toEqual(["youtube", "meta", "autres"]);
    expect(groups.every((m) => !m[0].includes(" open"))).toBe(true);
    // 16 documents : 9 YouTube (yt.*, c.*), 5 Meta (m.*), 2 Autres.
    expect(html).toContain("9 documents");
    expect(html).toContain("5 documents");
    expect(html).toContain("2 documents");
    expect(html).toContain("1,2 Mo");
    expect(html).toContain("Aperçu");
    expect(html).toContain("Télécharger");
  });

  test("état vide explicite", () => {
    expect(renderToStaticMarkup(<DocumentGroups files={[]} onOpen={() => {}} />)).toContain(
      "Aucun document reçu",
    );
  });
});

describe("états vides et typographie de Sawaz Pilot", () => {
  test("un état vide explique ce qui manque, pourquoi et l'action suivante", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="Aucun indicateur"
        missing="les indicateurs"
        why="aucune extraction"
        next="extraire"
      />,
    );
    expect(html).toContain("Ce qui manque : ");
    expect(html).toContain("Pourquoi : ");
    expect(html).toContain("Prochaine étape : ");
  });

  test("aucun cadratin dans le rendu des écrans Réponses", () => {
    const html = renderToStaticMarkup(
      <SubmissionsSection
        submissions={lftcSubmissions()}
        qualificationsAvailable
        renderDetail={() => null}
      />,
    );
    expect(html).not.toContain("—");
  });

  const root = join(import.meta.dir, "..", "src");
  const pilotFiles = [
    ...readdirSync(join(root, "routes", "_authenticated")).map((f) =>
      join("routes", "_authenticated", f),
    ),
    ...readdirSync(join(root, "components", "studio")).map((f) => join("components", "studio", f)),
    ...readdirSync(join(root, "lib", "studio")).map((f) => join("lib", "studio", f)),
    "routes/auth.tsx",
    "routes/set-password.tsx",
    "routes/index.tsx",
    "routes/__root.tsx",
  ];

  const withoutComments = (source: string) =>
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .map((line) => line.replace(/\s\/\/\s.*$/, ""))
      .join("\n");

  test.each(pilotFiles)("aucun cadratin visible dans %s", (path) => {
    const visible = withoutComments(readFileSync(join(root, path), "utf8"));
    expect(visible.split("\n").filter((line) => line.includes("—"))).toEqual([]);
  });
});
