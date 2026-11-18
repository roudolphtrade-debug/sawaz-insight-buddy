#!/usr/bin/env python3
"""Point hebdomadaire VAUBAN : PPTX modifiable (une page A4 paysage), PDF et aperçu PNG.

    python3 outils/vauban/generer.py                 # génère, exporte et contrôle
    python3 outils/vauban/generer.py --sans-export   # PPTX + contrôles avant rendu

Toutes les formes sont natives PowerPoint (aucune image) et regroupées par bloc
(en-tête, panneaux, bandeau Jira, jalons, axe, légende) : chaque élément reste
modifiable. Le PDF et le PNG sont rendus par LibreOffice puis contrôlés
(débordements, alignements, dates, mots interdits) par `controles.py`.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE_DASH_STYLE, MSO_PATTERN
from pptx.enum.lang import MSO_LANGUAGE_ID
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

ICI = Path(__file__).resolve().parent
RACINE = ICI.parents[1]
sys.path.insert(0, str(ICI))

import controles  # noqa: E402
from contenu import POINT, Jalon, PointHebdo, TypeJalon  # noqa: E402
from mesure import (  # noqa: E402
    SAUT,
    Para,
    Run,
    balisage,
    hauteur_ligne_in,
    hauteur_paras_in,
    largeur_in,
    proteger_plages,
    typo_fr,
)

# =========================================================================== charte

POLICE = "Calibri"  # rendu LibreOffice : Carlito (métriques identiques)

C = {
    "blanc": "FFFFFF",
    "anthracite": "2E3338",
    "texte": "3A4046",
    "gris": "646B73",
    "gris_clair": "A3AAB2",
    "trait": "D3D8DE",
    "fond_gris": "ECEEF1",
    "pastel": "DCE8F6",
    "pastel_clair": "F2F7FC",
    "bleu_trait": "B4CCE7",
    "bleu": "3E6A99",
    "hachure": "C9D3DE",
}

W_PAGE = 297 / 25.4  # A4 paysage, en pouces
H_PAGE = 210 / 25.4
MARGE = 0.40
LARG = W_PAGE - 2 * MARGE

# Grille verticale (pouces)
Y_ENTETE = 0.34
Y_PANNEAUX, H_PANNEAUX, GOUTTIERE, H_TITRE_PANNEAU = 1.32, 2.96, 0.20, 0.44
Y_BANDEAU, H_BANDEAU = Y_PANNEAUX + H_PANNEAUX + 0.16, 0.58
Y_TITRE_CHRONO, H_TITRE_CHRONO = Y_BANDEAU + H_BANDEAU + 0.18, 0.30
Y_CARTES, H_CARTES, ECART_CARTES, H_ENTETE_CARTE = Y_TITRE_CHRONO + H_TITRE_CHRONO + 0.10, 1.42, 0.12, 0.30
Y_AXE = Y_CARTES + H_CARTES + 0.17
Y_MOIS = Y_AXE + 0.12
Y_LEGENDE, H_LEGENDE = Y_MOIS + 0.18 + 0.14, 0.30

MOIS_ABR = ("janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc.")
MOIS_LONG = ("janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
             "septembre", "octobre", "novembre", "décembre")
JOURS = ("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche")


def emu(v: float) -> Emu:
    return Emu(int(round(v * 914400)))


def rgb(hexa: str) -> RGBColor:
    return RGBColor.from_string(hexa)


# =========================================================================== libellés de dates


def libelle_jalon(j: Jalon) -> str:
    d1, d2 = j.debut, j.fin
    if d1 == d2:
        txt = f"{d1.day} {MOIS_ABR[d1.month - 1]}"
    elif (d1.year, d1.month) == (d2.year, d2.month):
        txt = f"{d1.day}–{d2.day} {MOIS_ABR[d1.month - 1]}"
    else:
        txt = f"{d1.day} {MOIS_ABR[d1.month - 1]} – {d2.day} {MOIS_ABR[d2.month - 1]}"
    return typo_fr(txt)


def date_longue(d: date) -> str:
    return f"{JOURS[d.weekday()]} {d.day} {MOIS_LONG[d.month - 1]} {d.year}"


def libelle_semaine(d1: date, d2: date) -> str:
    if (d1.year, d1.month) == (d2.year, d2.month):
        return f"Semaine du {d1.day} au {d2.day} {MOIS_LONG[d2.month - 1]} {d2.year}"
    return f"Semaine du {d1.day} {MOIS_LONG[d1.month - 1]} au {d2.day} {MOIS_LONG[d2.month - 1]} {d2.year}"


# =========================================================================== planche


@dataclass
class Element:
    nom: str
    x: float
    y: float
    w: float
    h: float
    groupe: str
    role: str
    paras: list[Para] = field(default_factory=list)
    marges: tuple[float, float, float, float] = (0.0, 0.0, 0.0, 0.0)  # g, h, d, b
    ancre: str = "top"
    une_ligne: bool = True  # chaque paragraphe doit tenir sur une ligne

    @property
    def x2(self) -> float:
        return self.x + self.w

    @property
    def y2(self) -> float:
        return self.y + self.h

    @property
    def cx(self) -> float:
        return self.x + self.w / 2

    @property
    def cy(self) -> float:
        return self.y + self.h / 2

    @property
    def texte(self) -> str:
        return "\n".join(p.texte for p in self.paras)


def retrait_geometrie(type_, w: float, h: float, adj: float | None) -> tuple[float, float, float, float]:
    """Retrait de la zone de texte imposé par la géométrie prédéfinie (presetShapeDefinitions.xml).

    Sans ce calcul, une pastille arrondie réduit la place du texte et provoque
    des retours à la ligne imprévus (« Bagneu / x »)."""
    ss = min(w, h)
    if type_ == MSO_SHAPE.ROUNDED_RECTANGLE:
        i = 0.29289 * ss * (0.16667 if adj is None else adj)
        return (i, i, i, i)
    if type_ == MSO_SHAPE.ROUND_2_SAME_RECTANGLE:
        i = 0.29289 * ss * (0.16667 if adj is None else adj)
        return (i, i, i, 0.0)
    if type_ == MSO_SHAPE.OVAL:
        return (0.14645 * w, 0.14645 * h, 0.14645 * w, 0.14645 * h)
    return (0.0, 0.0, 0.0, 0.0)


def _sans_style(shape) -> None:
    """Retire <p:style> : plus d'ombre ni de couleur héritées du thème (tout est explicite)."""
    style = shape._element.find(qn("p:style"))
    if style is not None:
        shape._element.remove(style)


