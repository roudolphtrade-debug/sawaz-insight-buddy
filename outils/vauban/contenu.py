"""Contenu du point hebdomadaire VAUBAN du 13 novembre 2026.

Règles de saisie :
- aucun KPI, résultat ou statut n'est ajouté sans source ; les formulations
  reprennent les éléments transmis (échanges de pilotage) ;
- chaque échéance garde son libellé source (tel que transmis) ET ses dates ISO :
  `controles.py` vérifie que les deux concordent ;
- le chronogramme ne doit jamais contenir le mot « Projet » ;
- la classification Jira (4 catégories) est distincte du découpage
  Processus / Sous-processus / Thématique / Thérapie.

Mise en forme légère : `**texte**` = gras.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import Enum


class TypeJalon(Enum):
    TASK_FORCE = "Task Force"
    DRY_RUN = "Dry Run"
    MAINTENANCE = "Maintenance"


@dataclass(frozen=True)
class Jalon:
    libelle_source: str  # libellé tel que transmis, ex. « 3–4 novembre »
    debut: date
    fin: date
    type: TypeJalon
    titre: str
    sous_titre: str
    lieu: str | None = None
    mention: str | None = None  # ex. « Fenêtre à confirmer »


@dataclass(frozen=True)
class PointHebdo:
    date_point: date
    semaine: tuple[date, date]
    client: str
    programme: str
    sous_titre: str
    destinataires: tuple[str, ...]
    avancement: tuple[str, ...]
    risques: tuple[str, ...]
    priorites: tuple[str, ...]
    classification_jira: tuple[str, ...]
    decoupage_jira: tuple[str, ...]
    perimetre_task_force: str
    jalons: tuple[Jalon, ...]
    note_calendrier: str


POINT = PointHebdo(
    date_point=date(2026, 11, 13),
    semaine=(date(2026, 11, 9), date(2026, 11, 13)),
    client="Air Liquide Healthcare",
    programme="Programme VAUBAN – ERP Proginov",
    sous_titre="Point hebdomadaire de pilotage",
    destinataires=("Jérôme Brossier", "Mathieu"),
    avancement=(
        "**Hypercare DS/VA** : stabilisation en cours, suivi des anomalies et correctifs Proginov.",
        "**Orkyn’** : préparation du Dry Run n°6 (18 novembre), finalisation des tests et correctifs.",
        "**Task Force VitalAire** : préparation de la session des 25–26 novembre à Nantes.",
        "**Jira** : mise à jour des indicateurs et de la classification des tickets (4 catégories, ci-dessous).",
        "**Pilotage** : mise à jour du dispositif Task Force et du suivi post-atelier.",
    ),
    risques=(
        "**Correctifs Proginov** : délais et disponibilité des ressources (mobilisation sur VitalAire).",
        "**Qualité / régressions** : validation des correctifs et tests de non-régression.",
        "**Processus métier** : formalisation et application insuffisantes (référent à confirmer : Lévy).",
        "**Facturation** : anomalies NOFAC / FAE et impacts métiers à suivre.",
        "**Classification des tickets** : alignement avec l’équipe Proginov sur les 4 catégories Jira.",
    ),
    priorites=(
        "Finaliser la préparation du **Dry Run n°6 Orkyn’** (18/11).",
        "Sécuriser la **maintenance Proginov** (21–22/11), fenêtre à confirmer.",
        "Préparer la **Task Force VitalAire** des **25–26/11 à Nantes** (sujets, correctifs, tests métiers).",
        "Suivre les **engagements Proginov** et le traitement du backlog.",
        "Poursuivre la formalisation des **processus métier** prioritaires.",
        "Actualiser les **indicateurs Jira** et partager la vision consolidée.",
    ),
    classification_jira=(
        "Bug solution / non-qualité",
        "Problème de données",
        "Formation",
        "Change fonctionnel",
    ),
    decoupage_jira=("Processus", "Sous-processus", "Thématique", "Thérapie"),
    perimetre_task_force="VitalAire",
    jalons=(
        Jalon("3–4 novembre", date(2026, 11, 3), date(2026, 11, 4),
              TypeJalon.TASK_FORCE, "Task Force", "VitalAire", lieu="Bagneux"),
        Jalon("6–7 novembre", date(2026, 11, 6), date(2026, 11, 7),
              TypeJalon.TASK_FORCE, "Task Force", "VitalAire", lieu="Bagneux"),
        Jalon("18 novembre", date(2026, 11, 18), date(2026, 11, 18),
              TypeJalon.DRY_RUN, "Dry Run n°6", "Orkyn’"),
        Jalon("21–22 novembre", date(2026, 11, 21), date(2026, 11, 22),
              TypeJalon.MAINTENANCE, "Maintenance", "Proginov", mention="Fenêtre à confirmer"),
        Jalon("25–26 novembre", date(2026, 11, 25), date(2026, 11, 26),
              TypeJalon.TASK_FORCE, "Task Force", "VitalAire", lieu="Nantes"),
        Jalon("8–9 décembre", date(2026, 12, 8), date(2026, 12, 9),
              TypeJalon.TASK_FORCE, "Task Force", "VitalAire", lieu="Bagneux"),
        Jalon("19–20 janvier 2027", date(2027, 1, 19), date(2027, 1, 20),
              TypeJalon.TASK_FORCE, "Task Force", "VitalAire", lieu="Bagneux"),
        Jalon("9–10 février 2027", date(2027, 2, 9), date(2027, 2, 10),
              TypeJalon.TASK_FORCE, "Task Force", "VitalAire", lieu="Bagneux"),
    ),
    note_calendrier=(
        "Calendrier consolidé à partir des échanges. Dates et modalités "
        "à confirmer selon les engagements et disponibilités."
    ),
)
