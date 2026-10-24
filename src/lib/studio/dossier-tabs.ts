/**
 * Onglets du dossier client (Sawaz Pilot). Le hash de l'URL est l'unique source de
 * l'onglet actif : partageable, conservé au rafraîchissement, suivi par les boutons
 * Retour / Suivant du navigateur. Jamais déduit de la position de défilement.
 */

export const DOSSIER_TABS = [
  { id: "vue-ensemble", label: "Vue d’ensemble" },
  { id: "missions", label: "Missions" },
  { id: "reponses", label: "Réponses" },
  { id: "indicateurs", label: "Indicateurs" },
  { id: "analyse", label: "Analyse" },
  { id: "restitution", label: "Restitution" },
] as const;

export type DossierTabId = (typeof DOSSIER_TABS)[number]["id"];

export const DEFAULT_DOSSIER_TAB: DossierTabId = "vue-ensemble";

const TAB_IDS = new Set<string>(DOSSIER_TABS.map((tab) => tab.id));

export function isDossierTab(value: string): value is DossierTabId {
  return TAB_IDS.has(value);
}

/** `#reponses`, `reponses` ou `%23reponses` → `reponses` ; tout autre hash → Vue d'ensemble. */
export function tabFromHash(hash: string | null | undefined): DossierTabId {
  if (!hash) return DEFAULT_DOSSIER_TAB;
  let value = hash;
  try {
    value = decodeURIComponent(hash);
  } catch {
    /* hash mal encodé : traité tel quel */
  }
  value = value.replace(/^#/, "").trim();
  return isDossierTab(value) ? value : DEFAULT_DOSSIER_TAB;
}

export const tabElementId = (id: DossierTabId) => `onglet-${id}`;
export const panelElementId = (id: DossierTabId) => `panneau-${id}`;

/** Navigation clavier du motif « onglets » (WAI-ARIA) : flèches, Début, Fin. */
export function tabForKey(current: DossierTabId, key: string): DossierTabId | null {
  const index = DOSSIER_TABS.findIndex((tab) => tab.id === current);
  const last = DOSSIER_TABS.length - 1;
  const target =
    key === "ArrowRight"
      ? index === last
        ? 0
        : index + 1
      : key === "ArrowLeft"
        ? index === 0
          ? last
          : index - 1
        : key === "Home"
          ? 0
          : key === "End"
            ? last
            : null;
  return target === null ? null : (DOSSIER_TABS[target]?.id ?? null);
}
