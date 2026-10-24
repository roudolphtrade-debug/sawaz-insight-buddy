# Diagnostic (lecture seule) : « Remove database » sur Sawaz Pilot

Aucune action prévue. Ce document est seulement un diagnostic. Si vous l'approuvez, rien ne sera exécuté.

## Ce que l'action supprime (documentation Lovable)
- La base jointe à ce projet (`jiqfyfmghfgwbfcrmdyy`) : toutes les tables, fonctions SQL et règles d'accès, ainsi que leur contenu.
- Les sauvegardes quotidiennes de cette base.
- Les comptes utilisateurs de l'app (ici : 0 compte vérifié).
- Les fichiers stockés, y compris les exports de base qui y seraient rangés.
- Le service de connexion, le stockage et les fonctions serveur fournis par Lovable Cloud, avec les e-mails de connexion associés.
- C'est irréversible. Si vous réactivez Cloud plus tard, vous obtenez une base neuve et vide.

## Ce qu'elle ne supprime pas (d'après la documentation, qui ne les mentionne pas parmi les éléments supprimés)
- Le code et les fichiers source du projet.
- L'historique Lovable (conversation, versions).
- La branche GitHub `feature/lftc-studio-ux` et ses commits. Le dépôt ne contient pas les données de la base. Non vérifiable depuis ici : aucune connexion GitHub n'est visible pour ce projet.
- Le code déjà publié : il reste en ligne.

## Points non confirmés
- Secrets Lovable : la documentation ne dit pas s'ils sont conservés. Les variables gérées par Cloud (adresse et clé de la base) deviennent de toute façon inutiles. Pour les secrets que vous avez ajoutés vous-même, la conservation n'est pas confirmée.

## Risques
1. L'app publiée et l'aperçu restent en ligne, mais la connexion, /studio, la collecte et les liens sécurisés cesseront de fonctionner tant qu'aucune autre base n'est reliée.
2. La suppression est définitive. Ici la perte réelle est faible, car la base vérifiée contient 0 compte, 0 client et 0 collecte. En revanche, la structure de tables créée dans cette base sera perdue.
3. Relier ensuite la base Results Studio (`lygihr…`) n'a rien d'automatique. Il faut un projet sans Cloud et une organisation Supabase liée, puis reconfigurer la connexion, les secrets et les variables.
4. La base Results Studio (`lygihr…`) n'est pas touchée par cette action.
