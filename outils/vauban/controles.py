"""Contrôles qualité du point hebdomadaire VAUBAN.

- avant_rendu : dates (libellés source ↔ dates ISO ↔ cartes affichées ↔ mentions
  dans le texte), contenu (mot « Projet », classification Jira, anti-KPI),
  géométrie (marges, alignements, chevauchements) et ajustement estimé du texte.
- apres_rendu : contrôle du PDF réellement rendu (1 page A4 paysage, chaque
  caractère dans son bloc, nombre de lignes, textes attendus, mots interdits).

Les libellés de dates sont relus ici par un analyseur indépendant du code de
génération : une erreur de formatage ne peut pas se valider elle-même.
"""

from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from itertools import combinations, pairwise

from mesure import NBSP, couper, hauteur_ligne_in

OK, ALERTE, ECHEC = "OK", "ALERTE", "ÉCHEC"

MOIS = {
    "janvier": 1, "janv.": 1, "février": 2, "févr.": 2, "mars": 3, "avril": 4, "avr.": 4, "mai": 5,
    "juin": 6, "juillet": 7, "juil.": 7, "août": 8, "septembre": 9, "sept.": 9, "octobre": 10,
    "oct.": 10, "novembre": 11, "nov.": 11, "décembre": 12, "déc.": 12,
}
JOURS = ("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche")
_MOIS_RE = "|".join(re.escape(m) for m in sorted(MOIS, key=len, reverse=True))
_RE_LIBELLE = re.compile(rf"^(\d{{1,2}})(?:\s*[–-]\s*(\d{{1,2}}))?\s+({_MOIS_RE})(?:\s+(\d{{4}}))?$")
_RE_DATE_NUM = re.compile(r"(?<![\d/])(\d{1,2})(?:–(\d{1,2}))?/(\d{1,2})(?![\d/])")
_RE_DATE_TXT = re.compile(rf"(?<!\d)(\d{{1,2}})(?:–(\d{{1,2}}))?\s({_MOIS_RE})(?:\s(\d{{4}}))?")
_RE_PROJET = re.compile(r"\bprojets?\b", re.IGNORECASE)
TOL = 0.003  # pouces


@dataclass
class Resultat:
    categorie: str
    nom: str
    niveau: str
    detail: str = ""


def _res(cat, nom, ok, detail="", *, alerte=False) -> Resultat:
    return Resultat(cat, nom, OK if ok else (ALERTE if alerte else ECHEC), detail)


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace(NBSP, " ")).strip()


def _annee(mois: int, ref: date) -> int:
    """Fenêtre glissante de 12 mois à partir du mois du point."""
    return ref.year if mois >= ref.month else ref.year + 1


def lire_libelle(libelle: str, ref: date) -> tuple[date, date]:
    m = _RE_LIBELLE.match(_norm(libelle).lower())
    if not m:
        raise ValueError(f"libellé de date illisible : {libelle!r}")
    mois = MOIS[m[3]]
    an = int(m[4]) if m[4] else _annee(mois, ref)
    return date(an, mois, int(m[1])), date(an, mois, int(m[2] or m[1]))


def mentions_de_dates(texte: str, ref: date) -> list[tuple[str, date, date]]:
    texte = _norm(texte)
    sortie = []
    for m in _RE_DATE_NUM.finditer(texte):
        mois = int(m[3])
        an = _annee(mois, ref)
        sortie.append((m[0], date(an, mois, int(m[1])), date(an, mois, int(m[2] or m[1]))))
    for m in _RE_DATE_TXT.finditer(texte):
        mois = MOIS[m[3].lower()]
        an = int(m[4]) if m[4] else _annee(mois, ref)
        sortie.append((m[0], date(an, mois, int(m[1])), date(an, mois, int(m[2] or m[1]))))
    return sortie


def _textes(pl, *, sauf_groupes=()) -> list:
    return [e for e in pl.elements if e.role == "texte" and not e.groupe.startswith(sauf_groupes)]


