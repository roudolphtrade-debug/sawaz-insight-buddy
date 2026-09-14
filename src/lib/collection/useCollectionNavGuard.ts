import { useBlocker } from "@tanstack/react-router";

import { useCollection } from "./store";

/** Délai maximal d'attente du flush avant de laisser la navigation se poursuivre. */
const NAV_FLUSH_TIMEOUT_MS = 2500;

/**
 * Intercepte toute navigation interne quittant une étape de la collecte (Continuer,
 * Précédent, onglets déverrouillés de `StepTabs`, retour navigateur) pour déclencher un
 * flush immédiat des réponses en attente avant que la navigation n'aboutisse.
 *
 * Ne bloque jamais la navigation elle-même — `shouldBlockFn` renvoie toujours `false`
 * — et borne l'attente à `NAV_FLUSH_TIMEOUT_MS` : si le serveur ne répond pas à temps,
 * la navigation se poursuit quand même (le flush continue en arrière-plan, suivi par
 * le Provider, et un échec finit par apparaître via le statut d'enregistrement sur la
 * page suivante). Une fermeture ou une actualisation réelle du navigateur ne peut de
 * toute façon garantir une sauvegarde serveur asynchrone ; la sauvegarde locale
 * (systématique, voir `collectionService.save`) reste le secours explicite dans ce cas
 * — ce hook ne prétend pas résoudre cette limite propre au navigateur.
 *
 * `enableBeforeUnload` est désactivé : ceci n'active pas la boîte de dialogue native
 * « quitter le site ? », qui n'a pas été demandée ; le secours `beforeunload` déjà
 * présent dans `CollectionProvider` (best-effort) s'en charge séparément.
 */
export function useCollectionNavGuard() {
  const { flushAnswers } = useCollection();

  useBlocker({
    shouldBlockFn: async () => {
      // Course entre le flush et le délai maximal, avec nettoyage explicite du
      // minuteur dès que l'un des deux se termine — jamais de `setTimeout` laissé à
      // se déclencher inutilement une fois la navigation déjà relâchée.
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        const timer = setTimeout(finish, NAV_FLUSH_TIMEOUT_MS);
        void flushAnswers().finally(() => {
          clearTimeout(timer);
          finish();
        });
      });
      return false;
    },
    enableBeforeUnload: false,
  });
}