_ANCRES = {"top": MSO_ANCHOR.TOP, "middle": MSO_ANCHOR.MIDDLE, "bottom": MSO_ANCHOR.BOTTOM}
_ALIGN = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}


def _ecrire(tf, paras: list[Para], marges, ancre: str) -> None:
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    g, h, d, b = marges
    tf.margin_left, tf.margin_top, tf.margin_right, tf.margin_bottom = emu(g), emu(h), emu(d), emu(b)
    tf.vertical_anchor = _ANCRES[ancre]
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = _ALIGN[para.align]
        p.line_spacing = 1.0
        p.space_before = Pt(para.espace_avant)
        p.space_after = Pt(0)
        for r in para.runs:
            if r.texte == SAUT:  # saut de ligne forcé, à la taille du texte (sinon 18 pt par défaut)
                rpr = p._p.add_br().get_or_add_rPr()
                rpr.set("lang", "fr-FR")
                rpr.set("sz", str(int(round((r.taille or para.taille) * 100))))
                continue
            run = p.add_run()
            run.text = r.texte
            f = run.font
            f.name = POLICE
            f.size = Pt(r.taille or para.taille)
            f.bold = r.gras
            f.italic = r.italique
            f.color.rgb = rgb(r.couleur or para.couleur)
            f.language_id = MSO_LANGUAGE_ID.FRENCH
            if para.espacement_car:
                run._r.get_or_add_rPr().set("spc", str(int(round(para.espacement_car * 100))))


class Planche:
    """Enveloppe d'une diapositive : crée les formes et tient le registre géométrique."""

    def __init__(self, slide):
        self.slide = slide
        self.elements: list[Element] = []
        self._cible = slide.shapes
        self._groupe = "Page"

    @contextmanager
    def groupe(self, nom: str):
        grp = self.slide.shapes.add_group_shape()
        grp.name = nom
        precedent = (self._cible, self._groupe)
        self._cible, self._groupe = grp.shapes, nom
        try:
            yield grp
        finally:
            self._cible, self._groupe = precedent

    def forme(self, nom, type_, x, y, w, h, *, fond=None, contour=None, ep=0.75, pointilles=False,
              rayon=None, motif=None, rotation=0.0, paras=None, marges=(0, 0, 0, 0), ancre="middle",
              une_ligne=True, role="forme"):
        shp = self._cible.add_shape(type_, emu(x), emu(y), emu(w), emu(h))
        shp.name = nom
        _sans_style(shp)
        if fond is None:
            shp.fill.background()
        elif motif is not None:
            shp.fill.patterned()
            shp.fill.pattern = motif
            shp.fill.fore_color.rgb = rgb(fond[0])  # fond = (couleur hachure, couleur arrière-plan)
            shp.fill.back_color.rgb = rgb(fond[1])
        else:
            shp.fill.solid()
            shp.fill.fore_color.rgb = rgb(fond)
        if contour is None:
            shp.line.fill.background()
        else:
            shp.line.color.rgb = rgb(contour)
            shp.line.width = Pt(ep)
            if pointilles:
                shp.line.dash_style = MSO_LINE_DASH_STYLE.DASH
        adj = None
        if rayon is not None:
            adj = min(0.5, rayon / min(w, h))
            shp.adjustments[0] = adj
        if rotation:
            shp.rotation = rotation
        if paras:
            # `marges` = distances voulues depuis le bord de la forme ; on retranche le retrait géométrique.
            retrait = retrait_geometrie(type_, w, h, adj)
            reelles = tuple(max(m, r) for m, r in zip(marges, retrait))
            _ecrire(shp.text_frame, paras, tuple(m - r for m, r in zip(reelles, retrait)), ancre)
            marges = reelles
        self.elements.append(Element(nom, x, y, w, h, self._groupe, "texte" if paras else role,
                                     list(paras or []), marges, ancre, une_ligne))
        return shp

    def texte(self, nom, x, y, w, h, paras, *, ancre="top", marges=(0, 0, 0, 0), une_ligne=True):
        tb = self._cible.add_textbox(emu(x), emu(y), emu(w), emu(h))
        tb.name = nom
        _ecrire(tb.text_frame, paras, marges, ancre)
        self.elements.append(Element(nom, x, y, w, h, self._groupe, "texte", list(paras), marges, ancre, une_ligne))
        return tb

    def trait(self, nom, x1, y1, x2, y2, *, couleur, ep=1.0, pointilles=False, fleche=False):
        cx = self._cible.add_connector(MSO_CONNECTOR.STRAIGHT, emu(x1), emu(y1), emu(x2), emu(y2))
        cx.name = nom
        _sans_style(cx)
        cx.line.color.rgb = rgb(couleur)
        cx.line.width = Pt(ep)
        if pointilles:
            cx.line.dash_style = MSO_LINE_DASH_STYLE.DASH
        if fleche:
            queue = etree.SubElement(cx.line._get_or_add_ln(), qn("a:tailEnd"))
            queue.set("type", "triangle")
            queue.set("w", "med")
            queue.set("len", "med")
        self.elements.append(Element(nom, min(x1, x2), min(y1, y2), abs(x2 - x1), abs(y2 - y1),
                                     self._groupe, "trait"))
        return cx

    def par_nom(self, nom: str) -> Element:
        for e in self.elements:
            if e.nom == nom:
                return e
        raise KeyError(nom)


