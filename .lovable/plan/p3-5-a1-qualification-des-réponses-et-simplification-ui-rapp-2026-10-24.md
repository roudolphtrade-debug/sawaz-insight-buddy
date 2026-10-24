# P3.5-A1 · Qualification des réponses et simplification UI (rapport de conception)

Rapport uniquement. Aucune modification de fichier, donnée, schéma ou configuration. P3.5-A2 non commencé.

## 1. Diagnostic du modèle actuel (vérifié en lecture sur Sawaz Core)

LFTC : 7 submissions, 31 documents au total.

| # | ID (début) | Collecte | Statut | Soumise (Paris) | Réponses | Fichiers |
|---|---|---|---|---|---|---|
| 1 | 96203894 | 9b42c950 | submitted | 09/09 22:32 | 12 | 3 |
| 2 | 4e4e7ef9 | 9b42c950 | submitted | 09/09 23:34 | 14 | 1 |
| 3 | f7c57492 | 9b42c950 | working | - | 18 | 1 |
| 4 | 1391bbdc | 9b42c950 | submitted | 18/10 05:30 | 14 | 3 |
| 5 | a045f0ff | 9b42c950 | submitted | 19/10 01:32 | 16 | 6 |
| 6 | 831da37a | 9b42c950 | submitted | 21/10 13:39 | 14 | 16 |
| 7 | 86b0c97e | 3101bc6c | submitted | 21/10 22:13 | 13 | 1 |

- Aucune submission n'a de `submitted_by_contact_id` : aucune identité technique déterministe n'existe, y compris pour Raphaël.
- Aucun champ existant ne porte une qualification métier ; `status`, `snapshot`, `audit_logs` et `analyses` ne doivent pas être détournés.
- Les policies existantes reposent sur `has_client_access` (lecture) et `can_write_client` (écriture) : modèle réutilisable.

## 2. `submission_qualifications` : retenu, avec ajustements

Justification : la qualification est une décision Sawaz distincte de la donnée brute (chaîne Strata), elle doit être réversible, auditée et non destructive. Une table dédiée 1-1 avec `submissions` est la seule option qui ne touche aucune donnée existante.

Ajustements à l'hypothèse :
- ajouter `collection_id` (dérivé par trigger) pour porter la règle d'unicité ;
- renommer `respondent_label` en `attributed_respondent_label` et ajouter `attribution_source` (`manual_sawaz`) pour ne jamais confondre avec l'identité technique ;
- `historical` devient la valeur par défaut implicite (absence de ligne = « Historique à qualifier »), donc aucune ligne à créer pour les non-qualifiées.

## 3. Schéma SQL proposé (non exécuté)

```sql
create type public.submission_classification as enum
  ('reference','test','draft','historical','excluded');

create table public.submission_qualifications (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete restrict,
  collection_id uuid not null references public.collections(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  classification public.submission_classification not null,
  included_in_analysis boolean not null default false,
  attributed_respondent_label text,
  attribution_source text not null default 'manual_sawaz'
    check (attribution_source in ('manual_sawaz')),
  reason text,
  qualified_by uuid references public.users(id),
  qualified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (classification <> 'reference' or included_in_analysis),
  check (classification not in ('test','excluded') or not included_in_analysis)
);
create unique index submission_qualifications_one_reference
  on public.submission_qualifications(collection_id) where classification = 'reference';
create index on public.submission_qualifications(client_id);

grant select, insert, update on public.submission_qualifications to authenticated;
grant all on public.submission_qualifications to service_role;
alter table public.submission_qualifications enable row level security;
```
Triggers : dérivation `client_id`/`collection_id` depuis la submission (même schéma que `derive_tenant_from_submission`), `set_updated_at`, `qualified_by = auth.uid()` forcé, et écriture d'une ligne `audit_logs` (`submission.qualified`, ancienne/nouvelle classification en metadata).

## 4. RLS proposées (non appliquées)

- Lecture : `has_client_access(client_id)` (owner, analyst, viewer).
- Création / modification : `can_write_client(client_id)` (owner, analyst).
- Suppression : aucune policy (refusée) ; on requalifie au lieu de supprimer.
- Aucun accès anon, aucun accès par lien Collect.

## 5. Unicité de la référence

Une seule `reference` par collecte (index partiel). Périmètre collecte choisi car 22:13 appartient à une autre collecte et doit pouvoir avoir sa propre référence plus tard. Changer de référence = requalifier l'ancienne en `historical` puis la nouvelle en `reference`, dans une même fonction transactionnelle `set_reference_submission(_submission_id, _label, _reason)`.

## 6-8. Traitement des 7 submissions LFTC

- 831da37a (21/10 13:39) : `reference`, inclus, attribué « Raphaël », source `manual_sawaz`, raison « Réponse réelle validée par Sawaz le … ».
- f7c57492 (brouillon) : `draft`, exclu.
- 96203894, 4e4e7ef9, 1391bbdc, a045f0ff : aucune ligne = « Historique à qualifier » ; Sawaz pourra les marquer `test` ou `excluded` depuis l'UI.
- 86b0c97e (22:13, collecte 3101bc6c) : aucune ligne, affichée sous sa propre collecte, jamais comptée dans le corpus de la collecte 9b42c950.

