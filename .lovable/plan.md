# Audit d'architecture Sawaz (lecture seule)

Note : le document reçu s'arrête au scénario C (« Évaluer notamment… »). L'audit couvrira les sections 1 à 3 telles que reçues ; envoyez la suite si d'autres critères sont attendus.

## Vérifications (sans aucune modification)
1. Raccordement réel de Sawaz Pilot : `.env`, client navigateur, client serveur, client admin, `supabase/config.toml`, variables présentes (valeurs masquées).
2. Contenu de la base reliée `jiqfy…` : nombre de comptes, rôles, tables, clients, collectes (comptages uniquement).
3. Ce que le code de Pilot attend du backend : tables, fonctions SQL, liens sécurisés (`link_sessions`, `rate_limits`), stockage, rôles owner/analyst/viewer.
4. Sawaz Collect et Results Studio : lecture d'une copie du code (si accessible dans l'espace de travail) pour identifier leur backend et la trace « Revert Switch backend to Sawaz Supabase ». Tout ce qui touche au contenu de `lygihr…` sera marqué NON VÉRIFIABLE DEPUIS CE PROJET.

## Livrable (dans le chat)
- Constats vérifiés vs hypothèses, chacun avec sa preuve.
- Comparaison des scénarios A (backend central `lygihr…`), B (migration vers `jiqfy…`), C (backends séparés) : sécurité, effort, risque de perte, maintien des protections existantes, contraintes Lovable (une seule base Cloud par projet, reconnexion manuelle).
- Recommandation argumentée et étapes minimales, sans les exécuter.

## Garanties
Aucun fichier, secret, connecteur, compte, règle d'accès, migration ou publication modifié. Aucune donnée sensible affichée.