def P(texte, taille, couleur, *, gras=False, italique=False, align="left", espace_avant=0.0, espacement_car=0.0):
    """Paragraphe d'un seul run."""
    return Para((Run(typo_fr(texte), gras=gras, italique=italique),), taille, couleur, align,
                espace_avant, espacement_car)


# =========================================================================== pictogrammes (formes natives)


def picto_equipe(pl: Planche, nom, cx, cy, s, couleur, fond):
    cy += 0.08 * s
    for k, dx in enumerate((-0.31, 0.31)):
        pl.forme(f"{nom} tête {k + 1}", MSO_SHAPE.OVAL, cx + dx * s - 0.10 * s, cy - 0.30 * s, 0.20 * s, 0.20 * s,
                 fond=couleur, role="picto")
        pl.forme(f"{nom} buste {k + 1}", MSO_SHAPE.ROUND_2_SAME_RECTANGLE, cx + dx * s - 0.18 * s, cy - 0.06 * s,
                 0.36 * s, 0.30 * s, fond=couleur, rayon=0.18 * s, role="picto")
    pl.forme(f"{nom} tête", MSO_SHAPE.OVAL, cx - 0.13 * s, cy - 0.44 * s, 0.26 * s, 0.26 * s,
             fond=couleur, contour=fond, ep=1.0, role="picto")
    pl.forme(f"{nom} buste", MSO_SHAPE.ROUND_2_SAME_RECTANGLE, cx - 0.25 * s, cy - 0.14 * s, 0.50 * s, 0.42 * s,
             fond=couleur, contour=fond, ep=1.0, rayon=0.25 * s, role="picto")


def picto_lecture(pl: Planche, nom, cx, cy, s, couleur):
    pl.forme(f"{nom} cercle", MSO_SHAPE.OVAL, cx - s / 2, cy - s / 2, s, s, contour=couleur, ep=1.5, role="picto")
    # triangle isocèle tourné de 90° : pointe vers la droite
    pl.forme(f"{nom} triangle", MSO_SHAPE.ISOSCELES_TRIANGLE, cx + 0.05 * s - 0.21 * s, cy - 0.18 * s,
             0.42 * s, 0.36 * s, fond=couleur, rotation=90, role="picto")


def picto_engrenage(pl: Planche, nom, cx, cy, s, couleur, fond):
    pl.forme(f"{nom} engrenage", MSO_SHAPE.GEAR_6, cx - 0.48 * s, cy - 0.48 * s, 0.96 * s, 0.96 * s,
             fond=couleur, role="picto")
    pl.forme(f"{nom} moyeu", MSO_SHAPE.OVAL, cx - 0.16 * s, cy - 0.16 * s, 0.32 * s, 0.32 * s,
             fond=fond, role="picto")


def picto_lieu(pl: Planche, nom, cx, cy, s, couleur, fond):
    cy -= 0.10 * s  # la pointe dépasse sous le cercle
    pl.forme(f"{nom} repère", MSO_SHAPE.TEAR, cx - s / 2, cy - s / 2, s, s, fond=couleur, rotation=135, role="picto")
    pl.forme(f"{nom} point", MSO_SHAPE.OVAL, cx - 0.18 * s, cy - 0.18 * s, 0.36 * s, 0.36 * s, fond=fond, role="picto")