# =========================================================================== dates


def controler_dates(pt, pl, geo) -> list[Resultat]:
    cat = "Dates"
    res = []
    ref = pt.date_point

    erreurs, jours = [], []
    for j in pt.jalons:
        try:
            d1, d2 = lire_libelle(j.libelle_source, ref)
        except ValueError as exc:
            erreurs.append(str(exc))
            continue
        if (d1, d2) != (j.debut, j.fin):
            erreurs.append(f"« {j.libelle_source} » ≠ {j.debut:%d/%m/%Y}–{j.fin:%d/%m/%Y}")
        if j.fin < j.debut:
            erreurs.append(f"« {j.libelle_source} » : fin avant début")
        jours.append((j, f"{JOURS[j.debut.weekday()]}" + ("" if j.debut == j.fin else f"–{JOURS[j.fin.weekday()]}")))
    res.append(_res(cat, "Libellés source ↔ dates saisies", not erreurs,
                    "; ".join(erreurs) or f"{len(pt.jalons)} échéances concordantes"))

    chevauchements = [f"{a.libelle_source} / {b.libelle_source}" for a, b in pairwise(pt.jalons) if not a.fin < b.debut]
    res.append(_res(cat, "Ordre chronologique, sans chevauchement", not chevauchements, "; ".join(chevauchements)))

    s1, s2 = pt.semaine
    ok_sem = s1.weekday() == 0 and s2.weekday() == 4 and (s2 - s1) == timedelta(days=4) and s1 <= ref <= s2
    res.append(_res(cat, "Semaine du point (lundi → vendredi, contient le 13/11)", ok_sem,
                    f"{JOURS[s1.weekday()]} {s1:%d/%m} → {JOURS[s2.weekday()]} {s2:%d/%m/%Y} ; point {ref:%d/%m/%Y}"))

    weekend = [f"{j.libelle_source} ({jj})" for j, jj in jours
               if j.type.name != "MAINTENANCE" and any(d.weekday() >= 5 for d in (j.debut, j.fin))]
    res.append(_res(cat, "Jours de la semaine des Task Forces / Dry Run", not weekend,
                    ("tombe un week-end, à confirmer : " + "; ".join(weekend)) if weekend else
                    "toutes en semaine", alerte=True))
    res.append(_res(cat, "Jours calculés", True, " · ".join(f"{j.libelle_source} = {jj}" for j, jj in jours)))

    # cartes affichées : relecture du libellé imprimé
    ecarts = []
    for k, j in enumerate(pt.jalons):
        txt = pl.par_nom(f"J{k + 1} date").texte
        try:
            d1, d2 = lire_libelle(txt, ref)
            if (d1, d2) != (j.debut, j.fin):
                ecarts.append(f"carte {k + 1} « {_norm(txt)} » ≠ {j.libelle_source}")
        except ValueError as exc:
            ecarts.append(str(exc))
    res.append(_res(cat, "Cartes du chronogramme ↔ échéances", not ecarts, "; ".join(ecarts) or "8/8"))

    # mois sous l'axe
    ecarts = []
    for lib, _x1, _x2, idx in geo["mois"]:
        mois_lib, an_lib = lib.lower().split()
        for k in idx:
            j = pt.jalons[k]
            if (MOIS[mois_lib], int(an_lib)) != (j.debut.month, j.debut.year):
                ecarts.append(f"{lib} ↔ {j.libelle_source}")
    couverts = sorted(k for *_, idx in geo["mois"] for k in idx)
    res.append(_res(cat, "Libellés de mois sous l'axe", not ecarts and couverts == list(range(len(pt.jalons))),
                    "; ".join(ecarts) or " | ".join(m[0] for m in geo["mois"])))

    # repère « date du point »
    passes = [k for k, j in enumerate(pt.jalons) if j.fin < ref]
    if "repere" in geo:
        xm, k = geo["repere"]
        cartes = geo["cartes"]
        ok = k == passes[-1] and cartes[k][0] + cartes[k][2] < xm < cartes[k + 1][0]
        res.append(_res(cat, "Repère du 13/11 entre échéances passées et à venir", ok,
                        f"après « {pt.jalons[k].libelle_source} », avant « {pt.jalons[k + 1].libelle_source} »"))

    # dates citées dans les panneaux et l'en-tête
    connues = {(j.debut, j.fin) for j in pt.jalons}
    semaine = {s1 + timedelta(days=i) for i in range((s2 - s1).days + 1)}
    inconnues, vues = [], 0
    for e in _textes(pl, sauf_groupes=("Jalon", "Chronogramme")):
        for brut, d1, d2 in mentions_de_dates(e.texte, ref):
            vues += 1
            if (d1, d2) not in connues and not (d1 == d2 and (d1 in semaine or d1 == ref)):
                inconnues.append(f"« {brut} » ({e.nom})")
    res.append(_res(cat, "Dates citées dans le texte ↔ chronogramme", not inconnues,
                    "; ".join(inconnues) or f"{vues} mentions vérifiées"))
    return res


