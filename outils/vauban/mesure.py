"""Typographie française, balisage léger et mesure du texte.

La mesure utilise Carlito, police métriquement identique à Calibri : les
largeurs calculées ici sont celles que PowerPoint (Calibri) et LibreOffice
(Carlito) produisent. On s'en sert pour dimensionner les blocs avant rendu
et pour détecter les débordements.
"""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass, replace
from functools import lru_cache
from pathlib import Path

from PIL import ImageFont

NBSP = " "
INTERLIGNE = 1.2207  # (ascendante + descendante + interligne) / em pour Calibri/Carlito

_FICHIERS = {
    (False, False): "Carlito-Regular.ttf",
    (True, False): "Carlito-Bold.ttf",
    (False, True): "Carlito-Italic.ttf",
    (True, True): "Carlito-BoldItalic.ttf",
}
_DOSSIERS = (
    Path("/usr/share/fonts/truetype/crosextra"),
    Path("/usr/share/fonts/crosextra"),
    Path("/usr/share/fonts/truetype/carlito"),
    Path.home() / ".fonts",
    Path("/Library/Fonts"),
)


@dataclass(frozen=True)
class Run:
    texte: str
    gras: bool = False
    italique: bool = False
    couleur: str | None = None
    taille: float | None = None


@dataclass(frozen=True)
class Para:
    runs: tuple[Run, ...]
    taille: float
    couleur: str
    align: str = "left"  # left | center | right
    espace_avant: float = 0.0  # pt
    espacement_car: float = 0.0  # pt (attribut spc)

    @property
    def texte(self) -> str:
        return "".join(r.texte for r in self.runs)

    @property
    def taille_max(self) -> float:
        return max((r.taille or self.taille) for r in self.runs) if self.runs else self.taille


# --------------------------------------------------------------------------- typographie

_MOIS = (
    "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|"
    "janv\\.|févr\\.|avr\\.|juil\\.|sept\\.|oct\\.|nov\\.|déc\\."
)


def typo_fr(texte: str) -> str:
    """Espaces insécables à la française et groupes de mots à ne pas couper."""
    texte = re.sub(r" ([:;!?])", NBSP + r"\1", texte)
    texte = re.sub(rf"(\d) (?=(?:{_MOIS}))", r"\1" + NBSP, texte)
    texte = re.sub(r"\b(Task|Dry) (Force|Run)\b", r"\1" + NBSP + r"\2", texte)
    texte = re.sub(r"(n°\d+) (Orkyn)", r"\1" + NBSP + r"\2", texte)
    return texte


def balisage(texte: str, *, couleur: str | None = None, couleur_gras: str | None = None) -> tuple[Run, ...]:
    """`**gras**` → runs. Applique la typographie française."""
    morceaux = typo_fr(texte).split("**")
    runs = []
    for i, m in enumerate(morceaux):
        if not m:
            continue
        gras = i % 2 == 1
        runs.append(Run(m, gras=gras, couleur=(couleur_gras if gras and couleur_gras else couleur)))
    return tuple(runs)


def texte_brut(texte: str) -> str:
    return texte.replace("**", "").replace(NBSP, " ")


# --------------------------------------------------------------------------- mesure