def picto_calendrier(pl: Planche, nom, cx, cy, s):
    x, y = cx - s / 2, cy - s / 2
    pl.forme(f"{nom} corps", MSO_SHAPE.ROUNDED_RECTANGLE, x, y + 0.08 * s, s, 0.92 * s,
             fond=C["blanc"], contour=C["bleu"], ep=1.25, rayon=0.10 * s, role="picto")
    pl.forme(f"{nom} bandeau", MSO_SHAPE.ROUND_2_SAME_RECTANGLE, x, y + 0.08 * s, s, 0.26 * s,
             fond=C["bleu"], rayon=0.10 * s, role="picto")
    for k, fx in enumerate((0.27, 0.73)):
        pl.forme(f"{nom} anneau {k + 1}", MSO_SHAPE.ROUNDED_RECTANGLE, x + fx * s - 0.045 * s, y,
                 0.09 * s, 0.20 * s, fond=C["anthracite"], rayon=0.04 * s, role="picto")
    for r, fy in enumerate((0.48, 0.72)):
        for c, fx in enumerate((0.22, 0.50, 0.78)):
            pl.forme(f"{nom} case {r + 1}.{c + 1}", MSO_SHAPE.RECTANGLE, x + fx * s - 0.07 * s, y + fy * s,
                     0.14 * s, 0.12 * s, fond=C["bleu_trait"], role="picto")


def marqueur(pl: Planche, nom, genre, cx, cy):
    if genre == "puce":
        d = 0.085
        pl.forme(nom, MSO_SHAPE.OVAL, cx - d / 2, cy - d / 2, d, d, fond=C["bleu"], role="marqueur")
    elif genre == "losange":
        d = 0.11
        pl.forme(nom, MSO_SHAPE.DIAMOND, cx - d / 2, cy - d / 2, d, d, fond=C["anthracite"], role="marqueur")
    elif genre == "case":
        d = 0.12
        pl.forme(nom, MSO_SHAPE.ROUNDED_RECTANGLE, cx - d / 2, cy - d / 2, d, d, fond=C["blanc"],
                 contour=C["bleu"], ep=1.0, rayon=0.02, role="marqueur")
    else:
        raise ValueError(genre)


# =========================================================================== blocs


def bloc_entete(pl: Planche, pt: PointHebdo, geo: dict) -> None:
    with pl.groupe("En-tête"):
        pl.texte("Client", MARGE, Y_ENTETE, 5.0, 0.20,
                 [P(pt.client.upper(), 8.5, C["bleu"], gras=True, espacement_car=1.2)])
        pl.texte("Titre", MARGE, Y_ENTETE + 0.20, 7.4, 0.40, [P(pt.programme, 22, C["anthracite"], gras=True)])
        pl.texte("Sous-titre", MARGE, Y_ENTETE + 0.60, 7.4, 0.22,
                 [P(f"{pt.sous_titre} · {date_longue(pt.date_point)}", 11, C["gris"])])

        bw, bh = 3.30, 0.74
        bx, by = W_PAGE - MARGE - bw, Y_ENTETE + 0.04
        pl.forme("Cartouche semaine", MSO_SHAPE.ROUNDED_RECTANGLE, bx, by, bw, bh,
                 fond=C["pastel_clair"], contour=C["bleu_trait"], rayon=0.10)
        picto_calendrier(pl, "Picto calendrier", bx + 0.38, by + bh / 2, 0.38)
        pl.texte("Semaine et destinataires", bx + 0.72, by + 0.06, bw - 0.72 - 0.14, bh - 0.12, [
            P(libelle_semaine(*pt.semaine), 11.5, C["anthracite"], gras=True),
            Para((Run("Destinataires : ", couleur=C["gris"]),
                  Run(" · ".join(pt.destinataires), gras=True, couleur=C["texte"])),
                 9, C["gris"], espace_avant=2),
        ], ancre="middle")
    geo["entete"] = (MARGE, Y_ENTETE, LARG, 0.80)


