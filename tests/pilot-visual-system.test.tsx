import { describe, expect, test } from "bun:test";
import { FileStack } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

import { CardHeader, KpiCard, SummaryCard } from "../src/components/studio/DossierUI";
import { EmptyState } from "../src/components/studio/EmptyState";
import { MissionsPanel } from "../src/components/studio/MissionsPanel";
import { StatusBadge } from "../src/components/StatusBadge";
import { collectionLabels, joinMeta, plural, SECTION_ICON } from "../src/lib/studio/sections";
import { DOSSIER_TABS } from "../src/lib/studio/dossier-tabs";
import { lftcSubmissions } from "./fixtures/lftc";

describe("composants visuels communs de Sawaz Pilot", () => {
  test("KPI : libellé, valeur dominante et sous-information centrés", () => {
    const html = renderToStaticMarkup(
      <KpiCard icon={FileStack} label="Documents analysables" value={16} hint="Corpus actif" />,
    );
    expect(html).toContain("data-kpi");
    expect(html).toContain("text-center");
    expect(html).toContain("min-h-[7.5rem]");
    expect(html).toContain(">16<");
    expect(html).toContain("Corpus actif");
    expect(html).toContain('aria-hidden="true"');
  });

  test("en-tête de carte : titre de section h2, carte de synthèse h3, action à droite", () => {
    const section = renderToStaticMarkup(
      <CardHeader
        icon={FileStack}
        tone="reponses"
        eyebrow="Réponses"
        title="Réponse de référence"
        aside={<span>badge</span>}
      />,
    );
    expect(section).toContain("<h2");
    expect(section).toContain("tone-reponses");
    expect(section).toContain("badge");

    const card = renderToStaticMarkup(
      <SummaryCard
        icon={FileStack}
        tone="analyse"
        title="Analyse"
        action={<a href="#analyse">Ouvrir</a>}
      >
        <p>Résumé</p>
      </SummaryCard>,
    );
    const id = card.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(card).toContain(`<h3 id="${id}"`);
    expect(card).toContain('href="#analyse"');
  });

  test("état vide : trois lignes structurées sous un titre", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Aucun indicateur pour l’instant" missing="a" why="b" next="c" />,
    );
    expect(html.match(/<dt/g)).toHaveLength(3);
    expect(html.match(/<dd/g)).toHaveLength(3);
    expect(html).toContain("Aucun indicateur pour l’instant");
  });

  test("badges : une seule famille visuelle (classe commune), tons de statut", () => {
    for (const tone of [
      "gold",
      "sawaz",
      "neutral",
      "success",
      "warn",
      "indigo",
      "cyan",
      "slate",
      "excluded",
    ] as const) {
      const html = renderToStaticMarkup(<StatusBadge tone={tone}>Référence</StatusBadge>);
      expect(html).toContain("status-badge");
      expect(html).toContain("rounded-full");
    }
    // « À vérifier » : ambre discret (jeton warn), jamais le rouge des erreurs.
    const warn = renderToStaticMarkup(<StatusBadge tone="warn">À vérifier</StatusBadge>);
    expect(warn).toContain("bg-warn/10");
    expect(warn).toContain("var(--color-warn)");
    expect(warn).not.toMatch(/destructive|--color-bad|text-bad|bg-bad/);
    // « Validé » : vert de statut ; « Mission en cours » : indigo ; « Collecte ouverte » : cyan.
    expect(renderToStaticMarkup(<StatusBadge tone="success">Validé</StatusBadge>)).toContain(
      "var(--color-good)",
    );
    expect(renderToStaticMarkup(<StatusBadge tone="indigo">Mission en cours</StatusBadge>)).toContain(
      "#5b5fc7",
    );
    expect(renderToStaticMarkup(<StatusBadge tone="cyan">Collecte ouverte</StatusBadge>)).toContain(
      "#0891b2",
    );
    expect(renderToStaticMarkup(<StatusBadge tone="slate">Attribution Sawaz</StatusBadge>)).toContain(
      "#64748b",
    );
    expect(renderToStaticMarkup(<StatusBadge tone="excluded">Exclu</StatusBadge>)).toContain(
      "#3f4a57",
    );
  });

  test("KPI : l'icône porte la teinte de sa famille métier", () => {
    const html = renderToStaticMarkup(
      <KpiCard icon={FileStack} tone="indicateurs" label="Indicateurs" value={12} />,
    );
    expect(html).toContain("tone-indicateurs");
    expect(html).toContain("section-icon");
  });

  test("carte de synthèse : filet d'accent de section", () => {
    const html = renderToStaticMarkup(
      <SummaryCard icon={FileStack} tone="missions" title="Missions">
        <p>Résumé</p>
      </SummaryCard>,
    );
    expect(html).toContain("section-accent");
    expect(html).toContain("tone-missions");
  });

  test("une icône par onglet, séparateur et pluriels sans cadratin", () => {
    for (const tab of DOSSIER_TABS) expect(SECTION_ICON[tab.id]).toBeDefined();
    expect(joinMeta(["14 réponses", null, "16 documents", false])).toBe(
      "14 réponses · 16 documents",
    );
    expect(plural(1, "réponse")).toBe("1 réponse");
    expect(plural(14, "réponse")).toBe("14 réponses");
    expect(plural(2, "note interne", "notes internes")).toBe("2 notes internes");
  });
});

