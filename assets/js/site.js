/* TCM — socle commun du site : en-tête, pied de page, thème, données partagées.
 Aucune dépendance : chaque page charge ce fichier puis son propre script. */
(function () {
  "use strict";

  const TCM = (window.TCM = window.TCM || {});
  const cache = {};

  /* ---------- outils ---------- */
  TCM.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  TCM.json = (url) =>
    (cache[url] =
      cache[url] ||
      fetch(url, { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error(url + " : " + r.status);
        return r.json();
      }));
  TCM.config = () => TCM.json("/data/config.json").catch(() => ({}));
  /* feuille Google « TCM — Données du site » : un onglet lu en CSV (lisible par lien), null si indisponible */
  TCM.feuille = (onglet) =>
    (cache["feuille:" + onglet] =
      cache["feuille:" + onglet] ||
      TCM.config().then(async (c) => {
        if (!c.google_sheet_id) return null;
        try {
          const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(c.google_sheet_id)}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(onglet)}`;
          const r = await fetch(url, { credentials: "omit" });
          if (!r.ok) return null;
          return TCM.lireCsv(await r.text());
        } catch (e) {
          return null;
        }
      }));
  /* date saisie dans la feuille : 2026-12-05, 2026-12-05 05:00 ou 05/12/2026 */
  TCM.dateSaisie = (s) => {
    s = String(s || "").trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
    if (m) s = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` + (m[4] ? "T" + m[4].padStart(5, "0") : "");
    return s.replace(" ", "T");
  };
  const oui = (v) => v === true || /^(oui|o|x|1|vrai|true)$/i.test(String(v || "").trim());
  TCM.reseau = () =>
    (cache.__reseau =
      cache.__reseau ||
      Promise.all([TCM.json("/data/reseau.json"), TCM.feuille("lignes")]).then(([R, rangs]) => {
        for (const r of rangs || []) {
          const l = R.lignes[(r.ligne || "").trim()];
          if (!l) continue;
          const st = TCM.sansAccent(r.statut || "");
          const date = TCM.dateSaisie(r.ouverture) || (l.statut && l.statut.date);
          if (st.startsWith("ferm")) l.statut = { etat: "fermee", date };
          else if (st.startsWith("a venir") || st.startsWith("ouverture")) l.statut = { etat: "ouverture", date };
          else if (st) l.statut = { etat: "service", date };
          else if (date) l.statut = { ...(l.statut || { etat: "ouverture" }), date };
          if (r.message) l.annonce = r.message;
        }
        return R;
      }));
  /* parkings relais : onglet parkings de la feuille, sinon data/parkings.json */
  TCM.parkings = () =>
    (cache.__pr =
      cache.__pr ||
      TCM.feuille("parkings").then(async (rangs) => {
        const liste = rangs && rangs.length ? rangs : (await TCM.json("/data/parkings.json").catch(() => ({ parkings: [] }))).parkings;
        const now = new Date();
        return liste
          .filter((p) => p.nom)
          .map((p) => {
            const ouverture = TCM.dateSaisie(p.ouverture);
            let statut = TCM.sansAccent(p.statut || "ouvert");
            if (ouverture && TCM.date(ouverture) > now && !statut.startsWith("ferm")) statut = "a venir";
            else if (statut.startsWith("a venir") && (!ouverture || TCM.date(ouverture) <= now)) statut = "ouvert";
            return {
              ...p,
              places: +p.places || 0,
              ouverture,
              statut: statut.startsWith("ferm") ? "ferme" : statut.startsWith("a venir") ? "a venir" : "ouvert",
              recharge: oui(p.recharge),
              surveille: oui(p.surveille),
            };
          });
      }));
  TCM.calendrier = () => TCM.json("/data/calendrier.json").catch(() => ({ periodes: [], feries: [] }));
  TCM.lienLigne = (id) => "/ligne.html?l=" + encodeURIComponent(id);
  TCM.param = (k) => new URLSearchParams(location.search).get(k);
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  TCM.MOIS = MOIS;
  TCM.JOURS = JOURS;
  TCM.date = (iso) => (iso instanceof Date ? iso : new Date(String(iso).length <= 10 ? iso + "T00:00:00" : iso));
  TCM.dateFr = (iso, opts = {}) => {
    const d = TCM.date(iso);
    if (isNaN(d)) return "";
    let s = (d.getDate() === 1 ? "1er" : d.getDate()) + " " + MOIS[d.getMonth()] + (opts.annee === false ? "" : " " + d.getFullYear());
    if (opts.jour) s = JOURS[d.getDay()] + " " + s;
    if (opts.heure && String(iso).length > 10) s += " à " + d.getHours() + "h" + String(d.getMinutes()).padStart(2, "0");
    return s;
  };
  TCM.iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  TCM.euros = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  TCM.cleLigne = (x) => {
    x = String(x);
    if (/^\d+$/.test(x)) return [1, +x, ""];
    if (/^BEN\d/.test(x)) return [3, +x.slice(3), ""];
    if (/^[A-Z]{1,2}$/.test(x)) return [0, 0, x];
    return [2, 0, x];
  };
  TCM.triLignes = (a, b) => {
    const x = TCM.cleLigne(a),
      y = TCM.cleLigne(b);
    return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]);
  };

  /* pictogramme de ligne (image du réseau, ou pastille colorée à défaut) */
  TCM.picto = (l, taille = 40, lien = false) => {
    if (!l) return "";
    const t = typeof taille === "number" ? taille + "px" : taille;
    const img = l.logo
      ? `<img src="${l.logo}" alt="${TCM.esc(l.nom)}" title="${TCM.esc(l.nom)}" class="logo-ligne" style="width:${t};height:${t}" loading="lazy" decoding="async">`
      : `<span class="logo-ligne grid place-items-center font-black text-white" style="width:${t};height:${t};background:${l.couleur};font-size:calc(${t} * .38)">${TCM.esc(l.id)}</span>`;
    return lien ? `<a href="${TCM.lienLigne(l.id)}" class="inline-block transition hover:-translate-y-0.5" aria-label="${TCM.esc(l.nom)}">${img}</a>` : img;
  };

  TCM.MODES = {
    tram: { nom: "Tramway", icone: "fa-train-tram" },
    tramtrain: { nom: "Tram-train", icone: "fa-train" },
    bhns: { nom: "Bus à haut niveau de service", icone: "fa-bus" },
    bus: { nom: "Bus", icone: "fa-bus-simple" },
    car: { nom: "Car", icone: "fa-van-shuttle" },
    nuit: { nom: "Bus de nuit", icone: "fa-moon" },
    scolaire: { nom: "Service scolaire", icone: "fa-graduation-cap" },
    tad: { nom: "Transport à la demande", icone: "fa-phone-volume" },
  };

  /* ---------- arrêts du calculateur d'itinéraire ---------- */
  /* Plans de ligne N6 publiés dans AO Mobility Plan Studio : en ligne via /api/plans-n6 (réécriture Vercel vers le jeu),
     sinon l'instantané data/plans_n6.json */
  let plansP = null;
  TCM.plans = () =>
    (plansP =
      plansP ||
      fetch("/api/plans-n6")
        .then((r) => (r.ok && (r.headers.get("content-type") || "").includes("json") ? r.json() : Promise.reject()))
        .then((d) => (d && d.presets && Object.keys(d.presets).some((k) => k.startsWith("N6_")) ? d : Promise.reject()))
        .catch(() => TCM.json("/data/plans_n6.json"))
        .then((d) => {
          const p = {};
          for (const [k, v] of Object.entries(d.presets || {})) if (k.startsWith("N6_L")) p[k.slice(4)] = v;
          return p;
        }));
  const cleNom = (n) =>
    sansAccent(String(n).replace(/’/g, "'").replace(/\n/g, " "))
      .replace(/[\s\-–—]+/g, " ")
      .trim();
  const slug = (n) =>
    cleNom(n)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  TCM.cleNom = cleNom;

  /* lecture d'un plan : suites d'arrêts, fourches, boucles */
  const lireSection = (sec) => {
    const out = [];
    let genre = null;
    for (const el of sec.elements || []) {
      if (el.$branch) for (const e of el.$branch.elements || []) if (e.$stop) out.push({ type: "arret", id: e.id, s: e.$stop });
      if (el.$fork) genre = "fourche";
      if (el.$loop) genre = "boucle";
      if (el.$parallelBranches) out.push({ type: genre || "fourche", branches: el.$parallelBranches.sections.map((x) => lireSection(x.$lineSection || {})) });
    }
    return out;
  };
  TCM.lirePlan = (p) => (p.topology || []).flatMap((t) => lireSection(t.$lineSection || {}));
  const parcoursPlan = (morceaux) => {
    const b = morceaux.find((m) => m.type === "boucle");
    if (b) {
      const tour = [...b.branches[0], ...[...(b.branches[1] || [])].reverse()].filter((x) => x.type === "arret");
      return { chemins: [[...tour, tour[0]]], boucle: true };
    }
    let ch = [[]];
    for (const m of morceaux)
      ch = m.type === "arret" ? ch.map((c) => [...c, m]) : ch.flatMap((c) => m.branches.map((br) => [...c, ...br.filter((x) => x.type === "arret")]));
    return { chemins: ch, boucle: false };
  };
  TCM.parcoursPlan = (p) => parcoursPlan(TCM.lirePlan(p));
  TCM.correspondancesPlan = (s) =>
    (s.connections || []).flatMap((c) =>
      c.$modeConnection
        ? c.$modeConnection.elements
            .map((e) => e.$modeConnectionElement?.lineIndex?.$builtinLineIndex?.index)
            .filter((x) => x && x.startsWith("N6_L"))
            .map((x) => x.slice(4))
        : []
    );
  TCM.servicesPlan = (s) =>
    (s.connections || [])
      .flatMap((c) => (c.$serviceConnection ? c.$serviceConnection.elements.map((e) => e.$serviceConnectionElement?.service) : []))
      .filter(Boolean);

  /* graphe du calculateur d'itinéraire, construit dans le navigateur à partir des plans */
  let itiP = null;
  TCM.itineraires = () =>
    (itiP =
      itiP ||
      Promise.all([TCM.plans(), TCM.json("/data/noms_arrets.json"), TCM.reseau()]).then(([P, conf, R]) => {
        const EXCLUS = new Set(["scolaire", "tad"]);
        const noms = {},
          alias = {},
          partage = {};
        for (const [k, v] of Object.entries(conf.noms || {})) noms[cleNom(k)] = v;
        for (const [k, v] of Object.entries(conf.alias || {})) alias[cleNom(k)] = cleNom(v);
        for (const p of conf.arrets_partages || []) for (const a of p.arrets) partage[a] = p;
        const arrets = {};
        const noeud = (cle, nom, jeu) => {
          const a = (arrets[cle] = arrets[cle] || { nom, jeu: new Set(), lignes: new Set(), partage: cle.startsWith("partage:") });
          if (jeu) a.jeu.add(jeu.replace(/\n/g, " "));
          return cle;
        };
        const depuisJeu = (nomJeu) => {
          const k = alias[cleNom(nomJeu)] || cleNom(nomJeu);
          return noeud(k, noms[k] || nomJeu.replace(/\n/g, " - ").replace(/ – /g, " - "), nomJeu);
        };
        const cleArret = (x) => {
          if (partage[x.id]) return noeud("partage:" + partage[x.id].id, partage[x.id].nom);
          const n = (x.s.name || "").trim();
          return n ? depuisJeu(n) : null;
        };
        TCM.cleArretPlan = cleArret;
        const lignes = {};
        for (const [lid, p] of Object.entries(P)) {
          const l = R.lignes[lid];
          if (!l || EXCLUS.has(l.mode)) continue;
          const { chemins, boucle } = parcoursPlan(TCM.lirePlan(p));
          const cs = chemins.map((c) => {
            const n = c.length - (boucle ? 1 : 0);
            const pas = (l.temps || 0) / Math.max(1, boucle ? n : n - 1);
            const seq = [];
            c.forEach((x, i) => {
              const k = cleArret(x);
              if (!k) return;
              arrets[k].lignes.add(lid);
              seq.push([k, Math.round(i * pas * 10) / 10, i]);
            });
            return seq;
          });
          lignes[lid] = { chemins: cs, boucle, source: "plan" };
        }
        for (const [lid, jour] of Object.entries(conf.memes_traces || {})) {
          const l = R.lignes[lid],
            j = lignes[jour];
          if (!l || !j) continue;
          const r = (l.temps || 0) / Math.max(1, R.lignes[jour].temps || 1);
          lignes[lid] = { chemins: j.chemins.map((c) => c.map(([k, t, i]) => [k, Math.round(t * r * 10) / 10, i])), boucle: j.boucle, source: "plan " + jour };
          lignes[lid].chemins.forEach((c) => c.forEach(([k]) => arrets[k].lignes.add(lid)));
        }
        /* lignes sans plan publié : tracé relevé sur les plans papier (noms du jeu) */
        for (const [lid, t] of Object.entries(conf.traces_manuels || {})) {
          const l = R.lignes[lid];
          if (lid.startsWith("_") || !l || lignes[lid] || !t.arrets || t.arrets.length < 2) continue;
          const n = t.arrets.length - (t.boucle ? 0 : 1);
          const pas = (l.temps || 0) / Math.max(1, n);
          const seq = t.arrets.map((nom, i) => {
            const k = depuisJeu(nom);
            arrets[k].lignes.add(lid);
            return [k, Math.round(i * pas * 10) / 10];
          });
          if (t.boucle) seq.push([seq[0][0], Math.round(n * pas * 10) / 10]);
          lignes[lid] = { chemins: [seq], boucle: !!t.boucle, source: "trace" };
        }
        const parNom = {};
        for (const [k, a] of Object.entries(arrets)) parNom[cleNom(a.nom)] = k;
        for (const [lid, l] of Object.entries(R.lignes)) {
          if (lignes[lid] || EXCLUS.has(l.mode) || !l.temps || l.depart === l.terminus) continue;
          const pts = [[l.depart, 0]];
          for (const t of l.troncons || []) if (t.de === pts[pts.length - 1][0]) pts.push([t.a, pts[pts.length - 1][1] + (t.minutes || 0)]);
          if (pts[pts.length - 1][0] !== l.terminus) pts.push([l.terminus, l.temps]);
          const seq = pts.map(([nom, t]) => {
            const k = parNom[cleNom(nom)] || noeud("site:" + cleNom(nom), nom);
            parNom[cleNom(nom)] = k;
            arrets[k].lignes.add(lid);
            return [k, t];
          });
          lignes[lid] = { chemins: [seq], boucle: false, source: "terminus" };
        }
        /* identifiants lisibles et stables pour les liens partagés */
        const ids = {},
          pris = new Set();
        for (const k of Object.keys(arrets)) {
          let s = slug(arrets[k].nom) || "arret";
          while (pris.has(s)) s += "-2";
          pris.add(s);
          ids[k] = s;
        }
        return {
          arrets: Object.entries(arrets)
            .map(([k, a]) => ({
              id: ids[k],
              cle: k,
              nom: a.nom,
              jeu: [...a.jeu].filter((j) => j !== a.nom),
              lignes: [...a.lignes].sort(TCM.triLignes),
              partage: a.partage,
            }))
            .sort((x, y) => x.nom.localeCompare(y.nom, "fr")),
          lignes: Object.fromEntries(
            Object.entries(lignes).map(([lid, v]) => [lid, { ...v, chemins: v.chemins.map((c) => c.map(([k, ...r]) => [ids[k], ...r])) }])
          ),
          idDe: (k) => ids[k],
        };
      }));
  TCM.chercherArret = (I, q) => {
    q = sansAccent(q).trim();
    if (!q) return [];
    const res = [];
    for (const a of I.arrets) {
      if (a.partage) continue;
      const noms = [a.nom, ...(a.jeu || [])].map(sansAccent);
      let score = 0;
      if (noms.some((n) => n === q)) score = 100;
      else if (noms.some((n) => n.startsWith(q))) score = 80;
      else if (noms.some((n) => n.split(/[\s\-'’(]+/).some((m) => m.startsWith(q)))) score = 60;
      else if (noms.some((n) => n.includes(q))) score = 40;
      if (score) res.push({ arret: a, score: score + Math.min(9, a.lignes.length) });
    }
    return res.sort((x, y) => y.score - x.score || x.arret.nom.localeCompare(y.arret.nom, "fr"));
  };
  /* champ de saisie d'arrêt avec suggestions ; choix(a) reçoit l'arrêt retenu */
  TCM.brancherArret = (champ, boite, choix) => {
    let I = null,
      R = null,
      sel = -1,
      res = [];
    const rendre = () => {
      res = I ? TCM.chercherArret(I, champ.value).slice(0, 7) : [];
      sel = -1;
      champ.dataset.arret = "";
      if (!champ.value.trim()) {
        boite.hidden = true;
        return;
      }
      boite.hidden = false;
      boite.innerHTML = res.length
        ? res
            .map(
              (
                r,
                i
              ) => `<button type="button" data-i="${i}" class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-carte-2 aria-selected:bg-carte-2">
 <i class="fa-solid fa-location-dot w-4 text-center text-doux"></i>
 <span class="min-w-0 flex-1"><span class="block truncate text-sm font-bold text-encre">${TCM.esc(r.arret.nom)}</span>
 <span class="mt-1 flex flex-wrap gap-1">${r.arret.lignes
   .filter((id) => R && R.lignes[id])
   .slice(0, 8)
   .map((id) => TCM.picto(R.lignes[id], 20))
   .join("")}</span></span></button>`
            )
            .join("")
        : `<p class="px-4 py-3 text-sm text-doux">Aucun arrêt ne correspond à « ${TCM.esc(champ.value)} ».</p>`;
    };
    const retenir = (i) => {
      const r = res[i];
      if (!r) return;
      champ.value = r.arret.nom;
      champ.dataset.arret = r.arret.id;
      boite.hidden = true;
      if (choix) choix(r.arret);
    };
    Promise.all([TCM.itineraires(), TCM.reseau()]).then(([i, r]) => {
      I = i;
      R = r;
      if (champ.value && !champ.dataset.arret) rendre();
    });
    champ.addEventListener("input", rendre);
    boite.addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]");
      if (b) retenir(+b.dataset.i);
    });
    champ.addEventListener("keydown", (e) => {
      const items = [...boite.querySelectorAll("[data-i]")];
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        sel = Math.max(0, Math.min(items.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1)));
        items.forEach((a, i) => a.setAttribute("aria-selected", i === sel));
      } else if (e.key === "Enter" && !boite.hidden && items.length) {
        e.preventDefault();
        retenir(sel >= 0 ? sel : 0);
      } else if (e.key === "Escape") boite.hidden = true;
    });
    champ.addEventListener("blur", () =>
      setTimeout(() => {
        boite.hidden = true;
        if (!champ.dataset.arret && res.length && champ.value.trim()) retenir(0);
      }, 150)
    );
  };

  /* ---------- recherche de ligne (numéro, terminus, arrêt principal) ---------- */
  const sansAccent = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  TCM.sansAccent = sansAccent;
  TCM.chercher = (R, q) => {
    q = sansAccent(q).trim();
    if (!q) return [];
    const res = [];
    for (const l of Object.values(R.lignes)) {
      const id = sansAccent(l.id),
        nom = sansAccent(l.nom);
      const arrets = [l.depart, l.terminus, ...(l.troncons || []).flatMap((t) => [t.de, t.a])].filter(Boolean);
      let score = 0,
        arret = null;
      if (id === q || nom === q || nom === "ligne " + q || nom === "tram " + q) score = 100;
      else if (id.startsWith(q)) score = 80;
      else if (nom.includes(q)) score = 60;
      else {
        arret = arrets.find((a) => sansAccent(a).includes(q));
        if (arret) score = 40;
      }
      if (score) res.push({ ligne: l, score, arret });
    }
    return res.sort((a, b) => b.score - a.score || TCM.triLignes(a.ligne.id, b.ligne.id));
  };
  TCM.brancherRecherche = (champ, boite, options = {}) => {
    let R = null,
      sel = -1;
    const rendre = () => {
      const res = R ? TCM.chercher(R, champ.value).slice(0, options.max || 8) : [];
      sel = -1;
      if (!champ.value.trim()) {
        boite.hidden = true;
        boite.innerHTML = "";
        return;
      }
      boite.hidden = false;
      boite.innerHTML = res.length
        ? res
            .map(
              (r, i) => `
 <a href="${TCM.lienLigne(r.ligne.id)}" data-i="${i}" class="flex items-center gap-3 px-3 py-2.5 transition hover:bg-carte-2 aria-selected:bg-carte-2">
 ${TCM.picto(r.ligne, 36)}
 <span class="min-w-0"><span class="block truncate text-sm font-bold text-encre">${TCM.esc(r.ligne.depart)} <i class="fa-solid fa-arrow-right-arrow-left mx-1 text-[10px] text-doux"></i> ${TCM.esc(r.ligne.terminus)}</span>
 <span class="block truncate text-xs text-doux">${TCM.esc(r.ligne.nom)}${r.arret ? " · dessert " + TCM.esc(r.arret) : ""}</span></span>
 </a>`
            )
            .join("")
        : `<p class="px-4 py-3 text-sm text-doux">Aucune ligne ne correspond à « ${TCM.esc(champ.value)} ».</p>`;
    };
    TCM.reseau().then((d) => {
      R = d;
      if (champ.value) rendre();
    });
    champ.addEventListener("input", rendre);
    champ.addEventListener("keydown", (e) => {
      const liens = [...boite.querySelectorAll("a")];
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        sel = Math.max(0, Math.min(liens.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1)));
        liens.forEach((a, i) => a.setAttribute("aria-selected", i === sel));
      } else if (e.key === "Enter") {
        const a = liens[sel >= 0 ? sel : 0];
        if (a) {
          e.preventDefault();
          location.href = a.href;
        }
      } else if (e.key === "Escape") {
        boite.hidden = true;
      }
    });
    document.addEventListener("click", (e) => {
      if (!boite.contains(e.target) && e.target !== champ) boite.hidden = true;
    });
    champ.addEventListener("focus", () => {
      if (champ.value.trim()) boite.hidden = false;
    });
  };

  /* ---------- calendrier : vacances scolaires (zone A) et jours fériés ---------- */
  TCM.periodeDu = async (d = new Date()) => {
    const cal = await TCM.calendrier();
    const j = TCM.iso(d);
    const vac = (cal.periodes || []).find((p) => j >= p.debut && j <= p.fin);
    const ferie = (cal.feries || []).find((f) => f.date === j);
    return {
      vacances: !!vac,
      nom: vac ? vac.nom : null,
      ferie: ferie ? ferie.nom : null,
      jour: ferie || d.getDay() === 0 ? "dimanche" : d.getDay() === 6 ? "samedi" : "semaine",
    };
  };
  TCM.momentDu = (d = new Date()) => {
    const h = d.getHours() + d.getMinutes() / 60;
    if (h < 5) return "nuit";
    if ((h >= 7 && h < 9.5) || (h >= 16.5 && h < 19)) return "pointe";
    if (h >= 20.5) return "soir";
    return "creuse";
  };

  /* ---------- parkings relais : estimation de l'occupation selon l'heure (pas de capteurs) ----------
 Tirage pseudo-aléatoire stable par parking et par quart d'heure : la même valeur sur toutes les pages. */
  const graine = (s) => {
    let h = 2166136261;
    for (const c of s) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  };
  TCM.occupation = async (p, d = new Date()) => {
    const per = await TCM.periodeDu(d);
    const quart = Math.floor((d.getHours() * 60 + d.getMinutes()) / 15);
    const r = graine(p.id + TCM.iso(d) + quart);
    const h = d.getHours() + d.getMinutes() / 60;
    let taux;
    if (per.jour === "dimanche") taux = 0.12 + 0.08 * r();
    else if (per.jour === "samedi") taux = h < 9 ? 0.15 : h < 19 ? 0.45 + 0.2 * r() : 0.2 + 0.1 * r();
    else if (h < 6) taux = 0.04 + 0.03 * r();
    else if (h < 7) taux = 0.25 + 0.1 * r();
    else if (h < 9.5) taux = 0.7 + 0.25 * r();
    else if (h < 16) taux = 0.85 + 0.15 * r();
    else if (h < 19) taux = 0.6 + 0.2 * r();
    else if (h < 22) taux = 0.25 + 0.1 * r();
    else taux = 0.08 + 0.05 * r();
    if (per.vacances && per.jour === "semaine") taux *= 0.75;
    const occupees = Math.min(p.places, Math.round(p.places * taux));
    const libres = p.places - occupees;
    return { libres, taux: occupees / p.places, etat: libres === 0 ? "complet" : libres < p.places * 0.15 ? "presque" : "libre" };
  };

  /* ---------- agences : ouvert / fermé maintenant ---------- */
  TCM.etatAgence = async (a, d = new Date()) => {
    const enMin = (x) => {
      const [h, m] = x.split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const fmt = (x) => x.replace(":00", "h").replace(":", "h");
    const plageDu = async (j) => {
      const per = await TCM.periodeDu(j);
      if (j.getDate() === 1 && a.premier_du_mois) return { plage: a.premier_du_mois, per };
      return { plage: per.ferie ? null : a.horaires[String(j.getDay())], per };
    };
    const prochaine = async () => {
      for (let k = 1; k <= 8; k++) {
        const j = new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);
        const { plage } = await plageDu(j);
        if (plage) return (k === 1 ? "demain" : TCM.JOURS[j.getDay()]) + " à " + fmt(plage.split("-")[0]);
      }
      return null;
    };
    const { plage, per } = await plageDu(d);
    const m = d.getHours() * 60 + d.getMinutes();
    if (plage) {
      const [o, f] = plage.split("-");
      if (m < enMin(o))
        return enMin(o) - m <= 45
          ? { ouvert: false, etat: "ouvre-bientot", classe: "statut-travaux", texte: `Ouvre bientôt · à ${fmt(o)}` }
          : { ouvert: false, etat: "ferme", classe: "statut-futur", texte: "Fermé · ouvre à " + fmt(o) };
      if (m < enMin(f))
        return enMin(f) - m <= 45
          ? { ouvert: true, etat: "ferme-bientot", bientot: true, classe: "statut-perturbation", texte: `Ferme bientôt · à ${fmt(f)}` }
          : { ouvert: true, etat: "ouvert", classe: "statut-ok", texte: "Ouvert jusqu'à " + fmt(f) };
    }
    const p = await prochaine();
    const raison = !plage && per.ferie ? `Fermé (${per.ferie})` : "Fermé";
    return { ouvert: false, etat: "ferme", classe: "statut-futur", texte: raison + (p ? " · ouvre " + p : "") };
  };

  /* ---------- info trafic : data/trafic.json, ou une feuille Google publiée en CSV ---------- */
  TCM.TYPES = {
    interruption: { nom: "Interruption", icone: "fa-circle-xmark", classe: "statut-interruption", rang: 5 },
    perturbation: { nom: "Perturbation", icone: "fa-triangle-exclamation", classe: "statut-perturbation", rang: 4 },
    travaux: { nom: "Travaux", icone: "fa-person-digging", classe: "statut-travaux", rang: 3 },
    evenement: { nom: "Événement", icone: "fa-star", classe: "statut-evenement", rang: 2 },
    information: { nom: "Information", icone: "fa-circle-info", classe: "statut-info", rang: 1 },
  };
  const csv = (txt) => {
    const lignes = [];
    let champ = "",
      ligne = [],
      guill = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (guill) {
        if (c === '"' && txt[i + 1] === '"') {
          champ += '"';
          i++;
        } else if (c === '"') guill = false;
        else champ += c;
      } else if (c === '"') guill = true;
      else if (c === "," || c === ";") {
        ligne.push(champ);
        champ = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && txt[i + 1] === "\n") i++;
        ligne.push(champ);
        lignes.push(ligne);
        ligne = [];
        champ = "";
      } else champ += c;
    }
    if (champ || ligne.length) {
      ligne.push(champ);
      lignes.push(ligne);
    }
    const tete = (lignes.shift() || []).map((h) => h.trim().toLowerCase());
    return lignes.filter((l) => l.some((x) => x.trim())).map((l) => Object.fromEntries(tete.map((h, i) => [h, (l[i] || "").trim()]).filter(([h]) => h)));
  };
  TCM.lireCsv = csv;
  TCM.messages = () =>
    (cache.__msg =
      cache.__msg ||
      (async () => {
        const conf = await TCM.config();
        let liste = null;
        const rangs = await TCM.feuille("trafic");
        if (rangs)
          liste = rangs.map((m) => ({
            ...m,
            lignes: (m.lignes || "TCM").split(/[\s,;]+/).filter(Boolean),
            type: TCM.sansAccent(m.type || "information").toLowerCase(),
            debut: TCM.dateSaisie(m.debut),
            fin: TCM.dateSaisie(m.fin),
          }));
        if (!liste && conf.trafic_google_sheet_csv) {
          try {
            const r = await fetch(conf.trafic_google_sheet_csv, { cache: "no-cache" });
            if (r.ok)
              liste = csv(await r.text()).map((m) => ({
                ...m,
                lignes: (m.lignes || "TCM").split(/[\s,;]+/).filter(Boolean),
                type: (m.type || "information").toLowerCase(),
              }));
          } catch (e) {
            liste = null;
          }
        }
        if (!liste) liste = (await TCM.json("/data/trafic.json").catch(() => ({ messages: [] }))).messages || [];
        const fin = (m) => TCM.date(m.fin && String(m.fin).length <= 10 ? m.fin + "T23:59:59" : m.fin || "2999-12-31");
        const now = new Date();
        return liste
          .map((m, i) => ({ ...m, id: "m" + i, type: TCM.TYPES[m.type] ? m.type : "information" }))
          .filter((m) => TCM.date(m.debut || "2000-01-01") <= now && fin(m) >= now)
          .sort((a, b) => TCM.TYPES[b.type].rang - TCM.TYPES[a.type].rang);
      })());
  /* état d'une ligne : le message le plus grave qui la concerne */
  TCM.etatLigne = (l, messages) => {
    const ms = messages.filter((m) => m.lignes.includes(l.id) || m.lignes.includes(l.code));
    if (l.statut && l.statut.etat === "ouverture" && TCM.date(l.statut.date) > new Date())
      return { classe: "statut-futur", texte: "Ouverture le " + TCM.dateFr(l.statut.date), messages: ms, futur: true };
    if (l.statut && l.statut.etat === "fermee") return { classe: "statut-interruption", texte: "Ligne fermée", messages: ms, ferme: true };
    const pire = ms.filter((m) => m.type !== "information" && m.type !== "evenement")[0];
    if (pire) return { classe: TCM.TYPES[pire.type].classe, texte: TCM.TYPES[pire.type].nom, messages: ms };
    return { classe: "statut-ok", texte: ms.length ? "Information" : "Trafic normal", messages: ms };
  };

  /* ---------- thème clair / sombre ---------- */
  const lireTheme = () => {
    try {
      return localStorage.getItem("tcm-theme");
    } catch (e) {
      return null;
    }
  };
  const ecrireTheme = (t) => {
    try {
      localStorage.setItem("tcm-theme", t);
    } catch (e) {
      /* navigation privée */
    }
  };
  const appliquerTheme = (t) => {
    document.documentElement.setAttribute("data-theme", t);
    document.querySelectorAll("[data-icone-theme]").forEach((i) => (i.className = "fa-solid " + (t === "night" ? "fa-sun" : "fa-moon")));
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "night" ? "#070D1F" : "#204BFE");
  };
  appliquerTheme(lireTheme() || (matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "light"));
  TCM.basculerTheme = () => {
    const t = document.documentElement.getAttribute("data-theme") === "night" ? "light" : "night";
    ecrireTheme(t);
    appliquerTheme(t);
  };

  /* ---------- en-tête ---------- */
  const NAV = [
    { titre: "Itinéraire", href: "/itineraire.html" },
    { titre: "Lignes", href: "/reseau.html" },
    { titre: "Carte", href: "/carte.html" },
    { titre: "Info trafic", href: "/trafic.html", badge: true },
    { titre: "Nouveau réseau", href: "/nouveau-reseau.html" },
    { titre: "Tarifs", href: "/tarifs.html" },
    {
      titre: "Plus",
      sous: [
        { href: "/agences.html", titre: "Agences", texte: "Horaires et ouverture en direct" },
        { href: "/parkings.html", titre: "Parkings relais", texte: "Places disponibles en direct" },
        { href: "/nuit.html", titre: "Réseau de nuit", texte: "BEN1 à BEN4" },
        { href: "/fiche-horaire.html", titre: "Fiches horaires", texte: "À imprimer, ligne par ligne" },
        { href: "/actualites.html", titre: "Actualités", texte: "La vie du réseau" },
        { href: "/archives.html", titre: "Archives", texte: "Événements passés" },
      ],
    },
  ];
  const ici = location.pathname.replace(/\/$/, "/index").replace(/\.html$/, "");
  const actif = (h) => h && ici === h.replace(/\.html$/, "");
  const badge = (cls) => `<span data-badge-trafic hidden class="${cls} grid place-items-center bg-[#E35B00] font-black text-white"></span>`;

  function entete() {
    const hote = document.getElementById("entete-site");
    if (!hote) return;
    const lien = "relative flex h-full items-center gap-2 px-3 text-[12.5px] font-bold uppercase tracking-[0.08em] transition-colors";
    const desk = NAV.map((n) =>
      n.sous
        ? `<div class="group relative h-full">
          <button class="${lien} text-encre/75 hover:text-encre" aria-haspopup="true">${n.titre}<i class="fa-solid fa-plus text-[9px]"></i></button>
          <div class="invisible absolute right-0 top-full z-50 w-72 border border-encre bg-carte opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            ${n.sous.map((s) => `<a href="${s.href}" class="flex items-center justify-between gap-3 border-b border-trait px-4 py-3 last:border-0 hover:bg-tcm-600 hover:text-white ${actif(s.href) ? "bg-carte-2" : ""}"><span><span class="block text-sm font-bold">${s.titre}</span><span class="block text-xs opacity-60">${s.texte}</span></span><i class="fa-solid fa-arrow-right text-xs"></i></a>`).join("")}
          </div>
        </div>`
        : `<a href="${n.href}" class="${lien} ${actif(n.href) ? "text-encre after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-tcm-600" : "text-encre/75 hover:text-encre"}">${n.titre}${n.badge ? badge("h-5 min-w-5 px-1 text-[11px]") : ""}</a>`
    ).join("");
    const mob = NAV.flatMap((n) => (n.sous ? n.sous : [n]))
      .map(
        (s) =>
          `<a href="${s.href}" class="flex items-center justify-between border-b border-trait px-1 py-4 text-lg font-black uppercase ${actif(s.href) ? "text-tcm-600 dark:text-tcm-300" : ""}">${s.titre}${s.badge ? badge("ml-auto mr-3 h-6 min-w-6 px-1.5 text-xs") : ""}<i class="fa-solid fa-arrow-right text-sm text-doux"></i></a>`
      )
      .join("");
    hote.innerHTML = `
      <a href="#contenu" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-tcm-600 focus:px-4 focus:py-2 focus:text-white">Aller au contenu</a>
      <div id="bandeau-site"></div>
      <header class="sticky top-0 z-40 border-b border-trait bg-carte">
        <div class="conteneur flex h-16 items-stretch gap-4">
          <a href="/index.html" class="flex shrink-0 items-center gap-3" aria-label="TCM, accueil">
            <img src="/img/TCM.png" alt="" class="h-9 w-auto" width="42" height="36">
            <span class="hidden border-l border-trait pl-3 text-[11px] font-bold uppercase leading-[1.25] tracking-[0.14em] sm:block">Transport<br>Clermont Métropole</span>
          </a>
          <nav class="ml-auto hidden items-stretch lg:flex" aria-label="Navigation principale">${desk}</nav>
          <div class="ml-auto flex items-center border-l border-trait pl-2 lg:ml-0">
            <a href="/reseau.html" class="grid h-10 w-10 place-items-center text-encre/80 hover:text-tcm-600 lg:hidden" aria-label="Trouver une ligne"><i class="fa-solid fa-magnifying-glass"></i></a>
            <button type="button" data-action="theme" class="grid h-10 w-10 place-items-center text-encre/80 hover:text-tcm-600" aria-label="Changer de thème"><i data-icone-theme class="fa-solid fa-moon"></i></button>
            <button type="button" data-action="menu" class="grid h-10 w-10 place-items-center text-encre/80 hover:text-tcm-600 lg:hidden" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu-mobile"><i class="fa-solid fa-bars text-lg"></i></button>
          </div>
        </div>
      </header>
      <div id="menu-mobile" class="fixed inset-0 z-50 hidden flex-col bg-carte lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="conteneur flex h-16 items-center justify-between border-b border-trait">
          <img src="/img/TCM.png" alt="TCM" class="h-9">
          <button type="button" data-action="fermer" class="grid h-10 w-10 place-items-center" aria-label="Fermer le menu"><i class="fa-solid fa-xmark text-xl"></i></button>
        </div>
        <nav class="conteneur flex-1 overflow-y-auto py-4" aria-label="Navigation mobile">${mob}</nav>
        <p class="conteneur pb-6 text-xs uppercase tracking-[0.14em] text-doux">Partenaire de vos déplacements depuis 1989</p>
      </div>`;
    appliquerTheme(document.documentElement.getAttribute("data-theme"));
    const menu = hote.querySelector("#menu-mobile");
    const ouvrir = (o) => {
      menu.classList.toggle("hidden", !o);
      menu.classList.toggle("flex", o);
      document.body.style.overflow = o ? "hidden" : "";
      hote.querySelector('[data-action="menu"]').setAttribute("aria-expanded", o);
    };
    hote.addEventListener("click", (e) => {
      const a = e.target.closest("[data-action]");
      if (!a) return;
      if (a.dataset.action === "theme") TCM.basculerTheme();
      if (a.dataset.action === "menu") ouvrir(true);
      if (a.dataset.action === "fermer") ouvrir(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") ouvrir(false);
    });
    // bandeau « nouveau réseau » (jusqu'à 45 jours après la mise en service) et nombre d'alertes
    TCM.reseau()
      .then((R) => {
        const debut = TCM.date(R.mise_en_service);
        const now = new Date();
        if (now < new Date(debut.getTime() + 45 * 864e5) && !/nouveau-reseau/.test(location.pathname)) {
          const avant = now < debut;
          const jours = Math.ceil((debut - now) / 864e5);
          document.getElementById("bandeau-site").innerHTML = `
          <a href="/nouveau-reseau.html" class="block bg-tcm-600 text-white hover:bg-tcm-700">
            <span class="conteneur flex h-9 items-center justify-between gap-4 text-[12px] font-bold uppercase tracking-[0.1em]">
              <span><span class="sm:hidden">${avant ? "Nouveau réseau le " + TCM.dateFr(R.mise_en_service, { annee: false }) : "Nouveau réseau en service"}</span><span class="hidden sm:inline">${avant ? "Nouveau réseau le " + TCM.dateFr(R.mise_en_service, { jour: true }) : "Le nouveau réseau est en service"}</span>${avant ? `<span class="chiffres ml-3 hidden opacity-70 sm:inline">J-${jours}</span>` : ""}</span>
              <span class="flex shrink-0 items-center gap-2"><span class="hidden sm:inline">Ce qui change</span><i class="fa-solid fa-arrow-right"></i></span>
            </span>
          </a>`;
        }
      })
      .catch(() => {});
    TCM.messages()
      .then((ms) => {
        const n = ms.filter((m) => m.type !== "information").length;
        document.querySelectorAll("[data-badge-trafic]").forEach((b) => {
          b.textContent = n;
          b.hidden = !n;
        });
      })
      .catch(() => {});
  }

  /* ---------- pied de page ---------- */
  function pied() {
    const hote = document.getElementById("pied-site");
    if (!hote) return;
    const col = (titre, liens) =>
      `<div><h2 class="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-white/40">${titre}</h2><ul class="space-y-3">${liens.map(([h, t]) => `<li><a href="${h}" class="text-white/80 hover:text-white hover:underline hover:underline-offset-4">${t}</a></li>`).join("")}</ul></div>`;
    hote.innerHTML = `
      <footer class="mt-20 bg-tcm-950 text-white">
        <div class="conteneur grid gap-12 border-b border-white/10 py-16 md:grid-cols-2 lg:grid-cols-12">
          <div class="lg:col-span-5">
            <img src="/img/TCM-Clair.png" alt="Transport Clermont Métropole" class="h-24 w-auto">
            <p class="mt-6 max-w-sm text-white/60">Partenaire de vos déplacements dans la métropole clermontoise depuis 1989 : tram, tram-train, bus, cars, services scolaires et transport à la demande.</p>
            <div id="pied-sociaux" class="mt-6 flex gap-2"></div>
          </div>
          <div class="grid gap-10 sm:grid-cols-3 md:col-span-1 lg:col-span-7">
            ${col("Réseau", [
              ["/itineraire.html", "Calculer un itinéraire"],
              ["/carte.html", "Carte en direct"],
              ["/reseau.html", "Toutes les lignes"],
              ["/nouveau-reseau.html", "Nouveau réseau"],
              ["/nuit.html", "Réseau de nuit"],
              ["/trafic.html", "Info trafic"],
            ])}
            ${col("Voyager", [
              ["/tarifs.html", "Tarifs"],
              ["/agences.html", "Agences"],
              ["/parkings.html", "Parkings relais"],
              ["/actualites.html", "Actualités"],
            ])}
            ${col("TCM", [
              ["/archives.html", "Archives"],
              ["/mentions.html", "Mentions et crédits"],
              ["/mentions.html#accessibilite", "Accessibilité"],
            ])}
          </div>
        </div>
        <div class="conteneur flex flex-col gap-2 py-6 text-[11px] uppercase tracking-[0.12em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© ${new Date().getFullYear()} TCM — Transport Clermont Métropole</p>
          <p>Photos : © Daimler Truck AG / EvoBus</p>
        </div>
      </footer>`;
    TCM.config().then((c) => {
      const s = c.reseaux_sociaux || {};
      const icones = { facebook: "fa-facebook-f", x: "fa-x-twitter", instagram: "fa-instagram" };
      document.getElementById("pied-sociaux").innerHTML = Object.entries(icones)
        .filter(([k]) => s[k])
        .map(
          ([k, i]) =>
            `<a href="${TCM.esc(s[k])}" class="grid h-10 w-10 place-items-center border border-white/20 hover:bg-white hover:text-tcm-950" aria-label="${k}" rel="noopener" target="_blank"><i class="fa-brands ${i}"></i></a>`
        )
        .join("");
    });
  }

  /* ---------- passages théoriques : départs calculés à partir des fréquences (pas d'horaires réels) ----------
     Pour chaque ligne et chaque sens, les départs du terminus s'enchaînent au rythme de la fréquence du créneau,
     décalés d'une valeur propre à la ligne : toutes les pages affichent les mêmes passages. */
  const graineTxt = (x) => {
    let h = 2166136261;
    for (const c of String(x)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0) / 4294967296;
  };
  const momentMin = (m) => (m < 300 ? "nuit" : (m >= 420 && m < 570) || (m >= 990 && m < 1140) ? "pointe" : m >= 1230 ? "soir" : "creuse");
  TCM.circule = (l, d) => {
    if (!l || ["scolaire", "tad"].includes(l.mode)) return false;
    if (l.statut && l.statut.etat === "fermee") return false;
    if (l.statut && l.statut.etat === "ouverture" && TCM.date(l.statut.date) > d) return false;
    return true;
  };
  /* départs (minutes depuis minuit) d'une journée, pour un sens */
  TCM.departs = async (l, sens, jour) => {
    const per = await TCM.periodeDu(jour);
    const f = l.frequences?.[per.vacances ? "vacances" : "scolaire"]?.[per.jour] || {};
    const out = [];
    const dec = graineTxt(l.id + ":" + sens + ":" + TCM.iso(jour));
    let m = 0;
    while (m < 1440) {
      const fr = f[momentMin(m)];
      if (!fr) {
        m = momentMin(m) === "nuit" ? 300 : m + 5;
        continue;
      }
      const debut = m;
      let t = debut + Math.floor(dec * fr);
      while (t < 1440 && f[momentMin(t)]) {
        out.push(t);
        t += f[momentMin(t)];
      }
      m = t;
      while (m < 1440 && f[momentMin(m)]) m++;
      if (m === debut) m++;
    }
    return out;
  };
  /* prochains passages d'une ligne à un arrêt situé à « decalage » minutes du terminus de départ du sens */
  TCM.passages = async (l, sens, decalage, d = new Date(), n = 2) => {
    if (!TCM.circule(l, d)) return [];
    const res = [];
    for (const k of [-1, 0, 1]) {
      const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);
      for (const m of await TCM.departs(l, sens, jour)) {
        const t = new Date(jour.getTime() + (m + decalage) * 60000);
        if (t >= d) res.push(t);
      }
      if (res.length >= n && k >= 0) break;
    }
    return res.sort((a, b) => a - b).slice(0, n);
  };
  TCM.delai = (t, d = new Date()) => {
    const m = Math.round((t - d) / 60000);
    if (m <= 0) return "À l'approche";
    if (m < 60) return m + " min";
    return String(t.getHours()).padStart(2, "0") + "h" + String(t.getMinutes()).padStart(2, "0");
  };
  /* lignes scolaires : y a-t-il service aujourd'hui ? */
  TCM.etatScolaire = async (l, d = new Date()) => {
    const per = await TCM.periodeDu(d);
    const reprise = async () => {
      for (let k = 1; k <= 120; k++) {
        const j = new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);
        const p = await TCM.periodeDu(j);
        if (!p.vacances && !p.ferie && p.jour === "semaine") return j;
      }
      return null;
    };
    if (per.vacances) {
      const r = await reprise();
      return {
        service: false,
        titre:
          "Pas de service pendant " +
          (/^vacances/i.test(per.nom) ? "les " + per.nom.replace(/^Vacances/, "vacances") : "le " + per.nom.charAt(0).toLowerCase() + per.nom.slice(1)),
        texte: r ? "Reprise le " + TCM.dateFr(r, { jour: true }) + "." : "",
      };
    }
    if (per.ferie || per.jour !== "semaine") {
      const r = await reprise();
      const pourquoi = per.ferie ? per.ferie + " : pas de service" : "Pas de service le week-end";
      return { service: false, titre: pourquoi, texte: r ? "Prochain service le " + TCM.dateFr(r, { jour: true }) + "." : "" };
    }
    return {
      service: true,
      titre: "Service assuré aujourd'hui",
      texte: l.services_par_jour
        ? `${l.services_par_jour} service${l.services_par_jour > 1 ? "s" : ""}, adapté${l.services_par_jour > 1 ? "s" : ""} aux horaires des établissements.`
        : "Adapté aux horaires des établissements.",
    };
  };

  /* ---------- géographie : arrêts placés sur Clermont-Ferrand, tracés des lignes ---------- */
  let geoP = null;
  TCM.geo = () =>
    (geoP =
      geoP ||
      Promise.all([TCM.json("/data/positions.json"), TCM.itineraires(), TCM.plans(), TCM.json("/data/noms_arrets.json"), TCM.reseau()]).then(
        ([G, I, P, conf, R]) => {
          const o = G.origine,
            e = G.echelle_m;
          const enLatLon = ([x, y]) => [o.lat - ((y - o.pixel[1]) * e) / 111320, o.lon + ((x - o.pixel[0]) * e) / (111320 * Math.cos((o.lat * Math.PI) / 180))];
          const alias = {};
          for (const [k, v] of Object.entries(conf.alias || {})) alias[cleNom(k)] = cleNom(v);
          const parCle = {};
          for (const [k, v] of Object.entries(G.plan)) parCle[cleNom(k)] = enLatLon(v);
          for (const [k, v] of Object.entries(G.reel || {})) parCle["site:" + cleNom(k)] = v;
          const posCle = (k) => parCle[alias[k] || k] || null;
          const parId = {};
          for (const a of I.arrets) {
            let p = posCle(a.cle);
            if (!p && a.cle.startsWith("site:")) {
              const jeu = Object.entries(conf.noms || {}).find(([, v]) => cleNom(v) === a.cle.slice(5));
              if (jeu) p = posCle(cleNom(jeu[0]));
            }
            if (p) parId[a.id] = p;
          }
          /* tracé complet d'une ligne : arrêts nommés placés, arrêts sans nom répartis entre eux */
          const traces = {};
          for (const [lid, li] of Object.entries(I.lignes)) {
            const p = P[lid] || (li.source && li.source.startsWith("plan ") && P[li.source.slice(5)]);
            let pts = [];
            if (p) {
              const { chemins, boucle } = TCM.parcoursPlan(p);
              const c = chemins[0];
              const k = c.map((x) => (x.s.name || "").trim() && posCle(alias[cleNom(x.s.name)] || cleNom(x.s.name)));
              const nommes = k.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
              if (nommes.length < 2) continue;
              pts = c
                .map((x, i) => {
                  if (k[i]) return { pos: k[i], cle: TCM.cleArretPlan(x), rang: i };
                  const av = [...nommes].reverse().find((j) => j < i),
                    ap = nommes.find((j) => j > i);
                  if (av === undefined || ap === undefined) return null;
                  const r = (i - av) / (ap - av);
                  return { pos: [k[av][0] + (k[ap][0] - k[av][0]) * r, k[av][1] + (k[ap][1] - k[av][1]) * r], cle: TCM.cleArretPlan(x), rang: i };
                })
                .filter(Boolean);
              traces[lid] = { pts, boucle, pas: (R.lignes[lid]?.temps || 0) / Math.max(1, c.length - 1 - (boucle ? 0 : 0)) };
              const tot = R.lignes[lid]?.temps || 0;
              const n = c.length - 1;
              traces[lid].pts.forEach((q) => (q.t = (q.rang / Math.max(1, n)) * tot));
            } else {
              const c = li.chemins[0];
              pts = c.map(([sid, t]) => parId[sid] && { pos: parId[sid], id: sid, t }).filter(Boolean);
              if (pts.length < 2) continue;
              traces[lid] = { pts, boucle: li.boucle };
            }
            traces[lid].temps = R.lignes[lid]?.temps || (pts.length ? pts[pts.length - 1].t : 0);
            for (const q of traces[lid].pts) if (!q.id && q.cle) q.id = I.idDe(q.cle);
          }
          return { parId, traces, enLatLon };
        }
      ));
  /* Leaflet (carte) chargé à la demande depuis cdnjs, fond de plan CARTO clair ou sombre selon le thème */
  let leafletP = null;
  TCM.leaflet = () =>
    (leafletP =
      leafletP ||
      new Promise((ok, ko) => {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(css);
        const js = document.createElement("script");
        js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
        js.onload = () => ok(window.L);
        js.onerror = () => ko(new Error("Leaflet indisponible"));
        document.head.appendChild(js);
      }));
  TCM.fondCarte = (Lf, carte) => {
    const sombre = () => document.documentElement.getAttribute("data-theme") === "night";
    let couche = null;
    const poser = () => {
      if (couche) carte.removeLayer(couche);
      couche = Lf.tileLayer(`https://{s}.basemaps.cartocdn.com/${sombre() ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`, {
        subdomains: "abcd",
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(carte);
      couche.bringToBack();
    };
    poser();
    new MutationObserver(poser).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  };
  /* position le long d'un tracé, t en minutes depuis le départ du sens 0 */
  TCM.surTrace = (tr, t) => {
    const pts = tr.pts;
    if (t <= pts[0].t) return { pos: pts[0].pos, i: 0 };
    for (let i = 1; i < pts.length; i++)
      if (t <= pts[i].t) {
        const r = (t - pts[i - 1].t) / Math.max(0.01, pts[i].t - pts[i - 1].t);
        return { pos: [pts[i - 1].pos[0] + (pts[i].pos[0] - pts[i - 1].pos[0]) * r, pts[i - 1].pos[1] + (pts[i].pos[1] - pts[i - 1].pos[1]) * r], i };
      }
    return { pos: pts[pts.length - 1].pos, i: pts.length - 1 };
  };

  /* ---------- apparition au défilement ---------- */
  TCM.observer = () => {
    const els = document.querySelectorAll(".apparait:not(.vu)");
    if (!("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("vu"));
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("vu");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((e) => io.observe(e));
  };

  const demarrer = () => {
    entete();
    pied();
    TCM.observer();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer);
  else demarrer();
})();