def bloc_panneaux(pl: Planche, pt: PointHebdo, geo: dict) -> None:
    titres = ("Avancement et réalisations", "Risques et points d’attention", "Priorités et prochaines étapes")
    listes = (pt.avancement, pt.risques, pt.priorites)
    genres = ("puce", "losange", "case")
    pw = (LARG - 2 * GOUTTIERE) / 3
    x_txt, pad_d, pad_h, pad_b = 0.40, 0.16, 0.16, 0.14
    l_txt = pw - x_txt - pad_d
    h_corps = H_PANNEAUX - H_TITRE_PANNEAU - pad_h - pad_b

    # Taille de corps : la plus grande pour laquelle chaque panneau garde ≥ 0,08" entre items.
    for taille in (10.5, 10.0, 9.5, 9.0):
        paras = [[[proteger_plages(Para(balisage(t, couleur_gras=C["anthracite"]), taille, C["texte"]), l_txt)]
                  for t in liste] for liste in listes]
        hauteurs = [[hauteur_paras_in(p, l_txt) for p in col] for col in paras]
        ecarts = [(h_corps - sum(hs)) / (len(hs) - 1) for hs in hauteurs]
        if min(ecarts) >= 0.08:
            break
    else:
        raise RuntimeError("Panneaux : contenu trop long, même en 9 pt — raccourcir les libellés.")
    ecart = min(min(ecarts), 0.16)  # même rythme vertical dans les trois panneaux
    geo["panneaux"] = []
    geo["taille_corps"] = taille

    for i in range(3):
        px = MARGE + i * (pw + GOUTTIERE)
        n = i + 1
        with pl.groupe(f"Panneau {n} – {titres[i]}"):
            pl.forme(f"P{n} fond", MSO_SHAPE.ROUNDED_RECTANGLE, px, Y_PANNEAUX, pw, H_PANNEAUX,
                     fond=C["blanc"], rayon=0.10, role="panneau")
            pl.forme(f"P{n} bandeau titre", MSO_SHAPE.ROUND_2_SAME_RECTANGLE, px, Y_PANNEAUX, pw, H_TITRE_PANNEAU,
                     fond=C["pastel"], rayon=0.10)
            pl.forme(f"P{n} cadre", MSO_SHAPE.ROUNDED_RECTANGLE, px, Y_PANNEAUX, pw, H_PANNEAUX,
                     contour=C["bleu_trait"], ep=0.75, rayon=0.10, role="cadre")
            d = 0.28
            pl.forme(f"P{n} numéro", MSO_SHAPE.OVAL, px + 0.14, Y_PANNEAUX + (H_TITRE_PANNEAU - d) / 2, d, d,
                     fond=C["anthracite"], paras=[P(str(n), 11, C["blanc"], gras=True, align="center")])
            pl.texte(f"P{n} titre", px + 0.52, Y_PANNEAUX, pw - 0.52 - 0.12, H_TITRE_PANNEAU,
                     [P(titres[i], 12.5, C["anthracite"], gras=True)], ancre="middle")
            y = Y_PANNEAUX + H_TITRE_PANNEAU + pad_h
            for k, (para, h) in enumerate(zip(paras[i], hauteurs[i])):
                marqueur(pl, f"P{n} marqueur {k + 1}", genres[i], px + 0.235, y + 0.68 * taille / 72)
                pl.texte(f"P{n} item {k + 1}", px + x_txt, y, l_txt, h + 0.02, para, une_ligne=False)
                y += h + ecart
        geo["panneaux"].append((px, Y_PANNEAUX, pw, H_PANNEAUX))


def bloc_jira(pl: Planche, pt: PointHebdo, geo: dict) -> None:
    x0, y0, w0, h0 = MARGE, Y_BANDEAU, LARG, H_BANDEAU
    with pl.groupe("Classification Jira"):
        pl.forme("Jira fond", MSO_SHAPE.ROUNDED_RECTANGLE, x0, y0, w0, h0,
                 fond=C["pastel_clair"], contour=C["bleu_trait"], rayon=0.10, role="bandeau")
        l_lib = 1.78
        pl.texte("Jira libellé", x0 + 0.18, y0, l_lib, h0, [
            P("Classification Jira des tickets", 10.5, C["anthracite"], gras=True),
            P(f"{len(pt.classification_jira)} catégories de référence", 8.5, C["gris"], espace_avant=1),
        ], ancre="middle")
        x = x0 + 0.18 + l_lib + 0.10
        hc = 0.34
        yc = y0 + (h0 - hc) / 2
        for k, cat in enumerate(pt.classification_jira):
            tw = largeur_in(cat, 9.5, gras=True)
            cw = 0.38 + tw + 0.14
            pl.forme(f"Jira catégorie {k + 1}", MSO_SHAPE.ROUNDED_RECTANGLE, x, yc, cw, hc,
                     fond=C["blanc"], contour=C["bleu_trait"], rayon=hc / 2,
                     paras=[P(cat, 9.5, C["anthracite"], gras=True)], marges=(0.38, 0, 0.08, 0))
            d = 0.22
            pl.forme(f"Jira numéro {k + 1}", MSO_SHAPE.OVAL, x + 0.07, yc + (hc - d) / 2, d, d,
                     fond=C["bleu"], paras=[P(str(k + 1), 8.5, C["blanc"], gras=True, align="center")])
            x += cw + 0.10
        x_sep = x + 0.06
        pl.trait("Jira séparateur", x_sep, y0 + 0.12, x_sep, y0 + h0 - 0.12, couleur=C["bleu_trait"], ep=0.75)
        x_note = x_sep + 0.16
        pl.texte("Jira distinction", x_note, y0, x0 + w0 - 0.18 - x_note, h0, [
            P("Distincte du découpage :", 8, C["gris"], italique=True),
            Para((Run(typo_fr(" / ".join(pt.decoupage_jira)), italique=True, gras=True),), 8, C["texte"],
                 espace_avant=1),
        ], ancre="middle", une_ligne=False)
    geo["bandeau"] = (x0, y0, w0, h0)


def _style_carte(j: Jalon, passe: bool) -> dict:
    if passe:
        return dict(entete=C["fond_gris"], motif=None, texte_entete=C["anthracite"], contour=C["trait"],
                    pointilles=False, picto=C["gris_clair"], puce=C["fond_gris"])
    if j.type is TypeJalon.DRY_RUN:
        return dict(entete=C["anthracite"], motif=None, texte_entete=C["blanc"], contour=C["anthracite"],
                    pointilles=False, picto=C["anthracite"], puce=C["pastel_clair"])
    if j.type is TypeJalon.MAINTENANCE:
        return dict(entete=(C["hachure"], C["blanc"]), motif=MSO_PATTERN.LIGHT_UPWARD_DIAGONAL,
                    texte_entete=C["anthracite"], contour=C["anthracite"], pointilles=True,
                    picto=C["anthracite"], puce=C["blanc"])
    return dict(entete=C["pastel"], motif=None, texte_entete=C["anthracite"], contour=C["bleu_trait"],
                pointilles=False, picto=C["bleu"], puce=C["pastel_clair"])