# =========================================================================== contenu


def controler_contenu(pt, pl) -> list[Resultat]:
    cat = "Contenu"
    res = []
    chrono = [e for e in pl.elements if e.groupe.startswith(("Chronogramme", "Jalon", "Légende"))]
    fautes = sorted({e.nom for e in chrono if _RE_PROJET.search(e.texte) or _RE_PROJET.search(e.groupe)})
    res.append(_res(cat, "« Projet » absent du chronogramme (textes et noms de groupes)", not fautes, ", ".join(fautes)))
    ailleurs = sorted({e.nom for e in pl.elements if _RE_PROJET.search(e.texte)} - set(fautes))
    res.append(_res(cat, "« Projet » absent du reste de la page", not ailleurs, ", ".join(ailleurs), alerte=True))

    puces = [_norm(pl.par_nom(f"Jira catégorie {k + 1}").texte) for k in range(len(pt.classification_jira))]
    attendu = [_norm(c) for c in pt.classification_jira]
    res.append(_res(cat, "Classification Jira : 4 catégories, dans l'ordre", puces == attendu and len(puces) == 4,
                    " | ".join(puces)))
    melange = [p for p in puces if any(t.lower() in p.lower() for t in pt.decoupage_jira)]
    note = _norm(pl.par_nom("Jira distinction").texte)
    ok = not melange and all(t in note for t in pt.decoupage_jira)
    res.append(_res(cat, "Classification ≠ découpage Processus/Sous-processus/Thématique/Thérapie", ok,
                    "découpage cité uniquement comme distinction" if ok else f"mélange : {melange}"))
    confusions = [e.nom for e in _textes(pl) if e.nom != "Jira distinction"
                  and "classification" in e.texte.lower()
                  and any(t.lower() in e.texte.lower() for t in pt.decoupage_jira)]
    res.append(_res(cat, "Aucun texte n'associe « classification » au découpage", not confusions, ", ".join(confusions)))

    ecarts = []
    for k, j in enumerate(pt.jalons):
        t = _norm(pl.par_nom(f"J{k + 1} titre").texte)
        s = _norm(pl.par_nom(f"J{k + 1} sous-titre").texte)
        if (t, s) != (_norm(j.titre), _norm(j.sous_titre)):
            ecarts.append(f"carte {k + 1} : {t} / {s}")
        if j.lieu and _norm(pl.par_nom(f"J{k + 1} lieu").texte) != j.lieu:
            ecarts.append(f"carte {k + 1} : lieu")
        if j.mention and _norm(pl.par_nom(f"J{k + 1} mention").texte) != j.mention:
            ecarts.append(f"carte {k + 1} : mention")
    res.append(_res(cat, "Cartes : intitulés, lieux et mentions", not ecarts, "; ".join(ecarts) or "8/8"))

    entete = _norm(pl.par_nom("Semaine et destinataires").texte)
    res.append(_res(cat, "Destinataires affichés", all(d in entete for d in pt.destinataires), entete))

    # Anti-KPI : aucun nombre hors dates, « n°6 » et « 4 catégories »
    suspects = []
    for e in _textes(pl, sauf_groupes=("Jalon", "Chronogramme", "Légende", "En-tête")):
        if e.nom.startswith(("P", "Jira")) and not re.search(r"numéro", e.nom):
            t = _norm(e.texte)
            t = _RE_DATE_NUM.sub("", t)
            t = _RE_DATE_TXT.sub("", t)
            t = re.sub(r"n°\d+|\b\d+ catégories\b", "", t)
            suspects += [f"{e.nom} : {m}" for m in re.findall(r"\d+(?:[.,]\d+)?\s*%?", t)]
    res.append(_res(cat, "Aucun KPI chiffré ajouté (nombres hors dates)", not suspects, "; ".join(suspects)))
    return res


