# -*- coding: utf-8 -*-
"""Met à jour data/plans_n6.json avec les plans N6 publiés dans AO Mobility Plan Studio.

En ligne, le site lit directement les plans publiés (réécriture /api/plans-n6 dans vercel.json).
Ce fichier sert de secours si le jeu ne répond pas, et pour travailler en local.

Usage : python outils/maj_plans.py
"""
import json, os, sys, urllib.request
from datetime import datetime

URL = "https://transport-manager.net/api/api_ao_plans.php?action=presets"
NIVEAU = "N6_"
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

req = urllib.request.Request(URL, headers={"User-Agent": "TCM-site/1.0"})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        tous = json.load(r)["presets"]
except Exception as e:
    sys.exit("Plans injoignables : %s" % e)

plans = {k: v for k, v in tous.items() if k.startswith(NIVEAU)}
if not plans:
    sys.exit("Aucun plan %s publié : fichier laissé tel quel." % NIVEAU.rstrip("_"))
sortie = {"source": "AO Mobility Plan Studio, plans publiés au %s" % datetime.now().strftime("%d/%m/%Y %H:%M"), "presets": plans}
chemin = os.path.join(R, "data", "plans_n6.json")
json.dump(sortie, open(chemin, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(plans), "plans enregistrés dans data/plans_n6.json :", " ".join(sorted(k[len(NIVEAU) + 1:] for k in plans)))
