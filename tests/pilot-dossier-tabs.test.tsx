import { describe, expect, test } from "bun:test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { DossierTabs } from "../src/components/studio/DossierTabs";
import {
  DEFAULT_DOSSIER_TAB,
  DOSSIER_TABS,
  tabForKey,
  tabFromHash,
  type DossierTabId,
} from "../src/lib/studio/dossier-tabs";

const MARKER: Record<DossierTabId, string> = {
  "vue-ensemble": "Corpus actif du diagnostic",
  missions: "Missions et collectes",
  reponses: "Réponse de référence",
  indicateurs: "Vérification des indicateurs",
  analyse: "Constats, hypothèses et recommandations",
  restitution: "Restitution stratégique",
};

const panels = Object.fromEntries(
  DOSSIER_TABS.map((t) => [t.id, () => <p>{MARKER[t.id]}</p>]),
) as Record<DossierTabId, () => React.ReactNode>;

function render(hash: string) {
  return renderToStaticMarkup(
    <DossierTabs active={tabFromHash(hash)} onSelect={() => {}} panels={panels} />,
  );
}

/** Ouverture de chaque panneau : `[id, visible]`. */
const panelStates = (html: string) =>
  [...html.matchAll(/<div[^>]*role="tabpanel"[^>]*>/g)].map((m) => [
    m[0].match(/data-dossier-panel="([a-z-]+)"/)?.[1],
    !m[0].includes(" hidden"),
  ]);

const selectedTabs = (html: string) =>
  [...html.matchAll(/<a[^>]*role="tab"[^>]*>/g)]
    .filter((m) => m[0].includes('aria-selected="true"'))
    .map((m) => m[0].match(/href="#([a-z-]+)"/)?.[1]);

describe("hash de l'URL → onglet actif", () => {
  test.each(DOSSIER_TABS.map((t) => t.id))("#%s ouvre cet onglet", (id) => {
    expect(tabFromHash(`#${id}`)).toBe(id);
    expect(tabFromHash(id)).toBe(id);
  });

  test("hash absent, inconnu ou ancienne ancre : Vue d'ensemble", () => {
    for (const hash of [undefined, null, "", "#", "#inconnu", "#historique", "#%E0%A4%A"]) {
      expect(tabFromHash(hash)).toBe(DEFAULT_DOSSIER_TAB);
    }
    expect(tabFromHash("%23analyse")).toBe("analyse");
  });

  test("navigation clavier : flèches avec retour au début, Début et Fin", () => {
    expect(tabForKey("vue-ensemble", "ArrowRight")).toBe("missions");
    expect(tabForKey("restitution", "ArrowRight")).toBe("vue-ensemble");
    expect(tabForKey("vue-ensemble", "ArrowLeft")).toBe("restitution");
    expect(tabForKey("analyse", "Home")).toBe("vue-ensemble");
    expect(tabForKey("missions", "End")).toBe("restitution");
    expect(tabForKey("missions", "Enter")).toBeNull();
  });
});

describe("une seule section visible à la fois", () => {
  test.each(DOSSIER_TABS.map((t) => t.id))("#%s affiche uniquement sa section", (id) => {
    const html = render(`#${id}`);
    for (const tab of DOSSIER_TABS) {
      if (tab.id === id) expect(html).toContain(MARKER[tab.id]);
      else expect(html).not.toContain(MARKER[tab.id]);
    }
    expect(selectedTabs(html)).toEqual([id]);
    // Six panneaux référencés par aria-controls, un seul visible.
    expect(panelStates(html)).toEqual(DOSSIER_TABS.map((t) => [t.id, t.id === id]));
    expect(html).toContain(`id="panneau-${id}"`);
    expect(html).toContain(`aria-labelledby="onglet-${id}"`);
  });

  test("les panneaux masqués sont hors focus clavier et hors arbre d'accessibilité", () => {
    const html = render("#reponses");
    for (const m of html.matchAll(/<div[^>]*role="tabpanel"[^>]*>/g)) {
      const visible = m[0].includes('data-dossier-panel="reponses"');
      expect(m[0].includes(" hidden")).toBe(!visible);
      expect(m[0].includes(" inert")).toBe(!visible);
      expect(m[0]).toContain(`tabindex="${visible ? 0 : -1}"`);
    }
  });

  test("régression : #reponses n'active ni n'affiche l'Analyse", () => {
    const html = render("#reponses");
    expect(selectedTabs(html)).toEqual(["reponses"]);
    const analyseTab = html.match(/<a[^>]*href="#analyse"[^>]*>/)?.[0] ?? "";
    expect(analyseTab).toContain('aria-selected="false"');
    expect(analyseTab).toContain('tabindex="-1"');
    expect(html).not.toContain(MARKER.analyse);
    expect(html).not.toContain(MARKER.indicateurs);
    const analysePanel = html.match(/<div[^>]*data-dossier-panel="analyse"[^>]*>/)?.[0] ?? "";
    expect(analysePanel).toContain(" hidden");
    expect(analysePanel).toContain(" inert");
  });

  test("sémantique d'onglets complète", () => {
    const html = render("");
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(DOSSIER_TABS.length);
    for (const tab of DOSSIER_TABS) {
      expect(html).toContain(`aria-controls="panneau-${tab.id}"`);
      expect(html).toContain(`id="onglet-${tab.id}"`);
    }
    expect(selectedTabs(html)).toEqual(["vue-ensemble"]);
  });

  test("aucun cadratin dans les libellés d'onglets", () => {
    expect(render("").includes("—")).toBe(false);
  });
});

