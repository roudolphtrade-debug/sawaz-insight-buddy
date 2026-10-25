# Quality gate final (feature/lftc-studio-ux, base 3018d25)
- [x] Test en échec identifié : `tests/browser/dossier-layout.e2e.mjs`, étape « canevas, KPI alignés » : `KPI de hauteurs 147,147,147,137,137,137,137` (attendu : une seule hauteur).
- [x] Non préexistant : même commande sur b435f34 → 15/15 étapes ; sur 3018d25 → échec à l'étape 2. Introduit par l'ajout de la pastille d'icône dans `KpiCard` (contenu > hauteur minimale commune, rangées de hauteurs différentes).
- [x] Cause corrigée (pas le test) : les sept KPI dans une seule grille de 12 colonnes à rangées égales (`auto-rows-fr`) ; hauteur identique à toutes les largeurs, même si une sous-information passe à la ligne.
- [x] `bun test tests` : 160/160 sur 3018d25 comme après correction (stable : 15 exécutions, 24 sous charge parallèle, 20 sur un seul cœur saturé, aucun échec).
- [x] Tests navigateur : brouillons 9/9, mise en page 15/15.
- [x] `src/integrations/supabase/types.ts` : synchronisation seule de `submission_qualifications`, `submission_classification`, `submission_attribution_source`, identiques à la migration existante 20261024120000 ; aucune migration ni modification de schéma.
- [x] TypeScript, build, working tree propre.

# Enrichissement visuel par la couleur (présentation uniquement)
- [x] Palette sémantique par section (bleu, indigo, cyan, turquoise, lavande, ardoise)
- [x] KPI : icônes teintées par famille métier
- [x] Onglets : accent de la section sur l'onglet actif
- [x] Badges : Référence bleu, Mission indigo, Collecte cyan, Attribution/Brouillon ardoise, Validé vert, Exclu gris foncé
- [x] Filet d'accent supérieur sur les cartes de section et de synthèse
- [x] Tests visuels étendus ; captures des 6 onglets vérifiées

# P3.4-D

- [x] Verify clean Git state, GitHub target feature/lftc-studio-ux and Sawaz Core connection.
- [x] Remove privileged studioBootstrap and its caller; preserve claim_team_access.
- [x] Align authenticated middleware with the external public Supabase connection.
- [x] Remove direct privileged publication reads; preserve Collect and shared server client.
- [x] Run focused auth tests and check preview/build diagnostics.
- [x] Report remaining privileged publication dependencies and verification limits.
- [x] Authenticated /studio, LFTC and RECETTE SAWAZ visibility validated by the user in P3.4-E context (not independently verified).
- [ ] Verify new SHA reached GitHub: Git sync status cannot be read by the agent.
- [ ] Make all Pilot publication operations service-role-free: existing notification/session policies deny user writes; requires a separately authorized design beyond the permitted no-policy-change scope. No further lot started.

# P3.4-E

- [x] Point homepage Sign in and Launch app to /auth; preserve demo (browser verified).
- [x] Present missing YouTube keys and unknown keys without technical identifiers (helper output verified).
- [x] Show explicit unidentified respondent when deterministic identity is absent (collection-recipient provenance rejected; four tests pass).
- [x] Verify navigation, identity rules, and preview diagnostics (11 focused tests pass; build OK; no browser runtime errors). Authenticated dossier presentation remains unverified because external session is unavailable.
- [ ] Test real LFTC document buttons: uploaded instructions stop after “bouton”; external authenticated session unavailable.