def bloc_chronogramme(pl: Planche, pt: PointHebdo, geo: dict) -> None:
    jalons = pt.jalons
    n = len(jalons)
    cw = (LARG - (n - 1) * ECART_CARTES) / n
    j0, jn = jalons[0], jalons[-1]
    periode = f"{MOIS_LONG[j0.debut.month - 1]} {j0.debut.year} à {MOIS_LONG[jn.fin.month - 1]} {jn.fin.year}"

    with pl.groupe("Chronogramme – titre"):
        pl.texte("Chronogramme titre", MARGE, Y_TITRE_CHRONO, 7.2, H_TITRE_CHRONO, [
            Para((Run("Chronogramme VAUBAN", gras=True, taille=14),
                  Run(typo_fr(f" – {periode}"), taille=12, couleur=C["gris"])), 14, C["anthracite"]),
        ], ancre="middle")
        runs = (Run(typo_fr("Périmètre Task Force : "), couleur=C["gris"]),
                Run(pt.perimetre_task_force, gras=True, couleur=C["anthracite"]))
        tw = sum(largeur_in(r.texte, 9, r.gras) for r in runs)
        pw_, ph_ = tw + 0.34, 0.26
        pl.forme("Périmètre Task Force", MSO_SHAPE.ROUNDED_RECTANGLE, W_PAGE - MARGE - pw_,
                 Y_TITRE_CHRONO + (H_TITRE_CHRONO - ph_) / 2, pw_, ph_, fond=C["pastel_clair"],
                 contour=C["bleu_trait"], rayon=ph_ / 2, paras=[Para(runs, 9, C["gris"], align="center")],
                 marges=(0.06, 0, 0.06, 0))

    cartes, points = [], []
    for k, j in enumerate(jalons):
        x = MARGE + k * (cw + ECART_CARTES)
        cx = x + cw / 2
        passe = j.fin < pt.date_point
        st = _style_carte(j, passe)
        lib = libelle_jalon(j)
        with pl.groupe(f"Jalon {k + 1} – {lib.replace(chr(160), ' ')} – {j.titre} {j.sous_titre}"):
            pl.forme(f"J{k + 1} fond", MSO_SHAPE.ROUNDED_RECTANGLE, x, Y_CARTES, cw, H_CARTES,
                     fond=C["blanc"], rayon=0.08, role="carte")
            pl.forme(f"J{k + 1} date", MSO_SHAPE.ROUND_2_SAME_RECTANGLE, x, Y_CARTES, cw, H_ENTETE_CARTE,
                     fond=st["entete"], motif=st["motif"], rayon=0.08,
                     paras=[P(lib, 10.5, st["texte_entete"], gras=True, align="center")], marges=(0.04, 0, 0.04, 0))
            pl.forme(f"J{k + 1} cadre", MSO_SHAPE.ROUNDED_RECTANGLE, x, Y_CARTES, cw, H_CARTES,
                     contour=st["contour"], ep=1.0, pointilles=st["pointilles"], rayon=0.08, role="cadre")
            yp = Y_CARTES + 0.54
            if j.type is TypeJalon.TASK_FORCE:
                picto_equipe(pl, f"J{k + 1} picto", cx, yp, 0.30, st["picto"], C["blanc"])
            elif j.type is TypeJalon.DRY_RUN:
                picto_lecture(pl, f"J{k + 1} picto", cx, yp, 0.26, st["picto"])
            else:
                picto_engrenage(pl, f"J{k + 1} picto", cx, yp, 0.28, st["picto"], C["blanc"])
            pl.texte(f"J{k + 1} titre", x + 0.04, Y_CARTES + 0.73, cw - 0.08, 0.19,
                     [P(j.titre, 10.5, C["anthracite"], gras=True, align="center")])
            pl.texte(f"J{k + 1} sous-titre", x + 0.04, Y_CARTES + 0.92, cw - 0.08, 0.17,
                     [P(j.sous_titre, 9.5, C["texte"], align="center")])
            hp, yc = 0.21, Y_CARTES + 1.14
            if j.lieu:
                tw = largeur_in(j.lieu, 8.5, gras=True)
                pw_ = 0.21 + tw + 0.10
                xp = cx - pw_ / 2
                pl.forme(f"J{k + 1} lieu", MSO_SHAPE.ROUNDED_RECTANGLE, xp, yc, pw_, hp, fond=st["puce"],
                         rayon=hp / 2, paras=[P(j.lieu, 8.5, C["anthracite"], gras=True)], marges=(0.21, 0, 0.06, 0))
                picto_lieu(pl, f"J{k + 1} picto lieu", xp + 0.115, yc + hp / 2, 0.11,
                           C["gris"] if passe else C["anthracite"], st["puce"])
            elif j.mention:
                tw = largeur_in(j.mention, 8.5, italique=True)
                pw_ = tw + 0.20
                pl.forme(f"J{k + 1} mention", MSO_SHAPE.ROUNDED_RECTANGLE, cx - pw_ / 2, yc, pw_, hp,
                         fond=C["blanc"], contour=C["anthracite"], ep=0.75, pointilles=True, rayon=hp / 2,
                         paras=[P(j.mention, 8.5, C["anthracite"], italique=True, align="center")],
                         marges=(0.05, 0, 0.05, 0))
            # liaison carte → axe et point d'échéance
            r = 0.075
            pl.trait(f"J{k + 1} liaison", cx, Y_CARTES + H_CARTES, cx, Y_AXE - r, couleur=C["trait"], ep=1.0)
            if passe:
                pl.forme(f"J{k + 1} point", MSO_SHAPE.OVAL, cx - r, Y_AXE - r, 2 * r, 2 * r,
                         fond=C["gris"], contour=C["blanc"], ep=1.0, role="point")
            else:
                couleur = C["bleu"] if j.type is TypeJalon.TASK_FORCE else C["anthracite"]
                pl.forme(f"J{k + 1} point", MSO_SHAPE.OVAL, cx - r, Y_AXE - r, 2 * r, 2 * r,
                         fond=C["blanc"], contour=couleur, ep=2.0, role="point")
        cartes.append((x, Y_CARTES, cw, H_CARTES))
        points.append((cx, Y_AXE))

    with pl.groupe("Chronogramme – axe et repères"):
        pl.trait("Axe du temps", MARGE, Y_AXE, MARGE + LARG, Y_AXE, couleur=C["anthracite"], ep=1.5, fleche=True)
        # mois : regroupement des cartes consécutives d'un même mois
        groupes: list[list[int]] = []
        for k, j in enumerate(jalons):
            if groupes and (jalons[groupes[-1][0]].debut.year, jalons[groupes[-1][0]].debut.month) == \
                    (j.debut.year, j.debut.month):
                groupes[-1].append(k)
            else:
                groupes.append([k])
        geo["mois"] = []
        for g_i, grp in enumerate(groupes):
            gx1 = cartes[grp[0]][0]
            gx2 = cartes[grp[-1]][0] + cw
            d = jalons[grp[0]].debut
            lib = f"{MOIS_LONG[d.month - 1].capitalize()} {d.year}"
            pl.texte(f"Mois {g_i + 1}", gx1, Y_MOIS, gx2 - gx1, 0.18,
                     [P(lib, 8.5, C["gris"], gras=True, align="center")])
            geo["mois"].append((lib, gx1, gx2, grp))
            if g_i > 0:
                xs = gx1 - ECART_CARTES / 2
                pl.trait(f"Séparateur mois {g_i}", xs, Y_AXE - 0.10, xs, Y_AXE + 0.10, couleur=C["gris_clair"], ep=1.0)
        # repère « date du point » entre la dernière échéance passée et la première à venir
        passes = [k for k, j in enumerate(jalons) if j.fin < pt.date_point]
        if passes and passes[-1] + 1 < n:
            k = passes[-1]
            xm = cartes[k][0] + cw + ECART_CARTES / 2
            jj = pt.date_point
            etiquette = f"Point du {jj.day:02d}/{jj.month:02d}"
            ew, eh = largeur_in(etiquette, 8, gras=True) + 0.20, 0.21
            pl.trait("Repère date du point", xm, Y_CARTES - 0.04, xm, Y_AXE - eh / 2, couleur=C["anthracite"],
                     ep=1.0, pointilles=True)
            pl.forme("Étiquette date du point", MSO_SHAPE.ROUNDED_RECTANGLE, xm - ew / 2, Y_AXE - eh / 2, ew, eh,
                     fond=C["anthracite"], rayon=eh / 2, paras=[P(etiquette, 8, C["blanc"], gras=True, align="center")],
                     marges=(0.03, 0, 0.03, 0))
            geo["repere"] = (xm, k)
    geo["cartes"] = cartes
    geo["points"] = points
    geo["axe"] = (MARGE, Y_AXE, MARGE + LARG)
    _legende(pl, pt)