# =========================================================================== géométrie


def _zone_texte(e) -> tuple[float, float, float, float]:
    g, h, d, b = e.marges
    return e.x + g, e.y + h, e.x2 - d, e.y2 - b


def _inter(a, b) -> float:
    """Surface commune des zones de texte utiles (marges et retraits déduits)."""
    ax1, ay1, ax2, ay2 = _zone_texte(a)
    bx1, by1, bx2, by2 = _zone_texte(b)
    w = min(ax2, bx2) - max(ax1, bx1)
    h = min(ay2, by2) - max(ay1, by1)
    return w * h if w > 0 and h > 0 else 0.0


def controler_geometrie(pt, pl, geo) -> list[Resultat]:
    cat = "Géométrie"
    res = []
    W, H = geo["page"]
    M = geo["marge"]
    hors = [e.nom for e in pl.elements
            if e.x < 0.30 - TOL or e.y < 0.30 - TOL or e.x2 > W - 0.30 + TOL or e.y2 > H - 0.30 + TOL]
    res.append(_res(cat, "Tous les éléments à ≥ 0,30\" des bords de la page", not hors, ", ".join(hors[:8])))

    pan = geo["panneaux"]
    g1 = pan[1][0] - (pan[0][0] + pan[0][2])
    g2 = pan[2][0] - (pan[1][0] + pan[1][2])
    ok = (len({round(p[1], 4) for p in pan}) == 1 and len({round(p[3], 4) for p in pan}) == 1
          and len({round(p[2], 4) for p in pan}) == 1 and abs(g1 - g2) < TOL
          and abs(pan[0][0] - M) < TOL and abs(pan[2][0] + pan[2][2] - (W - M)) < TOL)
    res.append(_res(cat, "Panneaux : même hauteur, même largeur, gouttières égales, calés sur les marges", ok,
                    f"largeur {pan[0][2]:.3f}\" · gouttières {g1:.3f}\"/{g2:.3f}\""))

    bx, by, bw, bh = geo["bandeau"]
    cartes = geo["cartes"]
    ax1, ay, ax2 = geo["axe"]
    bords = {
        "bandeau Jira": (bx, bx + bw),
        "rangée de cartes": (cartes[0][0], cartes[-1][0] + cartes[-1][2]),
        "axe du temps": (ax1, ax2),
        "panneaux": (pan[0][0], pan[2][0] + pan[2][2]),
    }
    decal = [k for k, (a, b) in bords.items() if abs(a - M) > TOL or abs(b - (W - M)) > TOL]
    res.append(_res(cat, "Bords gauche/droit communs (panneaux, bandeau, cartes, axe)", not decal, ", ".join(decal)))

    ecarts = [cartes[i + 1][0] - (cartes[i][0] + cartes[i][2]) for i in range(len(cartes) - 1)]
    ok = (len({round(c[2], 4) for c in cartes}) == 1 and len({round(c[1], 4) for c in cartes}) == 1
          and max(ecarts) - min(ecarts) < TOL)
    res.append(_res(cat, "Cartes : largeurs et intervalles égaux", ok,
                    f"largeur {cartes[0][2]:.3f}\" · intervalle {ecarts[0]:.3f}\""))

    decentrages = []
    for k, (c, p) in enumerate(zip(cartes, geo["points"])):
        ccx = c[0] + c[2] / 2
        for nom in (f"J{k + 1} point", f"J{k + 1} liaison", f"J{k + 1} titre", f"J{k + 1} sous-titre", f"J{k + 1} date"):
            e = pl.par_nom(nom)
            if abs(e.cx - ccx) > TOL:
                decentrages.append(nom)
        if abs(p[1] - ay) > TOL or abs(pl.par_nom(f"J{k + 1} point").cy - ay) > TOL:
            decentrages.append(f"J{k + 1} point hors axe")
        for nom in (f"J{k + 1} lieu", f"J{k + 1} mention"):
            try:
                if abs(pl.par_nom(nom).cx - ccx) > TOL:
                    decentrages.append(nom)
            except KeyError:
                pass
    res.append(_res(cat, "Points, liaisons et textes centrés sur leur carte et sur l'axe", not decentrages,
                    ", ".join(decentrages)))

    mal = [lib for lib, x1, x2, _ in geo["mois"] if abs(pl.par_nom(f"Mois {geo['mois'].index((lib, x1, x2, _)) + 1}").cx
                                                        - (x1 + x2) / 2) > TOL]
    res.append(_res(cat, "Libellés de mois centrés sous leurs cartes", not mal, ", ".join(mal)))

    # alignement des items dans chaque panneau
    defauts = []
    for n in (1, 2, 3):
        items = sorted((e for e in pl.elements if re.fullmatch(rf"P{n} item \d+", e.nom)), key=lambda e: e.y)
        marq = sorted((e for e in pl.elements if re.fullmatch(rf"P{n} marqueur \d+", e.nom)), key=lambda e: e.y)
        if len({round(e.x, 4) for e in items}) != 1 or len({round(e.cx, 4) for e in marq}) != 1:
            defauts.append(f"P{n} : colonnes non alignées")
        for a, b in pairwise(items):
            if b.y - a.y2 < 0.05:
                defauts.append(f"P{n} : items trop proches ({a.nom}/{b.nom})")
        for it, mq in zip(items, marq):
            if not (it.y <= mq.cy <= it.y + hauteur_ligne_in(geo["taille_corps"])):
                defauts.append(f"{mq.nom} hors de la 1re ligne")
        px, py, pw, ph = pan[n - 1]
        if items and items[-1].y2 > py + ph - 0.06:
            defauts.append(f"P{n} : dernier item trop près du bas")
    res.append(_res(cat, "Panneaux : puces et textes alignés, items espacés", not defauts, "; ".join(defauts)))

    # enchaînement vertical des blocs
    def boite(prefixes):
        els = [e for e in pl.elements if e.groupe.startswith(prefixes)]
        return min(e.y for e in els), max(e.y2 for e in els)

    blocs = [("en-tête", boite(("En-tête",))), ("panneaux", boite(("Panneau",))),
             ("bandeau Jira", boite(("Classification",))), ("titre chronogramme", boite(("Chronogramme – titre",))),
             ("cartes", boite(("Jalon",))), ("axe et mois", boite(("Chronogramme – axe",))),
             ("légende", boite(("Légende",)))]
    serres = []
    for (na, (_, a2)), (nb, (b1, _)) in pairwise(blocs):
        if nb == "axe et mois":
            continue  # les liaisons des cartes rejoignent l'axe par construction
        if b1 - a2 < 0.08:
            serres.append(f"{na} → {nb} : {b1 - a2:.2f}\"")
    res.append(_res(cat, "Blocs empilés sans chevauchement (écart ≥ 0,08\")", not serres,
                    "; ".join(serres) or " · ".join(f"{n}" for n, _ in blocs)))

    # zones de texte qui se chevauchent
    textes = _textes(pl)
    chev = [f"{a.nom} × {b.nom}" for a, b in combinations(textes, 2) if _inter(a, b) > 0.0005]
    res.append(_res(cat, "Aucune zone de texte n'en chevauche une autre", not chev, "; ".join(chev[:6])))

    # éléments de carte contenus dans la carte
    fuites = []
    for k, c in enumerate(cartes):
        for e in pl.elements:
            if e.groupe.startswith(f"Jalon {k + 1} ") and not e.nom.endswith(("liaison", "point")):
                if e.x < c[0] - TOL or e.x2 > c[0] + c[2] + TOL or e.y < c[1] - TOL or e.y2 > c[1] + c[3] + TOL:
                    fuites.append(e.nom)
    res.append(_res(cat, "Contenu des cartes à l'intérieur des cartes", not fuites, ", ".join(fuites)))
    return res