describe("onglet Missions", () => {
  const projects = [
    { id: "p1", name: "Diagnostic LFTC", periodLabel: "Vague 1", status: "active" },
  ];

  test("carte de mission : statut, collectes traduites, aucune donnée inventée", () => {
    const html = renderToStaticMarkup(
      <MissionsPanel
        projects={projects}
        collections={[
          {
            id: "9b42c950",
            projectId: "p1",
            status: "open",
            openedAt: "2026-09-07T09:00:00Z",
            createdAt: "2026-09-06T16:00:00Z",
          },
          {
            id: "3101bc6c",
            projectId: "p1",
            status: "open",
            openedAt: null,
            createdAt: "2026-10-21T08:30:00Z",
          },
        ]}
        submissions={lftcSubmissions()}
      />,
    );
    expect(html).toContain("Diagnostic LFTC");
    expect(html).toContain("Mission en cours");
    expect(html.match(/Collecte ouverte/g)).toHaveLength(2);
    expect(html).toContain("2 ouvertes");
    expect(html).toContain("6 réponses · 1 référence");
    expect(html).toContain("1 réponse");
    // Collectes sans nom en base : libellé dérivé de la date d'ouverture, sinon de création.
    expect(html).toContain("Collecte · 7 sept. 2026");
    expect(html).toContain("ouverte le 7 sept. 2026 · 11:00");
    expect(html).toContain("Collecte · 21 oct. 2026");
    expect(html).toContain("créée le 21 oct. 2026 · 10:30");
    expect(html.match(/ouverte le/g)).toHaveLength(1);
    expect(html).toContain("Dernière activité");
    expect(html).not.toContain("—");
  });

  test("libellés de collecte : heure puis identifiant court en cas d'égalité", () => {
    const sameDay = collectionLabels([
      { id: "aaaaaaaa-1", openedAt: "2026-09-07T09:00:00Z", createdAt: "2026-09-01T00:00:00Z" },
      { id: "bbbbbbbb-2", openedAt: "2026-09-07T14:00:00Z", createdAt: "2026-09-01T00:00:00Z" },
    ]);
    expect(sameDay.get("aaaaaaaa-1")?.title).toBe("Collecte · 7 sept. 2026 · 11:00");
    expect(sameDay.get("bbbbbbbb-2")?.title).toBe("Collecte · 7 sept. 2026 · 16:00");

    const sameMinute = collectionLabels([
      { id: "aaaaaaaa-1", openedAt: "2026-09-07T09:00:00Z", createdAt: "2026-09-01T00:00:00Z" },
      { id: "bbbbbbbb-2", openedAt: "2026-09-07T09:00:00Z", createdAt: "2026-09-01T00:00:00Z" },
    ]);
    expect(sameMinute.get("bbbbbbbb-2")?.title).toBe("Collecte · 7 sept. 2026 · 11:00 · bbbbbbbb");
  });

  test("aucune mission : état vide explicite", () => {
    const html = renderToStaticMarkup(
      <MissionsPanel projects={[]} collections={[]} submissions={[]} />,
    );
    expect(html).toContain("Aucune mission pour ce client");
    expect(html).toContain("Prochaine étape : ");
  });
});