def _legende(pl: Planche, pt: PointHebdo) -> None:
    yc = Y_LEGENDE + H_LEGENDE / 2
    jj = pt.date_point
    entrees = (
        ("passe", f"Échéance passée (au {jj.day:02d}/{jj.month:02d})"),
        ("avenir", "À venir"),
        ("tf", f"Task Force {pt.perimetre_task_force}"),
        ("dr", "Dry Run"),
        ("mt", "Maintenance – à confirmer"),
        ("lieu", "Lieu"),
    )
    with pl.groupe("Légende"):
        x = MARGE
        for k, (genre, lib) in enumerate(entrees):
            nom = f"Légende {k + 1}"
            if genre in ("passe", "avenir"):
                r = 0.065
                if genre == "passe":
                    pl.forme(f"{nom} symbole", MSO_SHAPE.OVAL, x, yc - r, 2 * r, 2 * r, fond=C["gris"], role="picto")
                else:
                    pl.forme(f"{nom} symbole", MSO_SHAPE.OVAL, x, yc - r, 2 * r, 2 * r, fond=C["blanc"],
                             contour=C["bleu"], ep=1.75, role="picto")
                ws = 2 * r
            elif genre == "lieu":
                picto_lieu(pl, f"{nom} symbole", x + 0.06, yc, 0.12, C["anthracite"], C["blanc"])
                ws = 0.12
            else:
                ws, hs = 0.24, 0.14
                kw = {"tf": dict(fond=C["pastel"], contour=C["bleu_trait"]),
                      "dr": dict(fond=C["anthracite"]),
                      "mt": dict(fond=(C["hachure"], C["blanc"]), motif=MSO_PATTERN.LIGHT_UPWARD_DIAGONAL,
                                 contour=C["anthracite"], pointilles=True)}[genre]
                pl.forme(f"{nom} symbole", MSO_SHAPE.ROUNDED_RECTANGLE, x, yc - hs / 2, ws, hs, rayon=0.03,
                         ep=0.75, role="picto", **kw)
            tw = largeur_in(lib, 8.5) + 0.04
            pl.texte(f"{nom} texte", x + ws + 0.07, yc - 0.10, tw, 0.20, [P(lib, 8.5, C["texte"])], ancre="middle")
            x += ws + 0.07 + tw + 0.20
        x_note = x + 0.10
        pl.texte("Note calendrier", x_note, Y_LEGENDE - 0.02, W_PAGE - MARGE - x_note, H_LEGENDE + 0.04,
                 [P(pt.note_calendrier, 8, C["gris"], italique=True, align="right")], ancre="middle", une_ligne=False)