# =========================================================================== ajustement estimé


def _lignes_estimees(e) -> list[int]:
    g, _, d, _ = e.marges
    return [len(couper(p, e.w - g - d).lignes) for p in e.paras]


def controler_ajustement(pl) -> list[Resultat]:
    cat = "Ajustement (estimé)"
    defauts, marges_min = [], []
    for e in _textes(pl):
        g, h, d, b = e.marges
        largeur, hauteur = e.w - g - d, e.h - h - b
        total = 0.0
        for p in e.paras:
            c = couper(p, largeur)
            if c.mot_trop_long:
                defauts.append(f"{e.nom} : « {c.mot_trop_long} » plus large que le bloc")
            if e.une_ligne and len(c.lignes) > 1:
                defauts.append(f"{e.nom} : passe sur {len(c.lignes)} lignes")
            total += len(c.lignes) * hauteur_ligne_in(p.taille_max) + p.espace_avant / 72
        if total > hauteur + 0.01:
            defauts.append(f"{e.nom} : {total:.2f}\" pour {hauteur:.2f}\"")
        marges_min.append(hauteur - total)
    return [_res(cat, "Texte contenu dans chaque bloc (Calibri/Carlito, coupure aux espaces)", not defauts,
                 "; ".join(defauts) or f"{len(marges_min)} blocs · réserve verticale mini {min(marges_min):.3f}\"")]