describe("URL et historique du navigateur (routeur TanStack, historique mémoire)", () => {
  function makeRouter(initial: string) {
    const rootRoute = createRootRoute();
    const dossierRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/studio/$clientId",
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([dossierRoute]),
      history: createMemoryHistory({ initialEntries: [initial] }),
    });
    // Comme dans l'application montée : `Transitioner` (RouterProvider) abonne le routeur
    // à l'historique, ce qui propage Retour / Suivant à l'état du routeur.
    router.history.subscribe(router.load);
    return router;
  }

  const activeTab = (router: ReturnType<typeof makeRouter>) =>
    tabFromHash(router.state.location.hash);

  async function settle(router: ReturnType<typeof makeRouter>, expected: DossierTabId) {
    for (let i = 0; i < 50 && activeTab(router) !== expected; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    return activeTab(router);
  }

  // Mêmes options que `useDossierTab` (DossierTabs.tsx).
  const goTo = (router: ReturnType<typeof makeRouter>, id: DossierTabId) =>
    router.navigate({
      to: ".",
      hash: id,
      replace: false,
      resetScroll: false,
      hashScrollIntoView: false,
    });

  test("ouverture directe ou rafraîchissement de /studio/lftc#analyse : Analyse reste actif", async () => {
    const router = makeRouter("/studio/lftc#analyse");
    await router.load();
    expect(activeTab(router)).toBe("analyse");
    expect(router.state.location.pathname).toBe("/studio/lftc");
  });

  test("sans hash : Vue d'ensemble, sans réécriture de l'URL", async () => {
    const router = makeRouter("/studio/lftc");
    await router.load();
    expect(activeTab(router)).toBe("vue-ensemble");
    expect(router.state.location.hash).toBe("");
  });

  test("clics puis Retour / Suivant : l'onglet suit l'historique", async () => {
    const router = makeRouter("/studio/lftc");
    await router.load();

    await goTo(router, "reponses");
    expect(activeTab(router)).toBe("reponses");
    expect(router.state.location.href).toBe("/studio/lftc#reponses");

    await goTo(router, "analyse");
    expect(activeTab(router)).toBe("analyse");

    router.history.back();
    expect(await settle(router, "reponses")).toBe("reponses");

    router.history.back();
    expect(await settle(router, "vue-ensemble")).toBe("vue-ensemble");

    router.history.forward();
    expect(await settle(router, "reponses")).toBe("reponses");

    router.history.forward();
    expect(await settle(router, "analyse")).toBe("analyse");
    expect(router.state.location.pathname).toBe("/studio/lftc");
  });
});

describe("le dossier n'utilise plus de scroll-spy", () => {
  test("ni IntersectionObserver ni ancres de section dans la page dossier", () => {
    const source = readFileSync(
      join(import.meta.dir, "..", "src", "routes", "_authenticated", "studio.$clientId.index.tsx"),
      "utf8",
    );
    expect(source).not.toContain("IntersectionObserver");
    expect(source).not.toContain("MissionNav");
    expect(source).not.toMatch(
      /id="(vue-ensemble|missions|reponses|indicateurs|analyse|restitution)"/,
    );
    expect(source).toContain("<DossierTabs");
  });
});
