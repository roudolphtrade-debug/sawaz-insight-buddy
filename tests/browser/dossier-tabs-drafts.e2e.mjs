/**
 * Test de régression navigateur (Chromium réel) : brouillons conservés entre onglets.
 *
 *   node tests/browser/dossier-tabs-drafts.e2e.mjs
 *
 * Nécessite Playwright et Chromium (préinstallés dans l'environnement cloud). Le nom en
 * `.e2e.mjs` le garde hors de `bun test`. La page (tests/browser/harness) monte les vrais
 * DossierTabs / AnalysesPanel / ReviewsPanel ; fonctions serveur et client Supabase sont
 * des stubs qui journalisent chaque appel, le test exige zéro enregistrement.
 */
import react from "@vitejs/plugin-react";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const { chromium } = createRequire(import.meta.url)("playwright");

const here = dirname(fileURLToPath(import.meta.url));
const harness = join(here, "harness");
const stubs = join(harness, "stubs");
const src = join(here, "..", "..", "src");

const WRITES = ["saveStudioAnalysis", "deleteStudioAnalysis", "createReview"];

const server = await createServer({
  configFile: false,
  root: harness,
  logLevel: "error",
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: /^@tanstack\/react-start$/, replacement: join(stubs, "react-start.ts") },
      {
        find: /^@\/lib\/studio\/studio\.functions$/,
        replacement: join(stubs, "studio.functions.ts"),
      },
      {
        find: /^@\/lib\/studio\/review\.functions$/,
        replacement: join(stubs, "review.functions.ts"),
      },
      {
        find: /^@\/integrations\/supabase\/client$/,
        replacement: join(stubs, "supabase-client.ts"),
      },
      { find: /^@\//, replacement: `${src}/` },
    ],
  },
  server: { host: "127.0.0.1", port: 5199, strictPort: false },
});
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, "");

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
const foreignRequests = [];
page.on("request", (request) => {
  if (!request.url().startsWith(base)) foreignRequests.push(request.url());
});

/** Panneaux réellement rendus visibles par le navigateur. */
const visiblePanels = () =>
  page.$$eval('[role="tabpanel"]', (panels) =>
    panels.filter((p) => p.checkVisibility()).map((p) => p.dataset.dossierPanel),
  );
const selectedTab = () => page.getAttribute('[role="tab"][aria-selected="true"]', "href");
const writes = () =>
  page.evaluate(
    (names) => window.__serverCalls.filter((c) => names.includes(c.name)).map((c) => c.name),
    WRITES,
  );
const clickTab = (name) => page.getByRole("tab", { name, exact: true }).click();
const title = () => page.locator('[aria-label="Titre de l\'analyse"]');
const body = () => page.locator('[aria-label="Contenu de l\'analyse"]');

async function expectActive(id) {
  await page.waitForFunction(
    (expected) =>
      document.querySelector('[role="tab"][aria-selected="true"]')?.getAttribute("href") ===
      `#${expected}`,
    id,
  );
  assert.equal(new URL(page.url()).hash, `#${id}`);
  assert.equal(await selectedTab(), `#${id}`);
  assert.deepEqual(await visiblePanels(), [id], `seul le panneau ${id} est visible`);
}

const results = [];
async function step(name, fn) {
  await fn();
  results.push(name);
  console.log(`  ✓ ${name}`);
}