def avant_rendu(pt, pl, geo) -> list[Resultat]:
    return controler_dates(pt, pl, geo) + controler_contenu(pt, pl) + controler_geometrie(pt, pl, geo) + \
        controler_ajustement(pl)


# =========================================================================== rendu PDF


def apres_rendu(pt, pl, geo, pdf) -> list[Resultat]:
    import pdfplumber

    cat = "Rendu PDF"
    res = []
    with pdfplumber.open(pdf) as doc:
        res.append(_res(cat, "Une seule page", len(doc.pages) == 1, f"{len(doc.pages)} page(s)"))
        page = doc.pages[0]
        a4 = abs(page.width - 841.89) < 1.5 and abs(page.height - 595.28) < 1.5
        res.append(_res(cat, "Format A4 paysage", a4, f"{page.width:.1f} × {page.height:.1f} pt"))

        textes = _textes(pl)
        par_element = defaultdict(list)
        orphelins, hors_marge = [], []
        W, H = geo["page"]
        for ch in page.chars:
            if not ch["text"].strip():
                continue
            cx, cy = (ch["x0"] + ch["x1"]) / 2 / 72, (ch["top"] + ch["bottom"]) / 2 / 72
            cont = [e for e in textes if e.x - 0.02 <= cx <= e.x2 + 0.02 and e.y - 0.02 <= cy <= e.y2 + 0.02]
            if not cont:
                orphelins.append(ch)
            else:
                par_element[min(cont, key=lambda e: e.w * e.h).nom].append(ch)
            if ch["x0"] < 0.3 * 72 or ch["x1"] > (W - 0.3) * 72 or ch["top"] < 0.3 * 72 or ch["bottom"] > (H - 0.3) * 72:
                hors_marge.append(ch["text"])
        echantillon = "".join(c["text"] for c in orphelins[:40])
        res.append(_res(cat, "Chaque caractère rendu est dans son bloc (aucun débordement)", not orphelins,
                        f"{len(orphelins)} caractère(s) hors bloc : « {echantillon} »" if orphelins else
                        f"{sum(len(v) for v in par_element.values())} caractères vérifiés"))
        res.append(_res(cat, "Aucun caractère dans la marge de 0,30\"", not hors_marge, "".join(hors_marge[:30])))

        trop, plages, traits = [], [], []
        for e in textes:
            chars = sorted(par_element.get(e.nom, []), key=lambda c: c["top"])
            lignes: list[list] = []
            for c in chars:
                if not lignes or c["top"] - lignes[-1][0]["top"] > 2.5:
                    lignes.append([c])
                else:
                    lignes[-1].append(c)
            for ligne in lignes[:-1]:
                fin = "".join(c["text"] for c in sorted(ligne, key=lambda c: c["x0"])).rstrip()
                if re.search(r"\d[–-]$", fin):
                    plages.append(f"{e.nom} : « …{fin[-12:]} »")
                elif re.search(r"[^\W\d]-$", fin):
                    traits.append(f"{e.nom} : « …{fin[-14:]} »")
            estime = sum(_lignes_estimees(e))
            if len(lignes) > estime:
                trop.append(f"{e.nom} : {len(lignes)} lignes rendues / {estime} prévues")
            if chars and (min(c["top"] for c in chars) < e.y * 72 - 2 or max(c["bottom"] for c in chars) > e.y2 * 72 + 2):
                trop.append(f"{e.nom} : texte au-delà du bord haut/bas")
        res.append(_res(cat, "Nombre de lignes rendu ≤ prévu (pas de retour à la ligne imprévu)", not trop,
                        "; ".join(trop)))
        res.append(_res(cat, "Aucune plage de dates ou nombre coupé en fin de ligne", not plages, "; ".join(plages)))
        res.append(_res(cat, "Aucun mot coupé au trait d'union en fin de ligne", not traits, "; ".join(traits),
                        alerte=True))

        texte_pdf = _norm(page.extract_text() or "")
        attendus = [_norm(pl.par_nom(f"J{k + 1} date").texte) for k in range(len(pt.jalons))]
        attendus += [_norm(c) for c in pt.classification_jira] + list(pt.destinataires)
        attendus += ["Avancement et réalisations", "Risques et points d’attention", "Priorités et prochaines étapes"]
        manquants = [a for a in attendus if a not in texte_pdf]
        res.append(_res(cat, "Textes clés présents dans le PDF", not manquants,
                        "; ".join(manquants) or f"{len(attendus)} libellés retrouvés"))
        res.append(_res(cat, "« Projet » absent du PDF", not _RE_PROJET.search(texte_pdf)))
        polices = sorted({c["fontname"].split("+")[-1] for c in page.chars})
        res.append(_res(cat, "Polices incorporées", True, ", ".join(polices)))
    return res


# =========================================================================== sortie


def afficher(resultats: list[Resultat]) -> int:
    print("\nContrôles qualité")
    cat = None
    for r in resultats:
        if r.categorie != cat:
            cat = r.categorie
            print(f"\n  {cat}")
        detail = f" — {r.detail}" if r.detail else ""
        print(f"    [{r.niveau:^6}] {r.nom}{detail}")
    n = {niv: sum(r.niveau == niv for r in resultats) for niv in (OK, ALERTE, ECHEC)}
    print(f"\n  Bilan : {n[OK]} OK · {n[ALERTE]} alerte(s) · {n[ECHEC]} échec(s)\n")
    return 1 if n[ECHEC] else 0
