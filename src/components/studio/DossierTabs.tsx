import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import {
  DOSSIER_TABS,
  panelElementId,
  tabElementId,
  tabForKey,
  tabFromHash,
  type DossierTabId,
} from "@/lib/studio/dossier-tabs";
import { cn } from "@/lib/utils";

/**
 * Onglet actif du dossier, lu dans le hash de l'URL gérée par le routeur : ouverture
 * directe, rafraîchissement, Retour et Suivant restent cohérents. Un changement
 * d'onglet ajoute une entrée d'historique sans défilement automatique.
 */
export function useDossierTab() {
  const hash = useRouterState({ select: (state) => state.location.hash });
  const navigate = useNavigate();
  const active = tabFromHash(hash);

  const select = useCallback(
    (id: DossierTabId) => {
      if (id === active) return;
      void navigate({
        to: ".",
        hash: id,
        replace: false,
        resetScroll: false,
        hashScrollIntoView: false,
      });
    },
    [active, navigate],
  );

  return { active, select };
}

/** `true` dans le panneau visible, `false` dans un panneau masqué (encore monté). */
const PanelActiveContext = createContext(true);

/** Permet à un contenu (ex. une lightbox) de se refermer quand son onglet est quitté. */
export function usePanelActive() {
  return useContext(PanelActiveContext);
}

/**
 * Barre d'onglets (motif WAI-ARIA « tabs », activation automatique) et un seul panneau
 * visible à la fois. Chaque panneau est monté à sa première visite puis le reste,
 * masqué (`hidden` + `inert` : invisible, hors arbre d'accessibilité et hors focus
 * clavier) : une saisie non enregistrée survit donc à un changement d'onglet, sans
 * aucun stockage ni appel serveur. Présentationnel, testable sans routeur.
 */
export function DossierTabs({
  active,
  onSelect,
  panels,
}: {
  active: DossierTabId;
  onSelect: (id: DossierTabId) => void;
  panels: Record<DossierTabId, () => ReactNode>;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  // Panneaux déjà ouverts : conservés montés. Mise à jour pendant le rendu (état dérivé)
  // pour que le panneau demandé s'affiche dès ce rendu, sans image intermédiaire vide.
  const [visited, setVisited] = useState<ReadonlySet<DossierTabId>>(() => new Set([active]));
  if (!visited.has(active)) setVisited(new Set([...visited, active]));

  const activate = (id: DossierTabId, focus: boolean) => {
    onSelect(id);
    if (focus) document.getElementById(tabElementId(id))?.focus();
    // Haut du nouveau panneau juste sous la barre d'onglets, seulement si l'utilisateur
    // avait défilé au-delà : aucun saut lorsque la barre est déjà à sa place naturelle.
    const nav = navRef.current;
    if (!nav) return;
    const naturalTop = nav.parentElement
      ? nav.parentElement.getBoundingClientRect().top + window.scrollY
      : 0;
    if (window.scrollY > naturalTop) window.scrollTo({ top: naturalTop });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    const target = tabForKey(active, event.key);
    if (!target) return;
    event.preventDefault();
    activate(target, true);
  };

  return (
    <div>
      <div
        ref={navRef}
        role="tablist"
        aria-label="Sections du dossier"
        className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 py-2 backdrop-blur"
      >
        {DOSSIER_TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <a
              key={tab.id}
              id={tabElementId(tab.id)}
              href={`#${tab.id}`}
              role="tab"
              aria-selected={selected}
              aria-controls={panelElementId(tab.id)}
              tabIndex={selected ? 0 : -1}
              onClick={(event) => {
                // Ouverture dans un nouvel onglet / copie du lien : comportement natif.
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                activate(tab.id, false);
              }}
              onKeyDown={onKeyDown}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition",
                selected
                  ? "bg-sawaz/10 text-sawaz shadow-[inset_0_-2px_0_var(--color-sawaz)]"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              {tab.label}
            </a>
          );
        })}
      </div>

      {DOSSIER_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <div
            key={tab.id}
            id={panelElementId(tab.id)}
            role="tabpanel"
            aria-labelledby={tabElementId(tab.id)}
            tabIndex={selected ? 0 : -1}
            hidden={!selected}
            inert={!selected}
            data-dossier-panel={tab.id}
            className="mt-4 space-y-4 focus-visible:outline-none"
          >
            <PanelActiveContext.Provider value={selected}>
              {selected || visited.has(tab.id) ? panels[tab.id]() : null}
            </PanelActiveContext.Provider>
          </div>
        );
      })}
    </div>
  );
}