try {
  await page.goto(`${base}/studio/lftc#analyse`);
  await page.waitForSelector('[role="tablist"]');

  await step("ouverture directe #analyse : Analyse actif, seul panneau visible", async () => {
    await expectActive("analyse");
  });

  await step("Analyse → saisie brouillon → Réponses → Analyse : saisie conservée", async () => {
    await title().fill("Constat brouillon LFTC");
    await body().fill("Texte non enregistré, ne doit pas être perdu.");
    await clickTab("Réponses");
    await expectActive("reponses");
    await clickTab("Analyse");
    await expectActive("analyse");
    assert.equal(await title().inputValue(), "Constat brouillon LFTC");
    assert.equal(await body().inputValue(), "Texte non enregistré, ne doit pas être perdu.");
  });

  await step("panneau masqué : hors focus clavier (Tab et focus() programmatique)", async () => {
    await clickTab("Réponses");
    await expectActive("reponses");
    const hidden = await page.$$eval('[role="tabpanel"]', (panels) =>
      panels.filter((p) => !p.checkVisibility()).map((p) => [p.hidden, p.inert]),
    );
    assert.equal(hidden.length, 5);
    for (const state of hidden) assert.deepEqual(state, [true, true]);

    // Focus programmatique refusé par `inert`.
    const focused = await page.evaluate(() => {
      const input = document.querySelector('[aria-label="Titre de l\'analyse"]');
      input.focus();
      return document.activeElement === input;
    });
    assert.equal(focused, false);

    // Parcours complet au clavier : jamais dans un panneau masqué.
    await page.getByRole("tab", { name: "Réponses", exact: true }).focus();
    const visited = [];
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press("Tab");
      visited.push(
        await page.evaluate(() => {
          const panel = document.activeElement?.closest('[role="tabpanel"]');
          return panel ? `${panel.dataset.dossierPanel}:${panel.hidden}` : "hors-panneau";
        }),
      );
    }
    assert.ok(
      !visited.some((v) => v.endsWith(":true")),
      `focus dans un panneau masqué : ${visited}`,
    );
    assert.ok(visited.includes("reponses:false"), "le panneau actif reste atteignable");
  });

  await step("brouillon de restitution conservé lui aussi", async () => {
    await clickTab("Restitution");
    await expectActive("restitution");
    await page.fill("#review-title", "Restitution brouillon");
    await clickTab("Indicateurs");
    await expectActive("indicateurs");
    await clickTab("Restitution");
    await expectActive("restitution");
    assert.equal(await page.inputValue("#review-title"), "Restitution brouillon");
  });

  await step("navigation clavier entre onglets (flèches) toujours fonctionnelle", async () => {
    await page.getByRole("tab", { name: "Restitution", exact: true }).focus();
    await page.keyboard.press("ArrowLeft");
    await expectActive("analyse");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "onglet-analyse");
    assert.equal(await title().inputValue(), "Constat brouillon LFTC");
  });

  await step("Retour / Suivant : l'onglet suit l'historique et le brouillon reste", async () => {
    // Historique : #analyse, #reponses, #analyse, #reponses, #restitution, #indicateurs,
    // #restitution, #analyse.
    await page.goBack();
    await expectActive("restitution");
    await page.goBack();
    await expectActive("indicateurs");
    await page.goForward();
    await expectActive("restitution");
    await page.goForward();
    await expectActive("analyse");
    assert.equal(await title().inputValue(), "Constat brouillon LFTC");
    assert.equal(await body().inputValue(), "Texte non enregistré, ne doit pas être perdu.");
  });

  await step(
    "aucun enregistrement serveur, aucun stockage navigateur, aucun appel Supabase",
    async () => {
      assert.deepEqual(await writes(), []);
      const calls = await page.evaluate(() => window.__serverCalls.map((c) => c.name));
      assert.ok(!calls.some((c) => c.startsWith("supabase.")), `accès Supabase : ${calls}`);
      assert.deepEqual(
        await page.evaluate(() => [localStorage.length, sessionStorage.length]),
        [0, 0],
      );
      assert.deepEqual(foreignRequests, []);
    },
  );

  await step("contrôle : seul le clic sur Enregistrer déclenche l'enregistrement", async () => {
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await page.waitForFunction(() =>
      window.__serverCalls.some((c) => c.name === "saveStudioAnalysis"),
    );
    assert.deepEqual(await writes(), ["saveStudioAnalysis"]);
  });

  await step("rafraîchissement sur #analyse : Analyse reste actif", async () => {
    await page.reload();
    await page.waitForSelector('[role="tablist"]');
    await expectActive("analyse");
  });

  assert.deepEqual(pageErrors, [], "aucune erreur JavaScript dans la page");
  console.log(`\n${results.length} étapes réussies`);
} catch (error) {
  console.error(`\n✗ échec après ${results.length} étape(s)`);
  console.error(error);
  if (pageErrors.length) console.error("Erreurs page :", pageErrors);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
