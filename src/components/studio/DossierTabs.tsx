import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useRef, type KeyboardEvent, type ReactNode } from "react";

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

/**
 * Barre d'onglets (motif WAI-ARIA « tabs », activation automatique) et unique panneau
 * actif : les autres sections ne sont pas rendues. Présentationnel, testable sans
 * routeur : l'onglet actif et la sélection sont fournis par l'appelant.
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

      <div
        key={active}
        id={panelElementId(active)}
        role="tabpanel"
        aria-labelledby={tabElementId(active)}
        tabIndex={0}
        data-dossier-panel={active}
        className="mt-4 space-y-4 focus-visible:outline-none"
      >
        {panels[active]()}
      </div>
    </div>
  );
}
