# -*- coding: utf-8 -*-
"""
Données du site TCM à partir des fichiers de l'assistant d'exploitation
=======================================================================

Le site est statique (Vercel, sans base de données) : tout ce qu'il affiche sur le réseau vient de fichiers
JSON du dossier `data/`, fabriqués par ce script à partir des sorties de l'assistant d'exploitation.

    python outils/generer_reseau.py                       # cherche « ../Assistant exploitation »
    python outils/generer_reseau.py "F:/Perso/Assistant exploitation"

Entrées (dans le dossier de l'assistant) :
* donnees/N6_recap.csv                 lignes du réseau (terminus, temps, arrêts, couleur, fréquentation)
* donnees/lignes_scolaires.csv         services ÉDU'VOLCAN
* donnees/assets_reseau/               familles de lignes et pictogrammes (200 px)
* donnees/parc_vehicules.csv           énergie et places des véhicules
* donnees/vacances_scolaires.json      calendrier de la zone A
* sortie_n6/affectations_n6*.csv       grilles d'affectation (scolaire, vacances) : véhicules par créneau
* sortie_n6/n6_comparaison.json        ce qui change pour chaque ligne
* sortie_n6/n6_electrification.json    lignes qui passent à l'électrique
* sortie_n6/n6_ouverture.json          planning d'ouverture (tram-train, tram B)

Sorties : data/reseau.json, data/calendrier.json, img/lignes/<ligne>.png
Les fichiers modifiés à la main (info trafic, parkings, agences, tarifs, actualités, configuration) ne sont
jamais touchés par ce script.
"""
import csv
import datetime as dt
import json
import math
import os
import shutil
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(ICI)
CRENEAUX = ["Semaine Creuse", "Semaine Pointe", "Semaine Soir", "Semaine Nocturne", "Samedi Creuse", "Samedi Pointe",
            "Samedi Soir", "Samedi Nocturne", "Dimanche Creuse", "Dimanche Pointe", "Dimanche Nocturne"]
JOURS = {"Semaine": "semaine", "Samedi": "samedi", "Dimanche": "dimanche"}
PERIODES = {"Creuse": "creuse", "Pointe": "pointe", "Soir": "soir", "Nocturne": "nuit"}
MISE_EN_SERVICE = "2026-12-05"

# libellés publics des familles (les clés viennent de groupes_reseau.json)
FAMILLES = {
    "volc_express": {"nom": "Volc'Express", "accroche": "Tramway, tram-train et bus à haut niveau de service", "icone": "fa-train-tram", "couleur": "#204BFE"},
    "urbain_dome": {"nom": "Erupt'Urbain · Puy-de-Dôme", "accroche": "Le réseau urbain principal", "icone": "fa-bus", "couleur": "#0F8B8D"},
    "urbain_pariou": {"nom": "Erupt'Urbain · Puy-de-Pariou", "accroche": "Le réseau urbain de proximité", "icone": "fa-bus-simple", "couleur": "#7A4FD0"},
    "peripherique": {"nom": "Puy'Périphérique", "accroche": "Les communes de la première couronne", "icone": "fa-route", "couleur": "#D9480F"},
    "monts": {"nom": "Monts'Connection", "accroche": "Les lignes interurbaines", "icone": "fa-mountain-sun", "couleur": "#7C4A1E"},
    "tre": {"nom": "TRE", "accroche": "Transport régional express", "icone": "fa-bolt", "couleur": "#3C78D8"},
    "nocturne": {"nom": "Noctambus", "accroche": "Le réseau de nuit, BEN1 à BEN4", "icone": "fa-moon", "couleur": "#203EC0"},
    "edu": {"nom": "Édu'Volcan", "accroche": "Les services scolaires", "icone": "fa-graduation-cap", "couleur": "#B7791F"},
    "demande": {"nom": "Volca'Demande", "accroche": "Le transport à la demande", "icone": "fa-phone-volume", "couleur": "#C026D3"},
}


