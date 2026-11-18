# Point hebdomadaire VAUBAN – générateur

Produit une page A4 paysage (Air Liquide Healthcare · Programme VAUBAN – ERP Proginov) dans `livrables/` :

| Fichier | Usage |
|---|---|
| `VAUBAN_Point-hebdo_<date>.pptx` | PowerPoint modifiable : formes natives, textes éditables, blocs groupés (en-tête, panneaux, bandeau Jira, chaque jalon, axe, légende) |
| `VAUBAN_Point-hebdo_<date>.pdf` | Diffusion / impression |
| `VAUBAN_Point-hebdo_<date>.png` | Aperçu (200 dpi) |

```bash
python3 outils/vauban/generer.py                # PPTX + PDF + PNG + contrôles
python3 outils/vauban/generer.py --sans-export  # PPTX + contrôles avant rendu
```

Dépendances : `python-pptx`, `Pillow`, `pdfplumber`, LibreOffice (`soffice`), `pdftoppm` (poppler) et la police Carlito
(métriquement identique à Calibri, utilisée pour mesurer le texte et pour le rendu PDF).

## Mettre à jour pour une nouvelle semaine

Modifier uniquement `contenu.py` (date du point, semaine, items des trois panneaux, échéances).
Chaque échéance garde son libellé source (« 25–26 novembre ») et ses dates ISO : les contrôles vérifient qu'ils concordent.
Mise en forme : `**gras**`.

## Contrôles (`controles.py`)

Le script sort en erreur (code 1) si un contrôle échoue :

- **Dates** : libellés source ↔ dates, ordre chronologique, semaine lundi–vendredi, cartes imprimées relues et comparées,
  mois sous l'axe, repère « Point du jj/mm », dates citées dans le texte ↔ chronogramme ; alerte si une Task Force
  ou un Dry Run tombe un week-end.
- **Contenu** : mot « Projet » interdit dans le chronogramme, 4 catégories Jira dans l'ordre et distinctes du
  découpage Processus / Sous-processus / Thématique / Thérapie, aucun nombre hors dates (pas de KPI ajouté).
- **Géométrie** : marges ≥ 0,30", panneaux et cartes de mêmes dimensions à intervalles égaux, bords communs,
  points et textes centrés sur leurs cartes, blocs sans chevauchement.
- **Rendu PDF** : une page A4 paysage, chaque caractère dans son bloc (aucun débordement), pas de retour à la
  ligne imprévu, aucune plage « 25–26 » coupée en fin de ligne, textes clés présents.

## Conventions de la page

- Statut temporel des jalons calculé par rapport à la date du point (« échéance passée » / « à venir ») : aucun
  statut « réalisé » n'est affirmé.
- Palette : blanc, bleu pastel, anthracite ; Dry Run en anthracite, maintenance hachurée à bord pointillé (à confirmer).
