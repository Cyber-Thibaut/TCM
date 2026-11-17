/* Fiche d'une ligne : ligne.html?l=<numéro> */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const [R, ms, per] = await Promise.all([TCM.reseau(), TCM.messages().catch(() => []), TCM.periodeDu()]);
  const L = R.lignes;
  const id = (TCM.param("l") || location.hash.slice(1) || "").trim();
  const l = L[id] || L[id.toUpperCase()] || Object.values(L).find((x) => x.code === id);
  if (!l) {
    $("#ligne-vide").hidden = false;
    return;
  }
  $("#ligne").hidden = false;
  document.title = `${l.nom} : ${l.depart} – ${l.terminus} — TCM`;
  const fam = R.familles.find((f) => f.cle === l.famille) || {};
  const m = TCM.MODES[l.mode] || TCM.MODES.bus;
  const futur = l.statut?.etat === "ouverture" && TCM.date(l.statut.date) > new Date();

  /* ---- en-tête ---- */
  $("#ligne-teinte").style.background = l.couleur;
  $("#fil-ligne").textContent = l.nom;
  $("#ligne-picto").innerHTML = TCM.picto(l, 112);
  $("#ligne-famille").innerHTML = `<i class="fa-solid ${m.icone} mr-1.5"></i>${TCM.esc(m.nom)} · ${TCM.esc(fam.nom || "")}`;
  $("#ligne-nom").textContent = l.nom;
  $("#ligne-terminus").innerHTML = `${TCM.esc(l.depart)} <i class="fa-solid fa-arrow-right-arrow-left mx-2 text-base text-doux"></i> ${TCM.esc(l.terminus)}`;
  const e = TCM.etatLigne(l, ms);
  $("#ligne-badges").innerHTML = [
    `<span class="${e.classe} pastille fond-statut"><span class="point-statut !h-2 !w-2"></span>${TCM.esc(e.texte)}</span>`,
    l.nouvelle ? '<span class="pastille border border-trait text-encre">Nouvelle ligne</span>' : "",
    l.electrique
      ? `<span class="pastille border border-trait text-encre"><i class="fa-solid fa-bolt"></i>Électrique${typeof l.electrique === "string" && l.electrique !== "dès l'ouverture" ? " dès " + l.electrique : ""}</span>`
      : "",
    l.aeroport ? '<span class="pastille border border-trait text-encre"><i class="fa-solid fa-plane"></i>Dessert l\'aéroport</span>' : "",
    l.hns && l.mode === "bhns" ? '<span class="pastille border border-trait text-encre">Haut niveau de service</span>' : "",
  ].join("");

  /* ---- alertes ---- */
  const alertes = [];
  if (futur)
    alertes.push({
      classe: "statut-futur",
      icone: "fa-calendar-days",
      titre: `Ouverture le ${TCM.dateFr(l.statut.date, { jour: true })}`,
      detail:
        l.id === "B"
          ? "La ligne B ouvrira lorsque toutes ses rames auront été livrées et testées. Les horaires ci-dessous sont ceux prévus à l'ouverture."
          : "Les horaires ci-dessous sont ceux prévus à l'ouverture de la ligne.",
    });
  e.messages.forEach((x) => {
    const t = TCM.TYPES[x.type];
    alertes.push({ classe: t.classe, icone: t.icone, titre: x.titre, detail: x.detail, periode: x });
  });
  $("#ligne-alertes").innerHTML = alertes
    .map(
      (a) => `
 <div class="${a.classe} carte bande-statut flex gap-4 p-5">
 <span class="fond-statut grid h-11 w-11 shrink-0 place-items-center "><i class="fa-solid ${a.icone}"></i></span>
 <div><p class="font-black">${TCM.esc(a.titre)}</p>${a.detail ? `<p class="mt-1 text-sm text-doux">${TCM.esc(a.detail)}</p>` : ""}
 ${a.periode ? `<p class="mt-2 text-xs text-doux">Du ${TCM.dateFr(a.periode.debut, { heure: true })} au ${TCM.dateFr(a.periode.fin, { heure: true })}</p>` : ""}</div>
 </div>`
    )
    .join("");

  /* ---- en ce moment ---- */
  const momentNoms = { creuse: "en heures creuses", pointe: "en heure de pointe", soir: "en soirée", nuit: "la nuit" };
  const jourNoms = { semaine: "en semaine", samedi: "le samedi", dimanche: per.ferie ? "un jour férié" : "le dimanche" };
  if (l.frequences) {
    const moment = TCM.momentDu();
    const p = per.vacances ? "vacances" : "scolaire";
    const f = l.frequences[p]?.[per.jour]?.[moment];
    const ctx = `${per.vacances ? per.nom : "Période scolaire"} · ${jourNoms[per.jour]} ${momentNoms[moment]}`;
    if (futur) {
      $("#maintenant-texte").textContent = "La ligne n'est pas encore en service";
      $("#maintenant-detail").textContent = "Ouverture le " + TCM.dateFr(l.statut.date);
      $("#maintenant-chiffre").innerHTML = '<i class="fa-solid fa-hourglass-half text-3xl text-doux"></i>';
    } else if (f) {
      $("#maintenant-texte").textContent = `Un ${l.mode === "tram" || l.mode === "tramtrain" ? "tram" : "bus"} toutes les ${f} minutes environ`;
      $("#maintenant-detail").textContent = ctx;
      $("#maintenant-chiffre").innerHTML =
        `<span class="text-5xl font-black text-tcm-600 dark:text-tcm-300">${f}</span><span class="font-bold text-doux">min</span>`;
    } else {
      $("#maintenant-texte").textContent = "Pas de service sur ce créneau";
      $("#maintenant-detail").textContent = ctx;
      $("#maintenant-chiffre").innerHTML = '<i class="fa-solid fa-moon text-3xl text-doux"></i>';
    }
    const corps = (periode) =>
      [
        ["semaine", "Lundi – vendredi"],
        ["samedi", "Samedi"],
        ["dimanche", "Dimanche et fêtes"],
      ]
        .map(([j, nom]) => {
          const fj = l.frequences[periode]?.[j] || {};
          const cell = (k) =>
            fj[k]
              ? `<span class="inline-flex min-w-16 justify-center ${per.jour === j && TCM.momentDu() === k && (periode === "vacances") === per.vacances ? "bg-tcm-600 text-white" : "bg-carte-2"} px-3 py-2 font-black">${fj[k]}<span class="ml-0.5 text-xs font-bold opacity-70">min</span></span>`
              : '<span class="text-doux">—</span>';
          return `<tr class="border-t border-trait"><th scope="row" class="border-t border-trait py-3 pr-4 text-sm font-bold">${nom}</th>${["creuse", "pointe", "soir", "nuit"].map((k) => `<td class="border-t border-trait py-3 text-center">${cell(k)}</td>`).join("")}</tr>`;
        })
        .join("");
    const montrer = (periode) => {
      $("#freq-corps").innerHTML = corps(periode);
      document.querySelectorAll("[data-per]").forEach((b) => b.setAttribute("aria-selected", b.dataset.per === periode));
    };
    document.querySelectorAll("[data-per]").forEach((b) => b.addEventListener("click", () => montrer(b.dataset.per)));
    montrer(per.vacances ? "vacances" : "scolaire");
  } else {
    $("#bloc-maintenant").hidden = true;
    $("#bloc-frequences").hidden = true;
    $("#bloc-scolaire").hidden = false;
    $("#scolaire-texte").textContent =
      l.mode === "tad"
        ? "Ligne de transport à la demande : le véhicule passe sur réservation, aux arrêts du secteur. Réservez auprès d'une agence TCM."
        : `Ligne réservée aux élèves les jours d'école${l.services_par_jour ? ", avec " + l.services_par_jour + " service" + (l.services_par_jour > 1 ? "s" : "") + " par jour" : ""}. Elle ne circule pas pendant les vacances scolaires.`;
  }

  /* ---- parcours ---- */
  const arrets = [{ nom: l.depart, min: 0 }];
  let cumul = 0;
  (l.troncons || []).forEach((t) => {
    cumul += t.minutes || 0;
    arrets.push({ nom: t.a, min: cumul });
  });
  if (arrets[arrets.length - 1].nom !== l.terminus) arrets.push({ nom: l.terminus, min: l.temps || null, inter: l.arrets ? Math.max(0, l.arrets - 2) : null });
  const corr = l.correspondances || {};
  $("#parcours").innerHTML = arrets
    .map((a, i) => {
      const bout = i === 0 || i === arrets.length - 1;
      const c = (corr[a.nom] || []).map((x) => L[x]).filter(Boolean);
      return `<li class="relative flex gap-5 pb-8 last:pb-0">
 ${i < arrets.length - 1 ? `<span class="absolute left-[11px] top-6 h-full w-[6px] " style="background:${l.couleur}"></span>` : ""}
 <span class="relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center border-[6px] bg-carte" style="border-color:${l.couleur}">${bout ? "" : ""}</span>
 <div class="min-w-0 flex-1">
 <div class="flex flex-wrap items-baseline justify-between gap-x-4">
 <p class="${bout ? "text-lg font-black" : "font-bold"}">${TCM.esc(a.nom)}</p>
 ${a.min !== null && i ? `<p class="text-sm font-bold text-doux">${a.min} min</p>` : i === 0 ? '<p class="text-sm font-bold text-doux">Départ</p>' : ""}
 </div>
 ${a.inter ? `<p class="mt-1 text-sm text-doux">${a.inter} arrêts desservis entre les deux terminus</p>` : ""}
 ${c.length ? `<div class="mt-2 flex flex-wrap items-center gap-1.5"><span class="mr-1 text-xs text-doux">Correspondances</span>${c.map((x) => TCM.picto(x, 28, true)).join("")}</div>` : ""}
 </div></li>`;
    })
    .join("");
  $("#parcours-note").textContent = (l.troncons || []).length
    ? `Temps de parcours indicatifs depuis ${l.depart}. ${l.arrets ? l.arrets + " arrêts au total." : ""}`
    : l.arrets
      ? `${l.arrets} arrêts au total.`
      : "";

  let nbPlan = null;
  const majArrets = () => {
    const e = document.getElementById("chiffre-arrets");
    if (e && nbPlan) e.textContent = nbPlan;
  };
  /* ---- plan complet publié dans AO Mobility Plan Studio (remplace le schéma simplifié) ---- */
  Promise.all([TCM.plans(), TCM.itineraires()])
    .then(([P, I]) => {
      const p = P[l.id];
      if (!p) return;
      const parCle = Object.fromEntries(I.arrets.map((a) => [a.cle, a]));
      const morceaux = TCM.lirePlan(p);
      const nbArrets = (ms) => ms.reduce((n, m) => n + (m.type === "arret" ? 1 : m.branches.reduce((k, b) => k + nbArrets(b), 0)), 0);
      const total = nbArrets(morceaux);
      const lineaire = morceaux.every((m) => m.type === "arret");
      const pas = lineaire && l.temps && total > 1 ? l.temps / (total - 1) : null;
      const SERVICES = { SUBURBAN_TRAIN: ["fa-train", "Train"], PR: ["fa-square-parking", "Parking relais"] };
      const POI = {
        AIRPORT: "fa-plane",
        HOSPITAL: "fa-hospital",
        STATION: "fa-train",
        SCHOOL: "fa-school",
        UNIVERSITY: "fa-graduation-cap",
        STADIUM: "fa-futbol",
        SHOPPING: "fa-bag-shopping",
        CITY_HALL: "fa-landmark",
        MUSEUM: "fa-building-columns",
        PARK: "fa-tree",
      };
      let rang = 0;
      const ligneArret = (x) => {
        const cle = TCM.cleArretPlan(x);
        const a = cle && parCle[cle];
        const autres = new Set([...((a && a.lignes) || []), ...TCM.correspondancesPlan(x.s)]);
        autres.delete(l.id);
        for (const x of [...autres]) if (I.lignes[x] && I.lignes[x].source === "plan " + l.id) autres.delete(x); // ligne de nuit sur le même tracé
        const corr = [...autres].filter((id) => L[id]).sort(TCM.triLignes);
        const serv = TCM.servicesPlan(x.s).filter((s) => SERVICES[s]);
        const bout = !!x.s.terminus;
        const nom = a && !a.partage ? a.nom : null;
        const t = pas != null ? Math.round(rang * pas) : null;
        rang++;
        return { nom, bout, corr, serv, t, poi: x.s.poi && POI[x.s.poi.kind], ferme: !!x.s.closed };
      };
      const liste = (ms) => {
        const out = [];
        let creux = 0;
        const vider = () => {
          if (creux) out.push({ creux });
          creux = 0;
        };
        for (const m of ms) {
          if (m.type !== "arret") {
            vider();
            out.push({ type: m.type, branches: m.branches.map(liste) });
            continue;
          }
          const r = ligneArret(m);
          if (!r.nom && !r.corr.length && !r.serv.length && !r.bout) creux++;
          else {
            vider();
            out.push(r);
          }
        }
        vider();
        return out;
      };
      const rendre = (items) =>
        items
          .map((r) => {
            if (r.creux)
              return `<li class="relative flex items-center gap-5 py-2"><span class="absolute left-[11px] top-0 h-full w-[6px]" style="background:${l.couleur}"></span><span class="w-7 shrink-0"></span><span class="text-xs text-doux">${r.creux} arrêt${r.creux > 1 ? "s" : ""}</span></li>`;
            if (r.branches)
              return `<li class="relative py-3"><p class="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-doux"><i class="fa-solid ${r.type === "boucle" ? "fa-rotate" : "fa-code-fork"} mr-2"></i>${r.type === "boucle" ? "Boucle : la ligne fait le tour dans un seul sens" : "La ligne se sépare en deux branches puis se rejoint"}</p>
              <div class="grid gap-4 sm:grid-cols-2">${r.branches.map((b, i) => `<div class="border border-trait p-4"><p class="mb-3 text-xs font-bold text-doux">${r.type === "boucle" ? (i ? "Retour" : "Aller") : "Branche " + (i + 1)}</p><ol>${rendre(b)}</ol></div>`).join("")}</div></li>`;
            const titre = r.nom || '<span class="font-normal text-doux">Arrêt sans nom</span>';
            return `<li class="relative flex gap-5 pb-5"><span class="absolute left-[11px] top-0 h-full w-[6px]" style="background:${l.couleur}"></span>
              <span class="relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center"><span class="${r.bout ? "h-7 w-7 border-[6px]" : "h-4 w-4 border-4"} block bg-carte" style="border-color:${l.couleur}"></span></span>
              <div class="min-w-0 flex-1"><div class="flex flex-wrap items-baseline justify-between gap-x-4">
                <p class="${r.bout ? "text-lg font-black uppercase" : "font-bold"}">${titre}${r.poi ? `<i class="fa-solid ${r.poi} ml-2 text-sm text-doux"></i>` : ""}${r.ferme ? ' <span class="pastille statut-interruption fond-statut ml-2">Fermé</span>' : ""}</p>
                ${r.t != null ? `<p class="chiffres text-sm font-bold text-doux">${r.t ? r.t + " min" : "Départ"}</p>` : ""}</div>
                ${r.corr.length || r.serv.length ? `<div class="mt-2 flex flex-wrap items-center gap-1.5">${r.corr.map((x) => TCM.picto(L[x], 26, true)).join("")}${r.serv.map((s) => `<span class="pastille bg-carte-2 text-doux"><i class="fa-solid ${SERVICES[s][0]}"></i>${SERVICES[s][1]}</span>`).join("")}</div>` : ""}
              </div></li>`;
          })
          .join("");
      $("#t-parcours").textContent = "Plan de la ligne";
      $("#parcours").innerHTML = rendre(liste(morceaux));
      document
        .querySelectorAll("#parcours ol > li:last-child > span:first-child, #parcours > li:last-child > span:first-child")
        .forEach((b) => (b.style.height = "0.9rem"));
      nbPlan = total;
      majArrets();
      $("#parcours-note").textContent =
        `${total} arrêts d'après le plan publié par l'AO.${pas ? " Temps de parcours indicatifs, répartis entre les arrêts." : ""}`;
    })
    .catch(() => {});
  if (l.description) {
    $("#bloc-description").hidden = false;
    $("#description").innerHTML = l.description
      .split(/\n+/)
      .map((p) => `<p>${TCM.esc(p.replace(/\*\*/g, ""))}</p>`)
      .join("");
  }

  /* ---- chiffres ---- */
  const ch = [];
  if (l.km) ch.push(["Longueur", String(l.km).replace(".", ",") + " km"]);
  if (l.temps) ch.push(["Parcours", Math.round(l.temps) + " min"]);
  if (l.arrets) ch.push(["Arrêts", `<span id="chiffre-arrets">${l.arrets}</span>`]);
  if (l.km && l.temps) ch.push(["Vitesse moy.", Math.round(l.km / (l.temps / 60)) + " km/h"]);
  const fp = l.frequences?.scolaire?.semaine?.pointe;
  if (fp) ch.push(["Pointe", fp + " min"]);
  const nbVeh = (l.vehicules || []).reduce((s, v) => s + v.nombre, 0);
  if (nbVeh) ch.push(["Véhicules", nbVeh]);
  $("#chiffres").innerHTML = ch
    .map(
      ([k, v]) =>
        `<div class="bg-carte-2 p-3"><dt class="text-xs font-bold uppercase tracking-wider text-doux">${k}</dt><dd class="mt-1 text-xl font-black">${v}</dd></div>`
    )
    .join("");
  majArrets();

  /* ---- matériel ---- */
  const nrj = {
    Electrique: ["fa-bolt", "Électrique", "text-[#12A150]"],
    Hybride: ["fa-leaf", "Hybride", "text-[#0F8B8D]"],
    Diesel: ["fa-gas-pump", "Diesel", "text-doux"],
    GNV: ["fa-fire-flame-simple", "Gaz naturel", "text-doux"],
  };
  if ((l.vehicules || []).length) {
    $("#materiel").innerHTML = l.vehicules
      .map((v) => {
        const n = nrj[v.energie] || ["fa-bus", v.energie || "", "text-doux"];
        return `<li class="flex items-center gap-3"><span class="grid h-10 w-10 shrink-0 place-items-center bg-carte-2 ${n[2]}"><i class="fa-solid ${n[0]}"></i></span><span class="min-w-0"><span class="block truncate text-sm font-bold">${TCM.esc(v.modele)}</span><span class="block text-xs text-doux">${n[1]}</span></span></li>`;
      })
      .join("");
    if (typeof l.electrique === "string" && l.electrique !== "dès l'ouverture" && !l.vehicules.every((v) => v.energie === "Electrique"))
      $("#materiel").insertAdjacentHTML(
        "beforeend",
        `<li class="bg-[#12A150]/10 p-3 text-sm text-[#0E7E3F] dark:text-[#4ADE80]"><i class="fa-solid fa-bolt mr-1"></i>Remplacés par des bus électriques Mercedes-Benz eCitaro en ${TCM.esc(l.electrique)}.</li>`
      );
  } else $("#bloc-materiel").hidden = true;

  /* ---- ce qui change ---- */
  const chg = [];
  if (l.nouvelle) chg.push("Nouvelle ligne du réseau au 5 décembre 2026.");
  if (l.origines?.length) chg.push(`Reprend ${l.origines.length > 1 ? "les anciennes lignes" : "l'ancienne ligne"} ${l.origines.join(" et ")}.`);
  if (l.ancien_terminus) chg.push(`Anciens terminus : ${l.ancien_terminus.join(" – ")}.`);
  (l.changements || [])
    .filter((c) => !/^terminus/.test(c))
    .forEach((c) => {
      const m2 = c.match(/^(\w+)\s+([\d,.]+)\s*→\s*([\d,.]+)\s*(.*)$/);
      if (m2) {
        const u = m2[4] || (m2[1] === "km" ? "km" : "");
        const v = (x) => x.replace(".", ",") + (u ? " " + u : "");
        chg.push(({ temps: "Temps de parcours", arrêts: "Nombre d'arrêts", km: "Longueur" }[m2[1]] || m2[1]) + " : " + v(m2[2]) + " → " + v(m2[3]));
      } else chg.push(c.charAt(0).toUpperCase() + c.slice(1));
    });
  if (chg.length) {
    $("#bloc-change").hidden = false;
    $("#change").innerHTML = chg
      .map((c) => `<li class="flex gap-2"><i class="fa-solid fa-circle text-[6px] mt-2 text-tcm-600 dark:text-tcm-300"></i><span>${TCM.esc(c)}</span></li>`)
      .join("");
  }

  /* ---- tarif ---- */
  TCM.json("/data/tarifs.json")
    .then((T) => {
      const tous = T.groupes.flatMap((g) => g.titres);
      const get = (n) => tous.find((t) => t.nom === n);
      const tu = get("Ticket unitaire"),
        pass = get("Pass TCM"),
        aero = get("Ticket Aéroport");
      $("#tarif").innerHTML =
        l.mode === "tramtrain" && aero
          ? `Ligne à tarification spéciale : <strong class="text-encre">Ticket Aéroport ${TCM.euros(aero.prix)}</strong>. Les abonnements ne sont pas acceptés sur cette ligne.`
          : `<strong class="text-encre">Ticket unitaire ${TCM.euros(tu.prix)}</strong>, ticket liberté 24 h ou abonnement Pass TCM à ${TCM.euros(pass.prix)} par mois.`;
    })
    .catch(() => ($("#bloc-tarif").hidden = true));

  /* ---- autres lignes de la famille ---- */
  $("#autres-famille").textContent = fam.nom ? "· " + fam.nom : "";
  $("#autres").innerHTML = (fam.lignes || [])
    .filter((x) => x !== l.id)
    .map((x) => L[x])
    .map(
      (o) => `
 <a href="${TCM.lienLigne(o.id)}" class="carte-lien flex w-64 shrink-0 items-center gap-3 p-4">${TCM.picto(o, 44)}<span class="min-w-0 text-sm"><span class="block truncate font-bold">${TCM.esc(o.depart)}</span><span class="block truncate text-doux">${TCM.esc(o.terminus)}</span></span></a>`
    )
    .join("");
})();
