# P3.4 — Sawaz Pilot : analyse (Étape A) et plan de transformation

Aucune modification de base de données, RLS, rôles, fonctions SQL, authentification ou logique métier. Pas de publication. Changements limités à l'identité, à la mise en page et aux libellés.

## 1. Éléments réutilisables tels quels
- Garde d'accès `_authenticated`, connexion (`/auth`), `set-password`, déconnexion.
- Toutes les fonctions serveur Studio (dossiers, réponses, indicateurs, analyses, restitutions, partage) et leurs requêtes.
- Panneaux existants : `SubmissionCard`, `MetricsReviewPanel`, `AnalysesPanel`, `ReviewsPanel`, `ReviewPreview`, `PublicationPanel`, `StatusBadge`, `Panel`.
- Structure des routes `/studio`, `/studio/$clientId`, `/studio/$clientId/review/$reviewId` (URLs conservées).

## 2. Changements uniquement graphiques
- Nouvelle palette Sawaz Pilot : bleu nuit (structure), bleu électrique (accent/interaction, couleur du logo officiel), blanc, blanc cassé, gris clairs/neutres. Vert/orange/rouge réservés aux statuts.
- Zone de travail claire (fond blanc cassé, panneaux blancs, bordures fines, ombres légères) ; suppression des dégradés décoratifs de l'accueil Studio (`.studio-home`).
- Logos officiels fournis : bleu nuit sur fond clair, version claire sur fond sombre — sans recoloration ni « logo Pilot ». « PILOT » en signature typographique sous SAWAZ.
- Focus clavier visible, statuts toujours accompagnés d'un libellé texte.

## 3. Adaptations de navigation
- `StudioShell` devient la coque Sawaz Pilot : barre latérale sombre bleu nuit sur desktop (repliée en barre haute sur tablette/mobile) avec **Vue d'ensemble · Clients · Missions · Collectes**.
  - Vue d'ensemble et Clients pointent vers l'écran existant `/studio` (pas de nouvel écran artificiel) ; Missions affiché comme entrée « bientôt » non cliquable ; Collectes conserve le lien actuel.
- Fiche client : en-tête « Client → Mission → Phase » (nom du client, mission = projet existant, phase affichée « Diagnostic · En cours » uniquement si la donnée existe, sinon « Phase non renseignée »).
- Sous-navigation de mission par ancres internes vers les sections déjà présentes : Vue d'ensemble · Collectes · Réponses · Indicateurs · Analyse · Restitution.
- Séparation visuelle explicite : blocs « Déclaré par le répondant / Données » (neutres) distincts des blocs « Analyse Sawaz » (accent bleu, libellé dédié).

## 4. Incohérences constatées avec le modèle Sawaz Pilot
- Le projet contient aussi les écrans de collecte LFTC (`/collecte/*`, `BrandHeader`, logo LFTC). Ils ne seront pas touchés, mais leur présence ici contredit la séparation Collect / Pilot — à traiter en P3.5.
- La page d'accueil `/` et `/dashboard` sont des maquettes « Client Intelligence » avec données fictives, hors modèle Pilot. Proposé : renommer leur titre/marque en Sawaz Pilot uniquement, sans refonte (ou les laisser telles quelles — à confirmer).
- Le modèle de données n'a pas de notion de « Phase » ni de « Mission » distincte du projet : la phase ne peut être affichée que si elle existe ; aucune valeur inventée.
- Libellés de répondant : vérifier que `SubmissionCard` n'affiche jamais d'identité supposée ; à défaut, afficher « Répondant non identifié ».
- Les erreurs serveur affichent encore « Publication réservée au rôle owner » / « Projet » : libellés UI à remplacer côté affichage seulement.

## 5. Fichiers proposés à modifier
- `src/styles.css` — tokens Sawaz Pilot (clair + navigation sombre), retrait des dégradés décoratifs Studio.
- `src/components/brand/Logos.tsx` — ajout d'un composant `SawazPilotMark` (logo officiel + « PILOT ») ; `LftcLogo`/`SawazMark` inchangés pour Collect.
- `src/assets/` — pointeurs des deux logos officiels fournis ; favicon mis à jour à partir du symbole Sawaz.
- `src/components/studio/StudioShell.tsx` — coque, navigation, nomenclature.
- `src/routes/_authenticated/studio.index.tsx` — « Clients », colonnes Missions / Réponses / Documents, titres de page.
- `src/routes/_authenticated/studio.$clientId.index.tsx` — en-tête Client → Mission → Phase, sous-navigation, libellés.
- `src/routes/_authenticated/studio.$clientId.review.$reviewId.tsx` — Restitution, Indicateurs, Partager.
- `src/components/studio/*Panel.tsx`, `SubmissionCard.tsx`, `ReviewPreview.tsx` — libellés uniquement (Réponses, Reçue, Indicateurs, Analyse Sawaz, Restitution, Partager, Note interne, Historique).
- `src/routes/auth.tsx`, `src/routes/set-password.tsx`, `src/routes/__root.tsx` — marque « Sawaz Pilot » et métadonnées.

## Laissé volontairement inchangé
`/collecte/*`, `BrandHeader`, `StepLayout`, tous les fichiers `*.functions.ts`, `*.server.ts`, intégration backend, migrations, `link_sessions`, `rate_limits`, noms techniques des tables/types.

## Vérifications prévues
Compilation, tests existants, captures desktop / tablette / mobile de `/auth`, `/studio`, fiche client et restitution en session réelle, contrôle de contraste et du focus clavier.
