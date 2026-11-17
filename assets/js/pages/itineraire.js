/* Calculateur d'itinéraire : plus court chemin sur le réseau, à partir des fréquences (pas d'horaires) */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const CORRESPONDANCE = 4; // minutes pour changer de quai ou de trottoir
  const PENALITE_MOINS_CORR = 12; // minutes « fictives » par correspondance quand on veut en faire moins

  const [I, R, ms] = await Promise.all([TCM.itineraires(), TCM.reseau(), TCM.messages().catch(() => [])]);
  const A = Object.fromEntries(I.arrets.map((a) => [a.id, a]));
  const L = R.lignes;

  /* ---------- formulaire ---------- */
  const de = $("#de"),
    a = $("#a"),
    quand = $("#quand"),
    moinsCorr = $("#moins-corr");
  const locale = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const remplir = (champ, id) => {
    if (A[id]) {
      champ.value = A[id].nom;
      champ.dataset.arret = id;
    }
  };
  TCM.brancherArret(de, $("#de-liste"), () => (a.dataset.arret ? lancer() : a.focus()));
  TCM.brancherArret(a, $("#a-liste"), () => de.dataset.arret && lancer());
  remplir(de, TCM.param("de"));
  remplir(a, TCM.param("a"));
  quand.value = TCM.param("quand") || locale(new Date());
  moinsCorr.checked = TCM.param("corr") === "moins";

  $("#inverser").addEventListener("click", () => {
    [de.value, a.value] = [a.value, de.value];
    [de.dataset.arret, a.dataset.arret] = [a.dataset.arret || "", de.dataset.arret || ""];
    if (de.dataset.arret && a.dataset.arret) lancer();
  });
  $("#maintenant").addEventListener("click", () => {
    quand.value = locale(new Date());
    if (de.dataset.arret && a.dataset.arret) lancer();
  });
  quand.addEventListener("change", () => de.dataset.arret && a.dataset.arret && lancer());
  moinsCorr.addEventListener("change", () => de.dataset.arret && a.dataset.arret && lancer());
  $("#form-iti").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!de.dataset.arret) return de.focus();
    if (!a.dataset.arret) return a.focus();
    lancer();
  });

  /* ---------- exemples ---------- */
  const parNom = (n) => I.arrets.find((x) => x.nom === n);
  const exemples = [
    ["Gare de Clermont-Ferrand", "Aéroport Clermont-Ferrand Auvergne"],
    ["L'Attaque", "Pôle Tertiaire"],
    ["Campus Alan Turing", "Gare de Clermont-Ferrand"],
    ["Chamalières - Centre", "Parc d'attractions"],
  ]
    .map(([x, y]) => [parNom(x), parNom(y)])
    .filter(([x, y]) => x && y);
  $("#exemples").innerHTML = exemples
    .map(
      ([
        x,
        y,
      ]) => `<li><a href="?de=${x.id}&a=${y.id}" class="group flex items-center gap-4 border-b border-trait py-4 transition-colors hover:bg-carte md:px-3">
      <span class="min-w-0 flex-1 font-bold">${TCM.esc(x.nom)} <i class="fa-solid fa-arrow-right mx-2 text-xs text-doux"></i> ${TCM.esc(y.nom)}</span>
      <i class="fa-solid fa-arrow-right text-doux transition-transform group-hover:translate-x-1 group-hover:text-tcm-600"></i></a></li>`
    )
    .join("");

  /* ---------- disponibilité et fréquence d'une ligne à une date ---------- */
  const PERIODE_NOM = { pointe: "heure de pointe", creuse: "heures creuses", soir: "soirée", nuit: "nuit" };
  async function contexte(d) {
    const per = await TCM.periodeDu(d);
    const moment = TCM.momentDu(d);
    const lignes = {};
    for (const id of Object.keys(I.lignes)) {
      const l = L[id];
      if (!l) continue;
      if (l.statut && l.statut.etat === "ouverture" && TCM.date(l.statut.date) > d) continue;
      if (l.statut && l.statut.etat === "fermee") continue;
      const coupe = ms.some((m) => m.type === "interruption" && (m.lignes.includes(id) || m.lignes.includes(l.code)) && (!m.fin || TCM.date(m.fin) >= d));
      if (coupe) continue;
      const f = l.frequences?.[per.vacances ? "vacances" : "scolaire"]?.[per.jour]?.[moment];
      if (f) lignes[id] = f;
    }
    return { per, moment, lignes };
  }

  /* ---------- graphe : pour chaque arrêt, les trajets directs possibles ---------- */
  const desserte = {}; // arrêt -> [{ligne, chemin, pos}]
  for (const [id, li] of Object.entries(I.lignes))
    li.chemins.forEach((c, ci) =>
      c.forEach((n, pos) => {
        if (li.boucle && pos === c.length - 1) return; // le dernier point d'une boucle est le premier
        (desserte[n[0]] = desserte[n[0]] || []).push({ ligne: id, ci, pos });
      })
    );

  function trajetsDirects(stop, ctx, interdites) {
    const out = [];
    for (const d of desserte[stop] || []) {
      if (!(d.ligne in ctx.lignes) || interdites.has(d.ligne)) continue;
      const li = I.lignes[d.ligne];
      const c = li.chemins[d.ci];
      const t0 = c[d.pos][1];
      if (li.boucle) {
        const tour = c[c.length - 1][1];
        for (let k = 1; k < c.length - 1; k++) {
          const j = (d.pos + k) % (c.length - 1);
          const t = c[j][1] - t0 + (j <= d.pos ? tour : 0);
          out.push({ ligne: d.ligne, ci: d.ci, de: d.pos, a: j, vers: c[j][0], duree: t, sens: 1 });
        }
      } else {
        c.forEach((n, j) => {
          if (j !== d.pos) out.push({ ligne: d.ligne, ci: d.ci, de: d.pos, a: j, vers: n[0], duree: Math.abs(n[1] - t0), sens: j > d.pos ? 1 : -1 });
        });
      }
    }
    return out;
  }

  function calculer(depart, arrivee, ctx, opts) {
    const meilleur = { [depart]: { cout: 0, temps: 0, corr: -1, prec: null } };
    const faits = new Set();
    for (;;) {
      let u = null;
      for (const k in meilleur) if (!faits.has(k) && (u === null || meilleur[k].cout < meilleur[u].cout)) u = k;
      if (u === null || u === arrivee) break;
      faits.add(u);
      const lu = meilleur[u];
      for (const t of trajetsDirects(u, ctx, opts.interdites)) {
        if (lu.prec && lu.prec.ligne === t.ligne) continue;
        const attente = ctx.lignes[t.ligne] / 2;
        const changement = lu.prec ? CORRESPONDANCE : 0;
        const temps = lu.temps + changement + attente + t.duree;
        const cout = lu.cout + changement + attente + t.duree + (lu.prec && opts.moinsCorr ? PENALITE_MOINS_CORR : 0);
        const v = meilleur[t.vers];
        if (!v || cout < v.cout - 1e-9) meilleur[t.vers] = { cout, temps, corr: lu.corr + 1, prec: { ...t, depuis: u, attente, changement } };
      }
    }
    if (!meilleur[arrivee] || depart === arrivee) return null;
    const etapes = [];
    for (let k = arrivee; meilleur[k].prec; k = meilleur[k].prec.depuis) etapes.unshift(meilleur[k].prec);
    return { etapes, temps: meilleur[arrivee].temps, cout: meilleur[arrivee].cout };
  }

  function alternatives(depart, arrivee, ctx, moinsCorr) {
    const res = [];
    const sig = (r) => r.etapes.map((e) => e.ligne + ":" + e.depuis + ">" + e.vers).join("|");
    const base = calculer(depart, arrivee, ctx, { interdites: new Set(), moinsCorr });
    if (!base) return [];
    res.push(base);
    for (const e of base.etapes) {
      const r = calculer(depart, arrivee, ctx, { interdites: new Set([e.ligne]), moinsCorr });
      if (r && !res.some((x) => sig(x) === sig(r)) && r.temps <= base.temps * 1.6 + 10) res.push(r);
    }
    const autre = calculer(depart, arrivee, ctx, { interdites: new Set(), moinsCorr: !moinsCorr });
    if (autre && !res.some((x) => sig(x) === sig(autre))) res.push(autre);
    return res.sort((x, y) => x.temps - y.temps || x.etapes.length - y.etapes.length).slice(0, 4);
  }

  /* ---------- affichage ---------- */
  const heure = (d) => d.getHours() + "h" + String(d.getMinutes()).padStart(2, "0");
  const plus = (d, min) => new Date(d.getTime() + min * 60000);
  const duree = (m) => {
    m = Math.max(1, Math.round(m));
    return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0");
  };
  const nomArret = (id) => A[id]?.nom || "?";

  function direction(e) {
    const li = I.lignes[e.ligne];
    const c = li.chemins[e.ci];
    if (li.boucle) return "Boucle";
    return nomArret(c[e.sens > 0 ? c.length - 1 : 0][0]);
  }
  function arretsEntre(e) {
    const li = I.lignes[e.ligne];
    const c = li.chemins[e.ci];
    const n = c.length - (li.boucle ? 1 : 0);
    const ids = [];
    for (let j = (e.de + e.sens + n) % n; j !== e.a; j = (j + e.sens + n) % n) if (!li.boucle || j < n) ids.push(c[j]);
    const nb = c[e.a][2] != null && c[e.de][2] != null ? Math.abs(c[e.a][2] - c[e.de][2]) : null;
    return { via: ids.filter((x) => !A[x[0]].partage).map((x) => nomArret(x[0])), nb: li.boucle && nb != null && e.a < e.de ? null : nb };
  }

  function resume(r, d, i, actif) {
    const fin = plus(d, r.temps);
    const nbc = r.etapes.length - 1;
    return `<li><button type="button" data-o="${i}" class="carte-lien w-full p-4 text-left ${actif ? "!border-tcm-600 shadow-[inset_4px_0_0_#204BFE]" : ""}">
      <span class="flex items-baseline justify-between gap-3"><span class="chiffres text-3xl font-black">${duree(r.temps)}</span><span class="chiffres text-sm text-doux">${heure(d)} <i class="fa-solid fa-arrow-right mx-1 text-[10px]"></i> ${heure(fin)}</span></span>
      <span class="mt-3 flex flex-wrap items-center gap-1.5">${r.etapes.map((e) => TCM.picto(L[e.ligne], 28)).join('<i class="fa-solid fa-chevron-right text-[10px] text-doux"></i>')}</span>
      <span class="mt-3 block text-xs text-doux">${nbc ? nbc + " correspondance" + (nbc > 1 ? "s" : "") : "Direct"}${i === 0 ? ' · <span class="font-bold text-tcm-600 dark:text-tcm-300">Le plus rapide</span>' : ""}</span>
    </button></li>`;
  }

  function detail(r, d, ctx) {
    let t = 0;
    const rangee = (temps, contenu, point = "") =>
      `<li class="grid grid-cols-[3.5rem_1.5rem_1fr] gap-x-3"><span class="chiffres pt-0.5 text-right text-sm font-bold">${temps}</span><span class="relative flex justify-center">${point}</span><div class="min-w-0 pb-6">${contenu}</div></li>`;
    const pointArret = '<span class="relative z-10 mt-1 h-3.5 w-3.5 border-[3px] border-encre bg-carte"></span>';
    let h = "";
    r.etapes.forEach((e, i) => {
      const l = L[e.ligne];
      const m = TCM.MODES[l.mode] || TCM.MODES.bus;
      const { via, nb } = arretsEntre(e);
      if (i === 0)
        h += rangee(
          heure(plus(d, t)),
          `<p class="text-lg font-black uppercase leading-tight"><a href="/arret.html?a=${encodeURIComponent(e.depuis)}" class="hover:text-tcm-600">${TCM.esc(nomArret(e.depuis))}</a></p><p class="text-xs text-doux">Départ</p>`,
          pointArret
        );
      else {
        t += e.changement;
        h += rangee(
          "",
          `<p class="text-sm text-doux"><i class="fa-solid fa-person-walking mr-2"></i>Correspondance à ${TCM.esc(nomArret(e.depuis))} · ${duree(e.changement)}</p>`,
          '<span class="absolute inset-y-0 w-0 border-l-2 border-dashed border-trait"></span>'
        );
      }
      t += e.attente;
      const alertes = TCM.etatLigne(l, ms).messages.filter(
        (x) => x.type !== "information" && (!x.fin || TCM.date(x.fin) >= d) && (!x.debut || TCM.date(x.debut) <= plus(d, t))
      );
      h += rangee(
        "",
        `<div class="flex items-start gap-3 border-l-0">
          ${TCM.picto(l, 44, true)}
          <div class="min-w-0">
            <p class="font-bold leading-snug"><i class="fa-solid ${m.icone} mr-1.5 text-doux"></i>${m.nom} ${TCM.esc(l.id)} <span class="font-normal text-doux">direction</span> ${TCM.esc(direction(e))}</p>
            <p class="mt-1 text-sm text-doux">Un passage toutes les ${ctx.lignes[e.ligne]} min · attente moyenne ${duree(e.attente)}</p>
            <p class="mt-1 text-sm text-doux">${nb ? nb + " arrêt" + (nb > 1 ? "s" : "") + " · " : ""}${duree(e.duree)} à bord</p>
            ${via.length ? `<details class="mt-2 text-sm"><summary class="cursor-pointer text-doux hover:text-encre">Principaux arrêts</summary><ul class="mt-2 grid gap-1 border-l-2 pl-3" style="border-color:${l.couleur}">${via.map((v) => `<li>${TCM.esc(v)}</li>`).join("")}</ul></details>` : ""}
            ${alertes.map((x) => `<a href="/trafic.html#${x.id}" class="${TCM.TYPES[x.type].classe} pastille fond-statut mt-2"><i class="fa-solid ${TCM.TYPES[x.type].icone}"></i>${TCM.esc(x.titre)}</a>`).join("")}
          </div></div>`,
        `<span class="absolute inset-y-0 w-1.5" style="background:${l.couleur}"></span>`
      );
      t += e.duree;
      const derniere = i === r.etapes.length - 1;
      h += rangee(
        heure(plus(d, t)),
        `<p class="${derniere ? "text-lg font-black uppercase leading-tight" : "font-bold"}"><a href="/arret.html?a=${encodeURIComponent(e.vers)}" class="hover:text-tcm-600">${TCM.esc(nomArret(e.vers))}</a></p><p class="text-xs text-doux">${derniere ? "Arrivée" : "Descendre ici"}</p>`,
        pointArret
      );
    });
    const etApres = r.etapes.some((e) => e.ligne === "ET");
    return `<div class="flex flex-wrap items-end justify-between gap-4 border-b border-trait p-5 sm:p-6">
        <div><p class="surtitre">Trajet estimé</p><p class="chiffres mt-1 text-4xl font-black">${duree(r.temps)}</p></div>
        <div class="flex gap-2"><button type="button" id="partager" class="bouton bouton-ligne"><i class="fa-solid fa-link"></i>Copier le lien</button></div>
      </div>
      <ol class="p-5 sm:p-6">${h}</ol>
      <div class="border-t border-trait p-5 text-sm text-doux sm:px-6"><i class="fa-solid fa-ticket mr-2"></i>${etApres ? "Le tram-train ET demande un Ticket Aéroport." : "Trajet sur le réseau TCM."} <a href="/tarifs.html" class="lien">Voir les tarifs</a></div>`;
  }

  let choix = [];
  let actuel = 0;
  async function lancer() {
    const d = quand.value ? new Date(quand.value) : new Date();
    const dep = de.dataset.arret,
      arr = a.dataset.arret;
    const q = new URLSearchParams({ de: dep, a: arr, quand: quand.value });
    if (moinsCorr.checked) q.set("corr", "moins");
    history.replaceState(null, "", "?" + q);
    const ctx = await contexte(d);
    $("#periode").textContent =
      (ctx.per.vacances ? "Vacances scolaires" : "Période scolaire") +
      " · " +
      { semaine: "semaine", samedi: "samedi", dimanche: "dimanche et fêtes" }[ctx.per.jour] +
      " · " +
      PERIODE_NOM[ctx.moment];
    $("#iti-vide").hidden = true;
    $("#iti-resultats").hidden = false;
    const avant = d < TCM.date(R.mise_en_service);
    $("#iti-alerte").innerHTML = avant
      ? `<p class="statut-futur fond-statut mb-8 p-4 text-sm"><i class="fa-solid fa-circle-info mr-2"></i>Calcul fait sur le nouveau réseau, en service à partir du ${TCM.dateFr(R.mise_en_service, { jour: true })}.</p>`
      : "";
    if (dep === arr) {
      choix = [];
      $("#iti-options").innerHTML = "";
      $("#iti-detail").innerHTML = '<p class="p-6 text-doux">Le départ et l\'arrivée sont le même arrêt.</p>';
      return;
    }
    choix = alternatives(dep, arr, ctx, moinsCorr.checked);
    actuel = 0;
    if (!choix.length) {
      $("#iti-options").innerHTML = "";
      $("#iti-detail").innerHTML = `<div class="p-6"><p class="text-lg font-black uppercase">Pas de trajet à cette heure-ci</p>
        <p class="mt-2 text-doux">${ctx.moment === "nuit" ? "La nuit, seules ces lignes circulent : " + Object.keys(ctx.lignes).sort(TCM.triLignes).join(", ") + "." : "Aucune ligne en service ne relie ces deux arrêts à ce moment."} Essayez un autre horaire.</p></div>`;
      return;
    }
    afficher(d, ctx);
  }
  function afficher(d, ctx) {
    $("#iti-titre").textContent = choix.length > 1 ? choix.length + " trajets proposés" : "Trajet proposé";
    $("#iti-options").innerHTML = choix.map((r, i) => resume(r, d, i, i === actuel)).join("");
    $("#iti-detail").innerHTML = detail(choix[actuel], d, ctx);
    $("#iti-options").onclick = (e) => {
      const b = e.target.closest("[data-o]");
      if (!b) return;
      actuel = +b.dataset.o;
      afficher(d, ctx);
      if (matchMedia("(max-width: 1023px)").matches) $("#iti-detail").scrollIntoView({ behavior: "smooth", block: "start" });
    };
    $("#partager").onclick = async (e) => {
      try {
        await navigator.clipboard.writeText(location.href);
        e.currentTarget.innerHTML = '<i class="fa-solid fa-check"></i>Lien copié';
      } catch (err) {
        e.currentTarget.textContent = "Copiez l'adresse de la page";
      }
    };
  }

  if (de.dataset.arret && a.dataset.arret) lancer();
  else if (!de.dataset.arret) de.focus({ preventScroll: true });
})();
