/* Fiche horaire imprimable : fiche-horaire.html?l=<ligne>&sens=0|1|2 */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const [R, P, I, T, ms] = await Promise.all([
    TCM.reseau(),
    TCM.plans().catch(() => ({})),
    TCM.itineraires().catch(() => null),
    TCM.json("/data/tarifs.json").catch(() => null),
    TCM.messages().catch(() => []),
  ]);
  const L = R.lignes;
  const ids = Object.keys(L).sort(TCM.triLignes);
  let id = TCM.param("l");
  if (!L[id]) id = ids[0];
  let sens = ["0", "1", "2"].includes(TCM.param("sens")) ? TCM.param("sens") : "2";

  $("#fh-ligne").innerHTML = R.familles
    .map(
      (f) =>
        `<optgroup label="${TCM.esc(f.nom)}">${f.lignes
          .filter((x) => L[x])
          .map((x) => `<option value="${TCM.esc(x)}">${TCM.esc(L[x].nom)} · ${TCM.esc(L[x].depart)} – ${TCM.esc(L[x].terminus)}</option>`)
          .join("")}</optgroup>`
    )
    .join("");

  /* ---------- créneaux de la journée (mêmes bornes que le reste du site) ---------- */
  const PLAGES = [
    { de: "5h", a: "7h", c: "creuse", nom: "Début de matinée" },
    { de: "7h", a: "9h30", c: "pointe", nom: "Pointe du matin" },
    { de: "9h30", a: "16h30", c: "creuse", nom: "Journée" },
    { de: "16h30", a: "19h", c: "pointe", nom: "Pointe du soir" },
    { de: "19h", a: "20h30", c: "creuse", nom: "Fin de journée" },
    { de: "20h30", a: "0h", c: "soir", nom: "Soirée" },
    { de: "0h", a: "5h", c: "nuit", nom: "Nuit" },
  ];
  const JOURS = [
    ["semaine", "Lundi au vendredi"],
    ["samedi", "Samedi"],
    ["dimanche", "Dimanche et fêtes"],
  ];

  /* ---------- arrêts de la ligne, dans l'ordre ---------- */
  const nomCle = I ? Object.fromEntries(I.arrets.map((a) => [a.cle, a])) : {};
  const nomId = I ? Object.fromEntries(I.arrets.map((a) => [a.id, a])) : {};
  function parcours(l) {
    const p = P[l.id];
    if (p && I) {
      const { chemins, boucle } = TCM.parcoursPlan(p);
      const c = chemins[0];
      const n = c.length - (boucle ? 1 : 0);
      const pas = (l.temps || 0) / Math.max(1, boucle ? n : n - 1);
      const arrets = c.slice(0, boucle ? c.length - 1 : c.length).map((x, i) => {
        const k = TCM.cleArretPlan(x);
        const a = k && nomCle[k];
        const corr = new Set([...((a && a.lignes) || []), ...TCM.correspondancesPlan(x.s)]);
        corr.delete(l.id);
        for (const y of [...corr]) if (I.lignes[y] && I.lignes[y].source === "plan " + l.id) corr.delete(y);
        return { nom: a && !a.partage ? a.nom : null, t: i * pas, corr: [...corr].filter((y) => L[y]).sort(TCM.triLignes), terminus: !!x.s.terminus };
      });
      return { arrets, boucle, variantes: chemins.length > 1, total: n, precis: true };
    }
    const li = I && I.lignes[l.id];
    if (li) {
      const c = li.chemins[0];
      const arrets = c.slice(0, li.boucle ? c.length - 1 : c.length).map(([sid, t]) => {
        const a = nomId[sid];
        return { nom: a ? a.nom : "?", t, corr: ((a && a.lignes) || []).filter((y) => y !== l.id && L[y]).sort(TCM.triLignes), terminus: false };
      });
      return { arrets, boucle: li.boucle, variantes: false, total: l.arrets || null, precis: false };
    }
    return {
      arrets: [
        { nom: l.depart, t: 0, corr: [] },
        { nom: l.terminus, t: l.temps || 0, corr: [] },
      ],
      boucle: false,
      total: l.arrets || null,
      precis: false,
    };
  }

  /* ---------- rendu d'une feuille A4 ---------- */
  const contraste = (hex) => {
    const h = String(hex || "#204BFE").replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#070B1A" : "#FFFFFF";
  };
  const fmt = (m) => (m < 1 ? "0" : Math.round(m));
  function feuille(l, pc, retour, numero, nbFeuilles) {
    const m = TCM.MODES[l.mode] || TCM.MODES.bus;
    const fam = R.familles.find((f) => f.cle === l.famille) || {};
    const coul = l.couleur || "#204BFE";
    const texte = contraste(coul);
    const total = pc.arrets.length
      ? pc.arrets[pc.arrets.length - 1].t + (pc.boucle ? (l.temps || 0) / Math.max(1, pc.total || pc.arrets.length) : 0)
      : l.temps || 0;
    let arrets = pc.arrets.map((a) => ({ ...a }));
    if (retour && !pc.boucle) {
      const fin = arrets[arrets.length - 1].t;
      arrets = arrets.reverse().map((a) => ({ ...a, t: fin - a.t }));
    }
    const depart = arrets[0] ? arrets[0].nom || l.depart : l.depart;
    const direction = pc.boucle ? "Boucle" : arrets.length ? arrets[arrets.length - 1].nom || (retour ? l.depart : l.terminus) : retour ? l.depart : l.terminus;

    /* thermomètre : arrêts nommés, les autres comptés */
    const lignesThermo = [];
    let creux = 0;
    arrets.forEach((a, i) => {
      const bout = i === 0 || i === arrets.length - 1;
      if (!a.nom && !a.corr.length && !bout) {
        creux++;
        return;
      }
      if (creux) lignesThermo.push(`<li class="flex items-center gap-3 py-0.5 pl-7 text-[7pt] text-[#5b6274]">${creux} arrêt${creux > 1 ? "s" : ""}</li>`);
      creux = 0;
      lignesThermo.push(`<li class="flex items-start gap-3 py-[3px]">
        <span class="relative z-10 mt-[3px] block shrink-0 border-[3px] bg-white ${bout ? "h-[19px] w-[19px] border-[5px]" : "ml-[3px] h-[13px] w-[13px]"}" style="border-color:${coul}"></span>
        <span class="min-w-0 flex-1 leading-tight"><span class="${bout ? "text-[10pt] font-black uppercase" : "font-bold"}">${TCM.esc(a.nom || "Arrêt sans nom")}</span>
        ${
          a.corr.length
            ? `<span class="mt-[2px] flex flex-wrap gap-[2px]">${a.corr
                .slice(0, 9)
                .map((x) => TCM.picto(L[x], 14))
                .join("")}</span>`
            : ""
        }</span>
        <span class="chiffres w-9 shrink-0 text-right font-bold">${i === 0 ? "0" : fmt(a.t)}</span></li>`);
    });

    /* tableau des fréquences */
    const f = l.frequences || {};
    const tableau = (per, titre) => {
      const lignesT = JOURS.map(([j, nomJ]) => {
        const cel = PLAGES.map((pl) => {
          const v = f[per]?.[j]?.[pl.c];
          if (!v) return `<td class="border-l border-t px-1 py-2 text-center text-[#9aa1b1]">—</td>`;
          const p = Math.max(0.12, Math.min(1, 6 / v));
          const fonce = p > 0.55;
          return `<td class="fh-cellule border-l border-t px-1 py-2 text-center" style="--c:${coul};--p:${p};--t:${fonce ? texte : "#070B1A"}"><span class="chiffres text-[12pt] font-black leading-none">${v}</span><span class="text-[6.5pt] font-bold"> min</span></td>`;
        }).join("");
        return `<tr><th scope="row" class="border-t py-2 pr-2 text-left text-[7.5pt] font-bold leading-tight">${nomJ}</th>${cel}</tr>`;
      }).join("");
      return `<div class="mt-4">
        <p class="text-[7pt] font-bold uppercase tracking-[0.18em]">${titre}</p>
        <table class="mt-1.5 w-full border-collapse border-b border-r">
          <thead><tr><th class="w-[24mm]"></th>${PLAGES.map((pl) => `<th class="border-l px-0.5 pb-1 text-center align-bottom text-[6.5pt] font-bold leading-tight text-[#5b6274]">${pl.de}<br>${pl.a}</th>`).join("")}</tr></thead>
          <tbody>${lignesT}</tbody></table></div>`;
    };
    const scolaire = l.mode === "scolaire";
    const freqHtml = scolaire
      ? `<div class="mt-4 border p-4"><p class="font-bold">Service scolaire</p><p class="mt-1 text-[8.5pt]">${l.services_par_jour ? l.services_par_jour + " service" + (l.services_par_jour > 1 ? "s" : "") + " par jour d'école" : "Circule les jours d'école"}, adapté aux horaires de l'établissement. Pas de service pendant les vacances scolaires.</p></div>`
      : l.mode === "tad"
        ? `<div class="mt-4 border p-4"><p class="font-bold">Transport à la demande</p><p class="mt-1 text-[8.5pt]">Sur réservation auprès d'une agence TCM, au plus tard la veille.</p></div>`
        : tableau("scolaire", "Période scolaire") + tableau("vacances", "Vacances scolaires (zone A)");

    /* encadrés */
    const tarif = (() => {
      if (!T) return "";
      const tous = T.groupes.flatMap((g) => g.titres);
      const t = l.aeroport || l.id === "ET" ? tous.find((x) => /a[ée]roport/i.test(x.nom)) : tous.find((x) => /unitaire/i.test(x.nom));
      return t ? `${t.nom} : ${TCM.euros ? TCM.euros(t.prix) : t.prix.toFixed(2).replace(".", ",") + " €"}` : "";
    })();
    const veh = (l.vehicules || []).map((v) => v.modele).filter(Boolean);
    const alertes = (ms || []).filter((x) => x.lignes.includes(l.id) && x.type !== "information");
    const futur = l.statut && l.statut.etat === "ouverture" && TCM.date(l.statut.date) > new Date();
    const valable = futur ? l.statut.date : R.mise_en_service;
    const url = location.origin + TCM.lienLigne(l.id);
    const parLigne = {};
    arrets.forEach((a) => a.nom && a.corr.forEach((x) => (parLigne[x] = parLigne[x] || []).includes(a.nom) || parLigne[x].push(a.nom)));
    const correspondances = Object.entries(parLigne).sort((a, b) => TCM.triLignes(a[0], b[0]));

    return `<article class="feuille border border-trait" data-feuille>
      <header class="fh-bande flex items-stretch" style="background:${coul};color:${texte}">
        <div class="grid w-[38mm] shrink-0 place-items-center bg-white p-3">${TCM.picto(l, 96)}</div>
        <div class="flex min-w-0 flex-1 flex-col justify-between px-6 py-5">
          <p class="text-[7.5pt] font-bold uppercase tracking-[0.2em] opacity-80">${TCM.esc(m.nom)}${fam.nom ? " · " + TCM.esc(fam.nom) : ""}</p>
          <div class="mt-3">
            <p class="text-[8pt] font-bold uppercase tracking-[0.18em] opacity-80">${pc.boucle ? "Départ" : "De"} ${TCM.esc(depart)}</p>
            <p class="mt-1 text-[22pt] font-black uppercase leading-[0.95] tracking-[-0.01em]">${pc.boucle ? "Ligne en boucle" : "Direction<br>" + TCM.esc(direction)}</p>
          </div>
        </div>
        <div class="flex w-[44mm] shrink-0 flex-col items-end justify-between border-l px-5 py-5 text-right" style="border-color:${texte}33">
          <img src="/img/TCM-Clair.png" alt="TCM" class="h-12 w-auto ${texte === "#FFFFFF" ? "" : "invert"}">
          <div><p class="text-[7pt] font-bold uppercase tracking-[0.18em] opacity-80">Fiche horaire</p><p class="mt-1 text-[8.5pt] font-bold leading-tight">Valable à partir du<br>${TCM.dateFr(valable)}</p></div>
        </div>
      </header>

      <div class="grid flex-1 grid-cols-[74mm_1fr]">
        <section class="border-r px-6 py-5">
          <div class="flex items-baseline justify-between border-b border-[#070b1a] pb-2">
            <p class="text-[7.5pt] font-bold uppercase tracking-[0.18em]">Arrêts</p>
            <p class="text-[6.5pt] font-bold uppercase tracking-[0.12em] text-[#5b6274]">min depuis le départ</p>
          </div>
          <ol class="fh-thermo mt-2" style="--c:${coul}">${lignesThermo.join("")}</ol>
          ${pc.variantes ? `<p class="mt-3 text-[7pt] text-[#5b6274]">Une partie du parcours se fait par deux itinéraires différents ; le plan de la ligne les détaille.</p>` : ""}
        </section>

        <section class="flex flex-col px-6 py-5">
          <div class="grid grid-cols-3 border-b border-[#070b1a] pb-3">
            <div><p class="text-[6.5pt] font-bold uppercase tracking-[0.16em] text-[#5b6274]">Durée</p><p class="chiffres text-[18pt] font-black leading-none">${Math.round(total)}<span class="text-[8pt]"> min</span></p></div>
            <div><p class="text-[6.5pt] font-bold uppercase tracking-[0.16em] text-[#5b6274]">Arrêts</p><p class="chiffres text-[18pt] font-black leading-none">${pc.total || l.arrets || "—"}</p></div>
            <div><p class="text-[6.5pt] font-bold uppercase tracking-[0.16em] text-[#5b6274]">Longueur</p><p class="chiffres text-[18pt] font-black leading-none">${l.km ? String(l.km).replace(".", ",") : "—"}<span class="text-[8pt]"> km</span></p></div>
          </div>
          <p class="mt-4 text-[7.5pt] font-bold uppercase tracking-[0.18em]">Un passage toutes les…</p>
          ${freqHtml}
          <p class="mt-2 text-[6.5pt] leading-snug text-[#5b6274]">Intervalle moyen entre deux passages sur chaque tranche horaire. « — » : pas de service. Les jours fériés suivent la ligne « Dimanche et fêtes ».</p>

          ${
            correspondances.length
              ? `<p class="mt-5 text-[7.5pt] font-bold uppercase tracking-[0.18em]">Correspondances</p>
          <ul class="mt-2 grid grid-cols-2 gap-x-5 gap-y-1.5 border-t pt-2">${correspondances
            .slice(0, 24)
            .map(
              ([x, noms]) =>
                `<li class="flex items-start gap-2 text-[7.5pt] leading-tight">${TCM.picto(L[x], 15)}<span class="min-w-0">${TCM.esc(noms.slice(0, 3).join(", "))}${noms.length > 3 ? "…" : ""}</span></li>`
            )
            .join("")}</ul>`
              : ""
          }
          <div class="mt-auto grid grid-cols-[1fr_auto] gap-5 border-t border-[#070b1a] pt-4">
            <ul class="space-y-1.5 text-[8pt] leading-snug">
              ${tarif ? `<li><span class="font-bold">Titre :</span> ${TCM.esc(tarif)}</li>` : ""}
              ${veh.length ? `<li><span class="font-bold">Véhicules :</span> ${TCM.esc([...new Set(veh)].join(", "))}${l.electrique ? " · électriques" : ""}</li>` : ""}
              <li><span class="font-bold">Accessibilité :</span> véhicules à plancher bas avec rampe pour fauteuil roulant.</li>
              ${futur ? `<li class="font-bold">Mise en service le ${TCM.dateFr(l.statut.date)}.</li>` : ""}
              ${alertes.length ? `<li><span class="font-bold">Info trafic :</span> ${TCM.esc(alertes[0].titre)}</li>` : ""}
              <li class="text-[#5b6274]">Temps de parcours indicatifs, selon la circulation. Avant de partir : info trafic et itinéraire sur le site TCM.</li>
            </ul>
            <div class="flex w-[27mm] flex-col items-center text-center"><div class="fh-qr grid h-[25mm] w-[25mm] place-items-center bg-white" data-url="${TCM.esc(url)}"></div><p class="mt-1 text-[6pt] leading-tight text-[#5b6274]">La ligne en direct</p></div>
          </div>
        </section>
      </div>

      <footer class="flex items-center justify-between border-t px-6 py-3 text-[6.5pt] text-[#5b6274]">
        <span class="font-bold uppercase tracking-[0.16em] text-[#070b1a]">Transport Clermont Métropole</span>
        <span>${TCM.esc(location.host + TCM.lienLigne(l.id))}</span>
        <span class="chiffres">${numero} / ${nbFeuilles}</span>
      </footer>
    </article>`;
  }

  /* ---------- QR code (bibliothèque chargée à la demande) ---------- */
  let qrLib = null;
  const chargerQr = () =>
    (qrLib =
      qrLib ||
      new Promise((ok) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        s.onload = () => ok(window.QRCode || null);
        s.onerror = () => ok(null);
        document.head.appendChild(s);
      }));
  async function qrs() {
    const Q = await chargerQr();
    document.querySelectorAll(".fh-qr").forEach((el) => {
      if (!Q) return el.parentNode.remove();
      el.innerHTML = "";
      new Q(el, { text: el.dataset.url, width: 92, height: 92, colorDark: "#070B1A", colorLight: "#FFFFFF", correctLevel: Q.CorrectLevel.M });
    });
  }

  /* ---------- mise à l'échelle à l'écran ---------- */
  const echelle = () => {
    document.querySelectorAll(".fh-zoom").forEach((z) => {
      const f = z.firstElementChild;
      const dispo = Math.min(z.parentNode.clientWidth, 900);
      const k = Math.min(1, dispo / f.offsetWidth);
      z.style.transform = `scale(${k})`;
      z.style.width = f.offsetWidth + "px";
      z.parentNode.style.height = f.offsetHeight * k + "px";
      z.parentNode.style.width = f.offsetWidth * k + "px";
    });
  };

  function rendre() {
    const l = L[id];
    const pc = parcours(l);
    const sensListe = pc.boucle || sens === "0" ? [false] : sens === "1" ? [true] : [false, true];
    $("#fh-pile").innerHTML = sensListe
      .map((r, i) => `<div class="fh-cadre"><div class="fh-zoom">${feuille(l, pc, r, i + 1, sensListe.length)}</div></div>`)
      .join("");
    $("#fh-ligne").value = id;
    document.querySelectorAll("[data-sens]").forEach((b) => {
      b.setAttribute("aria-pressed", b.dataset.sens === sens);
      b.disabled = pc.boucle && b.dataset.sens !== "0";
    });
    $("#fh-fiche").href = TCM.lienLigne(id);
    document.title = `Fiche horaire ${l.nom} — TCM`;
    history.replaceState(null, "", `?l=${encodeURIComponent(id)}${sens !== "2" ? "&sens=" + sens : ""}`);
    requestAnimationFrame(echelle);
    qrs();
  }
  $("#fh-ligne").addEventListener("change", (e) => {
    id = e.target.value;
    rendre();
  });
  document.querySelectorAll("[data-sens]").forEach((b) =>
    b.addEventListener("click", () => {
      sens = b.dataset.sens;
      rendre();
    })
  );
  $("#fh-imprimer").addEventListener("click", () => window.print());
  addEventListener("resize", echelle);
  rendre();
})();