def _chemin_police(gras: bool, italique: bool) -> Path:
    nom = _FICHIERS[(gras, italique)]
    for d in _DOSSIERS:
        if (d / nom).exists():
            return d / nom
    try:  # dernier recours : fontconfig
        sortie = subprocess.run(
            ["fc-match", "-f", "%{file}", f"Carlito:{'bold' if gras else 'regular'}{':italic' if italique else ''}"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        if sortie and Path(sortie).exists():
            return Path(sortie)
    except (OSError, subprocess.CalledProcessError):
        pass
    raise FileNotFoundError(f"Police {nom} introuvable : installer Carlito (fonts-crosextra-carlito).")


@lru_cache(maxsize=None)
def _police(gras: bool, italique: bool) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(_chemin_police(gras, italique)), 1000)


def largeur_pt(texte: str, taille: float, gras: bool = False, italique: bool = False) -> float:
    return _police(gras, italique).getlength(texte) * taille / 1000.0


def largeur_in(texte: str, taille: float, gras: bool = False, italique: bool = False) -> float:
    return largeur_pt(texte, taille, gras, italique) / 72.0


def hauteur_ligne_in(taille: float) -> float:
    return taille * INTERLIGNE / 72.0


@dataclass
class Coupure:
    lignes: list[str]
    mot_trop_long: str | None
    debuts: list[int]  # position (dans Para.texte) du premier caractère de chaque ligne


@dataclass
class _Jeton:
    morceaux: list  # [(texte, Run)]
    debut: int  # position dans Para.texte
    sep: str  # ce qui précède : " " (espace), "" (coupure après tiret) ou "\n" (saut forcé)


SAUT = "\n"  # Run(SAUT) = saut de ligne forcé (<a:br/>)
_COUPE_APRES = "-–"  # PowerPoint et LibreOffice peuvent couper après un tiret ou un demi-cadratin


def _jetons(para: Para) -> list[_Jeton]:
    jetons: list[_Jeton] = []
    cur: _Jeton | None = None
    sep, pos = "", 0
    for run in para.runs:
        if run.texte == SAUT:
            if cur and cur.morceaux:
                jetons.append(cur)
            cur, sep = None, SAUT
            pos += 1
            continue
        for ch in run.texte:
            if ch == " ":
                if cur and cur.morceaux:
                    jetons.append(cur)
                cur = None
                sep = SAUT if sep == SAUT else " "
                pos += 1
                continue
            if cur is None:
                cur, sep = _Jeton([], pos, sep), ""
            if cur.morceaux and cur.morceaux[-1][1] is run:
                cur.morceaux[-1] = (cur.morceaux[-1][0] + ch, run)
            else:
                cur.morceaux.append((ch, run))
            pos += 1
            if ch in _COUPE_APRES:
                jetons.append(cur)
                cur = None
    if cur and cur.morceaux:
        jetons.append(cur)
    return jetons


def couper(para: Para, largeur_dispo_in: float, facteur: float = 1.02) -> Coupure:
    """Coupure gloutonne : aux espaces (pas aux insécables), après un tiret, et aux sauts forcés."""
    limite = largeur_dispo_in * 72.0
    espace = largeur_pt(" ", para.taille)
    lignes: list[tuple[str, int]] = []
    txt, larg, deb, commence = "", 0.0, 0, False
    trop_long = None
    for j in _jetons(para):
        lj = facteur * sum(largeur_pt(t, r.taille or para.taille, r.gras, r.italique) for t, r in j.morceaux)
        tj = "".join(t for t, _ in j.morceaux)
        if lj > limite and trop_long is None:
            trop_long = tj
        if not commence:
            txt, larg, deb, commence = tj, lj, j.debut, True
            continue
        ajout = (espace if j.sep == " " else 0.0) + lj
        if j.sep == SAUT or larg + ajout > limite:
            lignes.append((txt, deb))
            txt, larg, deb = tj, lj, j.debut
        else:
            txt += (" " if j.sep == " " else "") + tj
            larg += ajout
    lignes.append((txt, deb))
    return Coupure([t for t, _ in lignes], trop_long, [d for _, d in lignes])


def _inserer_saut(para: Para, pos: int) -> Para:
    runs, p = [], 0
    for r in para.runs:
        n = len(r.texte)
        if r.texte != SAUT and p <= pos < p + n:
            avant, apres = r.texte[: pos - p].rstrip(" "), r.texte[pos - p:]
            if avant:
                runs.append(replace(r, texte=avant))
            runs.append(Run(SAUT, taille=r.taille))
            runs.append(replace(r, texte=apres))
        else:
            runs.append(r)
        p += n
    return replace(para, runs=tuple(runs))


def proteger_plages(para: Para, largeur_dispo_in: float) -> Para:
    """Empêche qu'une plage « 25–26 » soit coupée après le demi-cadratin :
    si la coupure tombe dedans, un saut forcé est placé avant la plage."""
    for _ in range(8):
        texte = para.texte
        cible = None
        # trois facteurs : tolérance aux petits écarts de métrique entre moteurs de rendu
        debuts = {d for f in (1.02, 1.0, 0.98) for d in couper(para, largeur_dispo_in, f).debuts[1:]}
        for d in sorted(debuts):
            if 2 <= d < len(texte) and texte[d - 1] == "–" and texte[d - 2].isdigit() and texte[d].isdigit():
                cible = d - 1
                while cible > 0 and texte[cible - 1].isdigit():
                    cible -= 1
                break
        if cible is None:
            return para
        para = _inserer_saut(para, cible)
    return para


def hauteur_paras_in(paras: list[Para], largeur_dispo_in: float) -> float:
    total = 0.0
    for p in paras:
        n = len(couper(p, largeur_dispo_in).lignes)
        total += n * hauteur_ligne_in(p.taille_max) + p.espace_avant / 72.0
    return total
