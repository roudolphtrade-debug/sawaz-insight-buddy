/**
 * Test navigateur (Chromium réel) du système visuel du dossier : canevas, grille,
 * badges, KPI et responsive, sur le vrai `StudioShell` + `DossierView` (données LFTC
 * de test, fonctions serveur stubées).
 *
 *   node tests/browser/dossier-layout.e2e.mjs
 *
 * `SCREENSHOTS=<dossier>` enregistre une capture pleine page par onglet et largeur.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { startHarness, WRITES } from "./harness-server.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");

const TABS = ["vue-ensemble", "missions", "reponses", "indicateurs", "analyse", "restitution"];
const WIDTHS = [1920, 1440, 1024, 768, 375];
const shots = process.env.SCREENSHOTS;
if (shots) mkdirSync(shots, { recursive: true });

const { server, base } = await startHarness();
const browser = await chromium.launch();
const pageErrors = [];
let steps = 0;
const ok = (name) => {
  steps += 1;
  console.log(`  ✓ ${name}`);
};

try {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on("pageerror", (error) => pageErrors.push(`${width}px: ${error.message}`));

    for (const tab of TABS) {
      await page.goto(`${base}/rempli/studio/lftc#${tab}`);
      await page.waitForSelector(`[data-dossier-panel="${tab}"]:not([hidden])`);
      await page.waitForTimeout(100);

      const m = await page.evaluate(() => {
        const visible = [...document.querySelectorAll('[role="tabpanel"]')].filter((p) =>
          p.checkVisibility(),
        );
        const badges = [...document.querySelectorAll(".status-badge")].filter((b) =>
          b.checkVisibility(),
        );
        return {
          scrollWidth: document.documentElement.scrollWidth,
          canvas: document.querySelector("[data-pilot-canvas]").getBoundingClientRect().width,
          visible: visible.map((p) => p.dataset.dossierPanel),
          badgeHeights: [
            ...new Set(badges.map((b) => Math.round(b.getBoundingClientRect().height))),
          ],
          emDash: document.body.innerText.includes("—"),
        };
      });

      assert.ok(
        m.scrollWidth <= width,
        `${width}px #${tab} : débordement horizontal (${m.scrollWidth})`,
      );
      assert.deepEqual(m.visible, [tab], `${width}px : seul #${tab} est visible`);
      assert.deepEqual(m.badgeHeights, [24], `${width}px #${tab} : badges de hauteur unique`);
      assert.equal(m.emDash, false, `${width}px #${tab} : aucun cadratin`);
      if (shots) {
        await page.screenshot({ path: join(shots, `${width}-${tab}.png`), fullPage: true });
      }
    }
    ok(`${width}px : six onglets sans débordement, un seul panneau visible, badges homogènes`);

    // Canevas : large sur desktop, borné à 1480 px, pleine largeur utile sur mobile.
    await page.goto(`${base}/rempli/studio/lftc#vue-ensemble`);
    await page.waitForSelector("[data-kpi]");
    const canvas = await page.evaluate(
      () => document.querySelector("[data-pilot-canvas]").getBoundingClientRect().width,
    );
    if (width >= 1920) assert.equal(canvas, 1480);
    if (width === 1440) assert.ok(canvas >= 1150, `canevas ${canvas}`);
    if (width === 375) assert.equal(canvas, 375 - 32);

    // KPI : même hauteur, chiffres centrés.
    const kpis = await page.$$eval("[data-kpi]", (cards) =>
      cards.map((c) => ({
        height: Math.round(c.getBoundingClientRect().height),
        align: getComputedStyle(c).textAlign,
        valueCentre: (() => {
          const value = c.children[1].getBoundingClientRect();
          const box = c.getBoundingClientRect();
          return Math.abs(value.left + value.width / 2 - (box.left + box.width / 2));
        })(),
      })),
    );
    assert.equal(kpis.length, 7, "sept KPI");
    assert.equal(
      new Set(kpis.map((k) => k.height)).size,
      1,
      `KPI de hauteurs ${kpis.map((k) => k.height)}`,
    );
    for (const k of kpis) {
      assert.equal(k.align, "center");
      assert.ok(k.valueCentre <= 1, "valeur centrée");
    }

    // Grille de synthèse : deux colonnes dès 1024 px, une seule en dessous.
    const columns = await page.$$eval(
      "[data-summary-card]",
      (cards) =>
        new Set(cards.slice(0, 4).map((c) => Math.round(c.getBoundingClientRect().left))).size,
    );
    assert.equal(columns, width >= 1024 ? 2 : 1, `${width}px : ${columns} colonne(s)`);

    // Onglets : barre défilable horizontalement sur mobile, page jamais élargie.
    const tablist = await page.$eval('[role="tablist"]', (t) => ({
      overflow: getComputedStyle(t).overflowX,
      scrolls: t.scrollWidth > t.clientWidth,
    }));
    assert.equal(tablist.overflow, "auto");
    if (width === 375) assert.equal(tablist.scrolls, true);
    ok(`${width}px : canevas ${canvas}px, KPI alignés, grille ${columns} colonne(s)`);

    await page.close();
  }

  // Carte de synthèse → onglet : même navigation (hash + historique), focus sur le panneau.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/rempli/studio/lftc`);
  await page.getByRole("link", { name: "Voir les réponses" }).click();
  await page.waitForSelector('[data-dossier-panel="reponses"]:not([hidden])');
  assert.equal(new URL(page.url()).hash, "#reponses");
  await page.waitForFunction(() => document.activeElement?.id === "panneau-reponses");
  await page.goBack();
  await page.waitForSelector('[data-dossier-panel="vue-ensemble"]:not([hidden])');
  ok("lien de synthèse : onglet ouvert, focus sur le panneau, Retour revient à la Vue d'ensemble");

  // Brouillon toujours conservé dans le dossier complet, sans enregistrement.
  await page.getByRole("tab", { name: "Analyse", exact: true }).click();
  await page.fill('[aria-label="Titre de l\'analyse"]', "Brouillon dossier complet");
  await page.getByRole("tab", { name: "Restitution", exact: true }).click();
  await page.getByRole("tab", { name: "Analyse", exact: true }).click();
  assert.equal(
    await page.inputValue('[aria-label="Titre de l\'analyse"]'),
    "Brouillon dossier complet",
  );
  const writes = await page.evaluate(
    (names) => window.__serverCalls.filter((c) => names.includes(c.name)).length,
    WRITES,
  );
  assert.equal(writes, 0);
  ok("dossier complet : brouillon Analyse conservé, aucun enregistrement serveur");

  assert.deepEqual(pageErrors, [], "aucune erreur JavaScript");
  console.log(`\n${steps} étapes réussies`);
} catch (error) {
  console.error(`\n✗ échec après ${steps} étape(s)`);
  console.error(error);
  if (pageErrors.length) console.error("Erreurs page :", pageErrors);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
