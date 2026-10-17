import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Règle produit : aucun cadratin « — » dans l'interface visible de la Collecte.
 * Les commentaires de code ne sont pas concernés : ils sont retirés avant contrôle.
 */
const root = join(import.meta.dir, "..", "src");
const routes = readdirSync(join(root, "routes"))
  .filter((name) => name.startsWith("collecte"))
  .map((name) => join("routes", name));

const FILES = [
  ...routes,
  "lib/steps.ts",
  "lib/collection/status.ts",
  "lib/collection/rules.ts",
  "lib/collection/collection.functions.ts",
  "lib/collection/session.server.ts",
  "components/StepTabs.tsx",
  "components/ProgressBar.tsx",
  "components/StepLayout.tsx",
  "components/NavigationFooter.tsx",
  "components/FileUploader.tsx",
  "components/FileTransferPanel.tsx",
  "components/OptionToggle.tsx",
  "components/MissingToggle.tsx",
  "components/ChoiceGroup.tsx",
  "components/SessionInvalidScreen.tsx",
  "components/BrandHeader.tsx",
];

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .map((line) => line.replace(/\s\/\/\s.*$/, ""))
    .join("\n");
}

describe("typographie de la Collecte", () => {
  test.each(FILES)("aucun cadratin visible dans %s", (path) => {
    const visible = withoutComments(readFileSync(join(root, path), "utf8"));
    const offending = visible.split("\n").filter((line) => line.includes("—"));
    expect(offending).toEqual([]);
  });
});