def _csv(p):
    with open(p, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def _json(p, defaut=None):
    try:
        with open(p, encoding="utf-8-sig") as f:
            return json.load(f)
    except (OSError, ValueError):
        return defaut


def _num(x):
    try:
        return float(str(x).replace(",", ".").replace(" ", ""))
    except ValueError:
        return None


def nom_public(n):
    """PL1 -> BEN1 (nom affiché sur le réseau)"""
    return "BEN" + n[2:] if n.startswith("PL") else n


def mode_ligne(r):
    m = (r.get("Matériel") or "").lower()
    if r.get("Réseau") == "Nocturne":
        return "nuit"
    if m == "tram":
        return "tram"
    if m == "tram-train":
        return "tramtrain"
    if (r.get("LHNS") or "").lower() == "oui":
        return "bhns"
    if m == "car":
        return "car"
    return "bus"


def libelle(n, mode):
    p = nom_public(n)
    return {"tram": "Tram " + p, "tramtrain": "Tram-train " + p, "nuit": p}.get(mode, "Ligne " + p)


def grille(p):
    out = {}
    for r in _csv(p):
        num = (r.get("Numéro de Parc") or "").strip()
        if num:
            out[num] = {"modele": (r.get("Modèle") or "").replace("(à livrer)", "").strip(), "marque": (r.get("Marque") or "").strip(),
                        "cr": {c: (r.get(c) or "").strip() for c in CRENEAUX}}
    return out


def main(assistant):
    don = os.path.join(assistant, "donnees")
    sor = os.path.join(assistant, "sortie_n6")
    recap = _csv(os.path.join(don, "N6_recap.csv"))
    groupes = _json(os.path.join(don, "assets_reseau", "groupes_reseau.json"), {})
    parc = {r["Numéro Parc"].strip(): r for r in _csv(os.path.join(don, "parc_vehicules.csv"))}
    grilles = {"scolaire": grille(os.path.join(sor, "affectations_n6.csv")),
               "vacances": grille(os.path.join(sor, "affectations_n6_vacances.csv"))}
    comp = _json(os.path.join(sor, "n6_comparaison.json"), {})
    comp_l = {c["numero"]: c for c in comp.get("lignes", [])}
    elec = _json(os.path.join(sor, "n6_electrification.json"), {})
    ouv = _json(os.path.join(sor, "n6_ouverture.json"), {})
    vac = _json(os.path.join(don, "vacances_scolaires.json"), {})

    # énergie des modèles neufs (pas encore au parc)
    energie_neuf = {"Citadis 402": "Electrique", "Citadis Dualis": "Electrique", "eCitaro G BHNS": "Electrique"}

    def energie(num, g):
        r = parc.get(num)
        if r:
            return r.get("Energie") or ""
        return energie_neuf.get(g["modele"], "Electrique" if g["modele"].lower().startswith("e") else "")

    # électrification : tranche T1 (articulés, BHNS, midibus) en décembre 2026, T2 (standards) en avril 2027
    t_date = {"ART": "décembre 2026", "ART_BHNS": "décembre 2026", "MIDI": "décembre 2026", "STD": "avril 2027"}
    el_ligne = {}
    for x in elec.get("lignes", []):
        if x.get("statut") == "oui" or x["ligne"] in elec.get("basculables", []):
            el_ligne[x["ligne"]] = t_date.get(x.get("gabarit"), "")

    famille_de = {}
    for g in groupes.get("groupes", []):
        for l in g["lignes"]:
            famille_de[l] = g["cle"]

    # pictogrammes
    logos_src = os.path.join(don, "assets_reseau", "logos")
    logos_dst = os.path.join(SITE, "img", "lignes")
    os.makedirs(logos_dst, exist_ok=True)
    fichier = groupes.get("logo_fichier", {})

    def logo(n):
        f = fichier.get(n, n)
        src = os.path.join(logos_src, f + ".png")
        if not os.path.exists(src):
            src = os.path.join(logos_src, nom_public(n) + ".png")
        if not os.path.exists(src):
            # pictogramme fait à la main dans le site (ex. 604) : on le garde
            return "/img/lignes/%s.png" % nom_public(n) if os.path.exists(os.path.join(logos_dst, nom_public(n) + ".png")) else None
        dst_nom = nom_public(n) + ".png"
        shutil.copyfile(src, os.path.join(logos_dst, dst_nom))
        return "/img/lignes/" + dst_nom

    ouverture_ligne = {}
    if ouv:
        if ouv.get("et", {}).get("ouverture"):
            ouverture_ligne[ouv["et"]["ligne"]] = ouv["et"]["ouverture"]
        if ouv.get("ouverture_b"):
            ouverture_ligne[ouv["regle"]["ordre_tram"][1]] = ouv["ouverture_b"]

    lignes = {}
    for r in recap:
        n = r["Numéro"].strip()
        mode = mode_ligne(r)
        temps = _num(r.get("Temps (min)")) or 0
        # fréquences : intervalle = durée d'un aller-retour / véhicules en ligne sur le créneau
        freq = {}
        vehicules = {}
        for per, g in grilles.items():
            f = {j: {} for j in JOURS.values()}
            for c in CRENEAUX:
                nb = sum(1 for v in g.values() if v["cr"][c] == n)
                jour, moment = c.split()
                if nb:
                    f[JOURS[jour]][PERIODES[moment]] = max(2, round(2 * temps / nb))
            freq[per] = f
            if per == "scolaire":
                for num, v in g.items():
                    if n in v["cr"].values():
                        cle = (v["marque"] + " " + v["modele"]).strip()
                        e = vehicules.setdefault(cle, {"modele": cle, "nombre": 0, "energie": energie(num, v)})
                        e["nombre"] += 1
        # tronçons des lignes nouvelles : « nouveau A-B:part » (part en % du temps de parcours), enchaînés depuis le départ
        troncons = []
        tr = (r.get("Tronçons (id:part)") or "").strip()
        if tr.startswith("nouveau"):
            prec = r["Départ"].strip()
            for part in [p.strip() for p in tr.split("nouveau ") if p.strip()]:
                if ":" not in part:
                    continue
                seg, pc = part.rsplit(":", 1)
                if seg.startswith(prec + "-"):
                    a, b = prec, seg[len(prec) + 1:]
                else:
                    a, b = _coupe(seg)
                troncons.append({"de": a.strip(), "a": b.strip(), "minutes": round((_num(pc) or 0) / 100 * temps)})
                prec = b.strip()
        c = comp_l.get(n, {})
        statut = {"etat": "service", "date": MISE_EN_SERVICE}
        if n in ouverture_ligne:
            statut = {"etat": "ouverture", "date": ouverture_ligne[n]}
        fam = famille_de.get(n, "urbain_dome")
        lignes[nom_public(n)] = {
            "id": nom_public(n), "code": n, "nom": libelle(n, mode), "mode": mode, "famille": fam,
            "depart": r["Départ"].strip(), "terminus": r["Terminus"].strip(),
            "couleur": r.get("Couleur") if (r.get("Couleur") or "").startswith("#") and r.get("Couleur").lower() not in ("#ffffff", "#fffff") else FAMILLES[fam]["couleur"],
            "km": _num(r.get("Distance (km)")), "temps": temps, "arrets": int(_num(r.get("Arrêts")) or 0),
            "aeroport": (r.get("Ligne aéroport") or "").lower() == "oui", "gratuite": (r.get("Gratuite") or "").lower() == "oui",
            "hns": mode in ("tram", "tramtrain", "bhns"),
            "frequences": freq, "vehicules": sorted(vehicules.values(), key=lambda v: -v["nombre"]),
            "electrique": el_ligne.get(n) or (all((v["energie"] or "").lower().startswith("elec") for v in vehicules.values()) and bool(vehicules) and "dès l'ouverture"),
            "troncons": troncons, "statut": statut, "logo": logo(n),
            "nouvelle": c.get("statut") == "nouvelle" or n in comp.get("resume", {}).get("nouvelles", []),
            "origines": [o for o in (c.get("origine_n5") or []) if o != n],
            "changements": [x for x in (c.get("parcours_modifie") or []) if not x.startswith(("terminus", "ligne nouvelle"))],
            "ancien_terminus": c.get("terminus_n5") if c.get("terminus_n5") and set(c.get("terminus_n5")) != {r["Départ"].strip(), r["Terminus"].strip()} and c.get("statut") != "nouvelle" and not [o for o in (c.get("origine_n5") or []) if o != n] else None,
            "frequentation_pointe": int(_num(r.get("Scolaire Sem. pointes")) or 0),
        }

    # services scolaires et transport à la demande (hors récap : reconduits)
    for r in _csv(os.path.join(don, "lignes_scolaires.csv")):
        n = r["Numéro"].strip()
        if not n:
            continue
        pointes = [int(_num(r.get(k)) or 0) for k in ("Pointe 1", "Pointe 2", "Pointe 3") if _num(r.get(k))]
        lignes[n] = {"id": n, "code": n, "nom": "Ligne " + n, "mode": "scolaire", "famille": "edu",
                     "depart": r["Départ"].strip(), "terminus": r["Terminus"].strip(), "couleur": FAMILLES["edu"]["couleur"],
                     "km": _num(r.get("Distance (km)")), "temps": _num(r.get("Temps (min)")) or 0, "arrets": None,
                     "services_par_jour": len(pointes), "frequences": None, "vehicules": [], "electrique": None, "troncons": [],
                     "statut": {"etat": "service", "date": MISE_EN_SERVICE}, "logo": logo(n), "nouvelle": n == "604",
                     "origines": [], "changements": [], "ancien_terminus": None, "aeroport": False, "gratuite": False, "hns": False}

    # anciennes données du site pour les lignes reconduites hors récap (TAD, scolaires 651-653)
    ancien = _json(os.path.join(SITE, "src", "ligne.json"), {}) or {}
    for l in ancien.get("lignes", []):
        n = str(l.get("id"))
        typ = (l.get("type") or "").lower()
        if n in lignes or not ("demande" in typ or "volcan" in typ):
            continue
        nom = l.get("nom") or ""
        a, _, b = nom.partition("<>")
        fam = "demande" if "demande" in typ else "edu"
        lignes[n] = {"id": n, "code": n, "nom": ("TAD " if fam == "demande" else "Ligne ") + n, "mode": "tad" if fam == "demande" else "scolaire",
                     "famille": fam, "depart": a.strip(), "terminus": b.strip() or a.strip(), "couleur": FAMILLES[fam]["couleur"],
                     "km": None, "temps": None, "arrets": None, "frequences": None, "vehicules": [], "electrique": None, "troncons": [],
                     "statut": {"etat": "service", "date": MISE_EN_SERVICE}, "logo": logo(n), "nouvelle": False, "origines": [],
                     "changements": [], "ancien_terminus": None, "aeroport": False, "gratuite": False, "hns": False,
                     "description": (l.get("description") or "")[:600]}

    # correspondances : lignes qui partagent un terminus ou un arrêt principal
    arrets = {}
    for l in lignes.values():
        noms = {l["depart"], l["terminus"]} | {t["de"] for t in l["troncons"]} | {t["a"] for t in l["troncons"]}
        for a in noms:
            if a:
                arrets.setdefault(a, set()).add(l["id"])
    for l in lignes.values():
        noms = {l["depart"], l["terminus"]} | {t["de"] for t in l["troncons"]} | {t["a"] for t in l["troncons"]}
        corr = {}
        for a in noms:
            autres = sorted(arrets.get(a, set()) - {l["id"]}, key=cle_ligne)
            if autres:
                corr[a] = autres
        l["correspondances"] = corr

    familles = []
    ordre = ["volc_express", "urbain_dome", "urbain_pariou", "peripherique", "monts", "tre", "nocturne", "edu", "demande"]
    for k in ordre:
        ls = sorted((l["id"] for l in lignes.values() if l["famille"] == k), key=cle_ligne)
        if ls:
            familles.append(dict(FAMILLES[k], cle=k, lignes=ls))

    disparues = []
    for f in comp.get("resume", {}).get("fusions", []):
        for o in f["origines"]:
            if o != f["ligne"]:
                disparues.append({"ligne": o, "remplacee_par": nom_public(f["ligne"])})
    etapes = []
    if ouv:
        etapes.append({"date": MISE_EN_SERVICE, "titre": "Le nouveau réseau entre en service",
                       "texte": "Nouvelles lignes de bus, lignes 3 et 9 redessinées, BHNS renforcés, tram A sur son nouveau parcours et réseau de nuit à quatre lignes."})
        if ouv.get("et", {}).get("ouverture"):
            etapes.append({"date": ouv["et"]["ouverture"], "titre": "Ouverture du tram-train ET",
                           "texte": "La gare de Clermont-Ferrand reliée à l'aéroport en 28 minutes, avec un tarif dédié."})
        if ouv.get("ouverture_b"):
            etapes.append({"date": ouv["ouverture_b"], "titre": "Ouverture du tram B",
                           "texte": "Du campus des Cézeaux au campus Centre, la ligne B reprend les anciennes lignes 2 et 3 dès que toutes ses rames sont livrées."})

    out = {"genere": dt.date.today().isoformat(), "mise_en_service": MISE_EN_SERVICE, "familles": familles,
           "lignes": {k: lignes[k] for k in sorted(lignes, key=cle_ligne)},
           "nouvelles": [nom_public(n) for n in comp.get("resume", {}).get("nouvelles", [])] + (["604"] if "604" in lignes else []),
           "disparues": disparues, "etapes": etapes,
           "chiffres": {"lignes": len(lignes), "tram": sum(1 for l in lignes.values() if l["mode"] in ("tram", "tramtrain")),
                        "electriques": sum(1 for l in lignes.values() if l.get("electrique"))}}
    os.makedirs(os.path.join(SITE, "data"), exist_ok=True)
    with open(os.path.join(SITE, "data", "reseau.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    cal = {"zone": "A", "periodes": [{"nom": p["nom"], "debut": p["debut"], "fin": p["fin"]} for p in vac.get("periodes", [])],
           "feries": feries(2026, 2029)}
    with open(os.path.join(SITE, "data", "calendrier.json"), "w", encoding="utf-8") as f:
        json.dump(cal, f, ensure_ascii=False, indent=1)
    print("%d lignes, %d familles, %d logos" % (len(lignes), len(familles), len(os.listdir(logos_dst))))


def _coupe(seg):
    """« A-B » quand les noms contiennent des tirets : coupe au tiret entouré de mots en majuscule"""
    i = seg.find("-", len(seg) // 3)
    return seg[:i], seg[i + 1:]


def cle_ligne(x):
    x = str(x)
    if x.isdigit():
        return (1, int(x), "")
    if x.startswith("BEN"):
        return (3, int(x[3:] or 0), "")
    if len(x) <= 2 and x.isalpha():
        return (0, 0, x)
    return (2, 0, x)


def paques(a):
    g = a % 19; c = a // 100; h = (c - c // 4 - (8 * c + 13) // 25 + 19 * g + 15) % 30
    i = h - (h // 28) * (1 - (h // 28) * (29 // (h + 1)) * ((21 - g) // 11))
    j = (a + a // 4 + i + 2 - c + c // 4) % 7
    l = i - j; m = 3 + (l + 40) // 44; d = l + 28 - 31 * (m // 4)
    return dt.date(a, m, d)


def feries(a0, a1):
    out = []
    for a in range(a0, a1 + 1):
        p = paques(a)
        for d, nom in ((dt.date(a, 1, 1), "Jour de l'an"), (p + dt.timedelta(days=1), "Lundi de Pâques"), (dt.date(a, 5, 1), "Fête du Travail"),
                       (dt.date(a, 5, 8), "Victoire 1945"), (p + dt.timedelta(days=39), "Ascension"), (p + dt.timedelta(days=50), "Lundi de Pentecôte"),
                       (dt.date(a, 7, 14), "Fête nationale"), (dt.date(a, 8, 15), "Assomption"), (dt.date(a, 11, 1), "Toussaint"),
                       (dt.date(a, 11, 11), "Armistice 1918"), (dt.date(a, 12, 25), "Noël")):
            out.append({"date": d.isoformat(), "nom": nom})
    return out


if __name__ == "__main__":
    dossier = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(SITE), "Assistant exploitation")
    if not os.path.isdir(dossier):
        sys.exit("Dossier de l'assistant introuvable : %s" % dossier)
    main(dossier)