def proprietes(prs, pt: PointHebdo) -> None:
    cp = prs.core_properties
    cp.title = f"VAUBAN – Point hebdomadaire du {date_longue(pt.date_point)}"
    cp.subject = f"{pt.programme} – {pt.client}"
    cp.author = "Programme VAUBAN"
    cp.last_modified_by = "Programme VAUBAN"
    cp.keywords = "VAUBAN; Proginov; point hebdomadaire; chronogramme; Task Force VitalAire"
    cp.language = "fr-FR"
    cp.revision = 1
    maintenant = datetime.now(timezone.utc).replace(microsecond=0, tzinfo=None)
    cp.created = maintenant
    cp.modified = maintenant


def construire(pt: PointHebdo):
    prs = Presentation()
    prs.slide_width, prs.slide_height = emu(W_PAGE), emu(H_PAGE)
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # mise en page « Vide »
    fond = slide.background.fill
    fond.solid()
    fond.fore_color.rgb = rgb(C["blanc"])
    pl = Planche(slide)
    geo: dict = {"page": (W_PAGE, H_PAGE), "marge": MARGE}
    bloc_entete(pl, pt, geo)
    bloc_panneaux(pl, pt, geo)
    bloc_jira(pl, pt, geo)
    bloc_chronogramme(pl, pt, geo)
    proprietes(prs, pt)
    return prs, pl, geo


# =========================================================================== exports


def exporter_pdf(pptx: Path, dossier: Path) -> Path:
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        raise RuntimeError("LibreOffice (soffice) introuvable : export PDF impossible.")
    with tempfile.TemporaryDirectory(prefix="lo_profil_") as profil:
        env = dict(os.environ, SAL_USE_VCLPLUGIN="svp")
        cmd = [soffice, f"-env:UserInstallation={Path(profil).as_uri()}", "--headless", "--norestore",
               "--convert-to", "pdf", "--outdir", str(dossier), str(pptx)]
        subprocess.run(cmd, env=env, check=True, timeout=300, capture_output=True)
    pdf = dossier / f"{pptx.stem}.pdf"
    if not pdf.exists():
        raise RuntimeError(f"Export PDF absent : {pdf}")
    return pdf


def exporter_png(pdf: Path, png: Path, dpi: int) -> Path:
    if not shutil.which("pdftoppm"):
        raise RuntimeError("pdftoppm (poppler-utils) introuvable : aperçu PNG impossible.")
    subprocess.run(["pdftoppm", "-png", "-r", str(dpi), "-singlefile", str(pdf), str(png.with_suffix(""))],
                   check=True, timeout=120)
    return png


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sortie", type=Path, default=RACINE / "livrables")
    ap.add_argument("--nom", default=f"VAUBAN_Point-hebdo_{POINT.date_point.isoformat()}")
    ap.add_argument("--dpi", type=int, default=200)
    ap.add_argument("--sans-export", action="store_true", help="ne produit que le PPTX")
    args = ap.parse_args(argv)

    args.sortie.mkdir(parents=True, exist_ok=True)
    prs, pl, geo = construire(POINT)
    pptx = args.sortie / f"{args.nom}.pptx"
    prs.save(pptx)
    print(f"PPTX : {pptx}")
    resultats = controles.avant_rendu(POINT, pl, geo)
    if not args.sans_export:
        pdf = exporter_pdf(pptx, args.sortie)
        print(f"PDF  : {pdf}")
        png = exporter_png(pdf, args.sortie / f"{args.nom}.png", args.dpi)
        print(f"PNG  : {png}")
        resultats += controles.apres_rendu(POINT, pl, geo, pdf)
    return controles.afficher(resultats)


if __name__ == "__main__":
    sys.exit(main())