L'UI affichera « Raphaël · attribution Sawaz » (et non une identité prouvée). L'enregistrement se fera via l'UI en P3.5-A2 par un owner/analyst, pas par insertion SQL directe, pour garder l'audit au nom d'une personne.

## 9. Nouveaux KPI

Corpus actif (par collecte) : Réponses de référence 1 · Documents analysables 16 · Répondant Raphaël (attribution Sawaz) · Dernière référence 21 oct. 2026 · 13:39.
Historique : 6 autres submissions · dont 5 soumises · 1 brouillon · 0 test · 4 à qualifier (+1 autre collecte).
La liste Clients affichera « Référence : oui/non » et documents analysables au lieu de 6/7 et 31.

## 10. Page Réponses

```text
[Réponse de référence]  Raphaël · 21 oct. 2026 · 13:39 · Référence
                        14 réponses · 16 documents        [Ouvrir]
[Historique / essais (6)]  replié
   date · statut technique · qualification · réponses · fichiers  [Détails] [Qualifier]
```
Sans référence : bandeau « Aucune réponse de référence : choisissez-en une pour activer le corpus d'analyse ».

## 11. Documents

Groupement par préfixe de `slot_key` (YouTube `yt.*`/`c.*`, Meta `m.*`, Autres) en accordéons avec compteur ; vignettes en grille ; lightbox et téléchargement sécurisé (lien signé 5 min) inchangés.

## 12. Audit UI priorisé

P0
- Remplacer tous les cadratins visibles (titres de page « Dossier client — Sawaz Pilot », etc.) par `·`.
- Traduire les termes anglais visibles : rôle `owner/analyst/viewer` → Propriétaire / Analyste / Lecteur ; statuts restants.
- KPI : centrer valeurs et libellés (cartes État du dossier, colonnes du tableau Clients).
- KPI métier (section 9).

P1
- Onglets dossier : état actif suivi au scroll, fusion « Missions et collectes » en un seul onglet « Missions ».
- Page Réponses compacte (section 10) et documents groupés (section 11).
- États vides Indicateurs / Analyse / Restitution : ce qui manque, pourquoi, prochaine action (bouton).
- `/` : connecté → `/studio`, sinon `/auth`.

P2
- Densité : réduire paddings des Panels, hauteur des cartes, supprimer le sous-titre répété « rôle Sawaz ».
- Cohérence de la navigation latérale et du sticky.

## 13. `/dashboard`

Conserver la route mais la sortir de toute navigation et la marquer `noindex` ; suppression envisageable dans un lot ultérieur sur demande.

## 14. Deux restitutions en brouillon

- 9e32d4aa (créée 10/09 01:51 Paris) et 576407cb (10/09 01:54), même mission et même collecte 9b42c950, chacune 1 version brouillon.
- Diagnostic : duplication de recette (créées à 3 minutes d'intervalle). Proposition : conserver les deux, afficher la plus récente dans le parcours principal et la plus ancienne sous « Autres restitutions (1) » repliée. Contenu des versions à comparer en A2 avant de choisir laquelle garder visible.

## 15. Fichiers modifiés en P3.5-A2

- `src/lib/studio/studio.functions.ts` (lecture des qualifications, KPI, mutation de qualification)
- `src/lib/studio/submission-presentation.ts` (libellés, groupement, calcul du corpus)
- `src/components/studio/SubmissionCard.tsx` + nouveaux `ReferenceSubmissionCard.tsx`, `SubmissionHistory.tsx`, `DocumentGroups.tsx`
- `src/routes/_authenticated/studio.$clientId.index.tsx`, `studio.index.tsx`
- `src/components/studio/ReviewsPanel.tsx`, `MetricsReviewPanel.tsx`, `AnalysesPanel.tsx` (états vides)
- `src/routes/index.tsx` (redirection), `src/routes/dashboard.tsx` (noindex)
- Tests : `tests/pilot-qualification.test.ts`

## 16. Migrations nécessaires

Une seule : enum + table + index + grants + RLS + triggers + fonction `set_reference_submission`. Aucune modification des tables existantes.

## 17. Rollback

- Code : revenir au SHA précédent A2.
- Base : `drop function set_reference_submission; drop table submission_qualifications; drop type submission_classification;` : aucune donnée brute n'est touchée, seules les qualifications sont perdues (exporter la table avant).

## 18. Critères d'acceptation

- 7 submissions toujours présentes, réponses et fichiers inchangés (comptages identiques avant/après).
- 831da37a affichée seule en référence, « Raphaël · attribution Sawaz », 14 réponses, 16 documents.
- Une seconde `reference` sur la même collecte est refusée.
- Viewer : lecture seule ; owner/analyst : qualification possible ; chaque qualification crée une ligne d'audit.
- 22:13 n'apparaît pas dans le corpus de la collecte 9b42c950.
- Historique replié par défaut, documents groupés YouTube / Meta / Autres.
- Aucun cadratin ni terme anglais visible dans Pilot ; Collect inchangé.
