/* Carte en direct : tracés des lignes sur Clermont-Ferrand et véhicules en mouvement (positions estimées) */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  let Lf, G;
  const [R, I] = await Promise.all([TCM.reseau(), TCM.itineraires()]);
  try {
    [Lf, G] = await Promise.all([TCM.leaflet(), TCM.geo()]);
  } catch (e) {
    $("#c-carte").innerHTML = '<p class="grid h-full place-items-center p-8 text-center text-doux">La carte ne peut pas se charger pour le moment.</p>';
    return;
  }
  const L = R.lignes;
  const A = Object.fromEntries(I.arrets.map((a) => [a.id, a]));
  const carte = Lf.map("c-carte", { zoomControl: true, preferCanvas: false }).setView([45.7786, 3.1], 13);
  if (new Date() < TCM.date(R.mise_en_service))
    document
      .querySelector("aside")
      .insertAdjacentHTML(
        "afterbegin",
        `<p class="statut-futur fond-statut px-5 py-2 text-xs font-bold"><i class="fa-solid fa-circle-info mr-2"></i>Aperçu du nouveau réseau, en service à partir du ${TCM.dateFr(R.mise_en_service, { jour: true })}.</p>`
      );
  TCM.fondCarte(Lf, carte);
  carte.zoomControl.setPosition("topright");

  /* ---------- tracés ---------- */
  const avecTrace = Object.keys(G.traces)
    .filter((x) => L[x])
    .sort(TCM.triLignes);
  const visibles = new Set(avecTrace);
  const voulu = TCM.param("l");
  if (voulu && L[voulu]) {
    visibles.clear();
    visibles.add(voulu);
  }
  const couchesTrace = {};
  const tout = [];
  for (const x of avecTrace) {
    const pts = G.traces[x].pts.map((p) => p.pos);
    if (!["car", "nuit"].includes(L[x].mode)) tout.push(...pts);
    const nuit = L[x].mode === "nuit";
    couchesTrace[x] = Lf.polyline(pts, {
      color: L[x].couleur,
      weight: L[x].mode === "tram" || L[x].mode === "tramtrain" ? 6 : 4,
      opacity: 0.9,
      dashArray: nuit ? "6 6" : null,
    });
  }
  if (tout.length && !voulu && !TCM.param("arret")) carte.fitBounds(Lf.latLngBounds(tout).pad(-0.15));

  /* ---------- arrêts ---------- */
  const coucheArrets = Lf.layerGroup();
  const marqueurs = {};
  for (const a of I.arrets) {
    const p = G.parId[a.id];
    if (!p || a.partage) continue;
    const m = Lf.circleMarker(p, { radius: 5, color: "#070B1A", weight: 2, fillColor: "#fff", fillOpacity: 1 });
    m.bindTooltip(a.nom, { direction: "top", offset: [0, -6] });
    m.bindPopup(
      () =>
        `<p style="font-weight:900;text-transform:uppercase;font-size:14px">${TCM.esc(a.nom)}</p>
         <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px">${a.lignes
           .filter((x) => L[x])
           .map((x) => TCM.picto(L[x], 22))
           .join("")}</div>
         <p style="margin-top:10px"><a href="/arret.html?a=${encodeURIComponent(a.id)}" style="font-weight:700">Prochains départs →</a></p>`
    );
    marqueurs[a.id] = m;
    m.addTo(coucheArrets);
  }

  /* ---------- vélos en libre service ---------- */
  const coucheVelos = Lf.layerGroup().addTo(carte);
  TCM.velos()
    .then((V) => {
      const parNom = Object.fromEntries(I.arrets.map((a) => [TCM.cleNom(a.nom), a]));
      for (const v of V) {
        const a = parNom[TCM.cleNom(v.arret || v.nom)];
        const p = a && G.parId[a.id];
        if (!p) continue;
        Lf.marker(p, {
          icon: Lf.divIcon({
            className: "",
            html: `<span style="display:grid;place-items:center;width:24px;height:24px;background:#070B1A;color:#10B4FF;border:2px solid #10B4FF;font-size:12px"><i class="fa-solid fa-bicycle"></i></span>`,
            iconSize: [24, 24],
            iconAnchor: [-6, 30],
          }),
          zIndexOffset: 800,
        })
          .bindPopup("…")
          .on("popupopen", async (e) => {
            const contenu = async () => {
              let txt = v.statut === "ouverte" ? "" : v.statut === "fermee" ? "Station fermée" : "Ouverture le " + TCM.dateFr(v.ouverture);
              if (v.statut === "ouverte") {
                const d = await TCM.dispoVelo(v);
                txt = `${d.velos} vélo${d.velos > 1 ? "s" : ""} (${d.electriques} électrique${d.electriques > 1 ? "s" : ""}) · ${d.libres} place${d.libres > 1 ? "s" : ""} libre${d.libres > 1 ? "s" : ""}`;
              }
              return `<p style="font-weight:900;text-transform:uppercase">Vélos · ${TCM.esc(v.nom)}</p><p style="font-size:12px;margin-top:4px">${v.virtuelle ? "Station virtuelle" : "Station à bornes"} · ${txt}</p><p style="margin-top:8px"><a href="/velos.html" style="font-weight:700">Les vélos en libre service →</a></p>`;
            };
            e.popup.setContent(await contenu());
          })
          .addTo(coucheVelos);
      }
    })
    .catch(() => {});
  document.getElementById("c-voir-velos").addEventListener("change", (e) => (e.target.checked ? coucheVelos.addTo(carte) : carte.removeLayer(coucheVelos)));

  /* ---------- véhicules ---------- */
  const coucheVehicules = Lf.layerGroup().addTo(carte);
  const vehicules = new Map();
  const departsCache = {};
  const departsDu = async (l, s, jour) => {
    const k = l.id + s + TCM.iso(jour);
    if (!departsCache[k]) departsCache[k] = await TCM.departs(l, s, jour);
    return departsCache[k];
  };
  const texteIcone = (l) => (l.id.length > 4 ? l.id.slice(0, 4) : l.id);
  const icone = (l) => {
    const h = String(l.couleur || "#204BFE").replace("#", "");
    const lum = (0.2126 * parseInt(h.substr(0, 2), 16) + 0.7152 * parseInt(h.substr(2, 2), 16) + 0.0722 * parseInt(h.substr(4, 2), 16)) / 255;
    return Lf.divIcon({
      className: "",
      html: `<span class="carte-vehicule" style="background:${l.couleur};color:${lum > 0.6 ? "#070B1A" : "#fff"}">${TCM.esc(texteIcone(l))}</span>`,
      iconSize: null,
      iconAnchor: [13, 10],
    });
  };
  const nomPoint = (tr, i) => {
    for (let k = i; k >= 0 && k < tr.pts.length; k++) {
      const a = tr.pts[k].id && A[tr.pts[k].id];
      if (a && !a.partage) return { nom: a.nom, t: tr.pts[k].t };
    }
    return null;
  };
  const nomPointArriere = (tr, i) => {
    for (let k = i; k >= 0; k--) {
      const a = tr.pts[k].id && A[tr.pts[k].id];
      if (a && !a.partage) return { nom: a.nom, t: tr.pts[k].t };
    }
    return null;
  };

  async function animer() {
    const now = new Date();
    $("#c-heure").textContent = now.getHours() + "h" + String(now.getMinutes()).padStart(2, "0");
    const vus = new Set();
    let lignesActives = 0;
    for (const x of avecTrace) {
      const l = L[x];
      const tr = G.traces[x];
      if (!visibles.has(x) || !TCM.circule(l, now)) continue;
      const T = tr.temps || tr.pts[tr.pts.length - 1].t;
      let n = 0;
      for (const s of tr.boucle ? [0] : [0, 1]) {
        for (const k of [-1, 0]) {
          const jour = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k);
          const deps = await departsDu(l, s, jour);
          const minutes = (now - jour) / 60000;
          for (const dep of deps) {
            const ecoule = minutes - dep;
            if (ecoule < 0 || ecoule > T) continue;
            const t = s === 0 ? ecoule : T - ecoule;
            const { pos, i } = TCM.surTrace(tr, t);
            const cle = `${x}|${s}|${TCM.iso(jour)}|${dep}`;
            vus.add(cle);
            n++;
            let v = vehicules.get(cle);
            if (!v) {
              v = Lf.marker(pos, { icon: icone(l), keyboard: false, zIndexOffset: l.mode === "tram" ? 500 : 0 });
              v.bindPopup("");
              v.on("popupopen", () => v.setPopupContent(v._texte()));
              vehicules.set(cle, v);
              v.addTo(coucheVehicules);
            } else v.setLatLng(pos);
            v._texte = () => {
              const prochain = s === 0 ? nomPoint(tr, i) : nomPointArriere(tr, i - 1);
              const dir = s === 0 ? nomPoint(tr, tr.pts.length - 1) : nomPointArriere(tr, 0);
              const dans = prochain ? Math.max(0, Math.round(Math.abs(prochain.t - t))) : null;
              return `<div style="display:flex;gap:10px;align-items:center">${TCM.picto(l, 32)}<div><p style="font-weight:900">${tr.boucle ? "Ligne en boucle" : "Vers " + TCM.esc(dir ? dir.nom : "")}</p>
                ${prochain ? `<p style="font-size:12px;opacity:.75">Prochain arrêt : ${TCM.esc(prochain.nom)} · ${dans ? dans + " min" : "à l'approche"}</p>` : ""}</div></div>
                <p style="margin-top:8px;font-size:11px;opacity:.6">Position estimée</p>
                <p style="margin-top:6px"><a href="${TCM.lienLigne(x)}" style="font-weight:700">Fiche de la ligne →</a></p>`;
            };
          }
        }
      }
      if (n) lignesActives++;
    }
    for (const [cle, v] of vehicules)
      if (!vus.has(cle)) {
        coucheVehicules.removeLayer(v);
        vehicules.delete(cle);
      }
    $("#c-vehicules").textContent = vus.size;
    $("#c-lignes").textContent = lignesActives;
  }

  /* ---------- panneau ---------- */
  const appliquer = () => {
    for (const x of avecTrace) {
      if (visibles.has(x)) couchesTrace[x].addTo(carte);
      else carte.removeLayer(couchesTrace[x]);
    }
    document.querySelectorAll("[data-c-ligne]").forEach((b) => b.setAttribute("aria-pressed", visibles.has(b.dataset.cLigne)));
    animer();
  };
  $("#c-familles").innerHTML = R.familles
    .map((f) => {
      const ls = f.lignes.filter((x) => G.traces[x] && L[x]);
      if (!ls.length) return "";
      return `<div class="border-t border-trait py-3"><button type="button" class="flex w-full items-center gap-2 text-left text-xs font-bold uppercase tracking-[0.14em] text-doux hover:text-encre" data-c-famille="${f.cle}"><span class="h-3 w-3" style="background:${f.couleur}"></span>${TCM.esc(f.nom)}</button>
        <div class="mt-2 flex flex-wrap gap-1">${ls
          .map(
            (x) =>
              `<button type="button" data-c-ligne="${x}" class="opacity-30 transition aria-pressed:opacity-100" aria-label="${TCM.esc(L[x].nom)}" title="${TCM.esc(L[x].nom)}">${TCM.picto(L[x], 30)}</button>`
          )
          .join("")}</div></div>`;
    })
    .join("");
  $("#c-familles").addEventListener("click", (e) => {
    const b = e.target.closest("[data-c-ligne]");
    const f = e.target.closest("[data-c-famille]");
    if (b) {
      const x = b.dataset.cLigne;
      if (visibles.size === avecTrace.length) {
        visibles.clear();
        visibles.add(x);
      } else if (visibles.has(x)) visibles.delete(x);
      else visibles.add(x);
      if (!visibles.size) avecTrace.forEach((y) => visibles.add(y));
    } else if (f) {
      const fam = R.familles.find((y) => y.cle === f.dataset.cFamille);
      visibles.clear();
      fam.lignes.filter((y) => G.traces[y]).forEach((y) => visibles.add(y));
    } else return;
    appliquer();
  });
  $("#c-toutes").addEventListener("click", () => {
    avecTrace.forEach((y) => visibles.add(y));
    appliquer();
  });
  $("#c-voir-vehicules").addEventListener("change", (e) => (e.target.checked ? coucheVehicules.addTo(carte) : carte.removeLayer(coucheVehicules)));
  const majArrets = () => {
    const ok = $("#c-voir-arrets").checked && carte.getZoom() >= 13;
    if (ok) coucheArrets.addTo(carte);
    else carte.removeLayer(coucheArrets);
  };
  $("#c-voir-arrets").addEventListener("change", majArrets);
  carte.on("zoomend", majArrets);
  TCM.brancherArret($("#c-arret"), $("#c-arret-liste"), (a) => {
    const p = G.parId[a.id];
    if (!p) return;
    carte.setView(p, 16);
    if (marqueurs[a.id]) marqueurs[a.id].openPopup();
  });
  const arretVoulu = TCM.param("arret");
  if (arretVoulu && G.parId[arretVoulu]) {
    carte.setView(G.parId[arretVoulu], 16);
    setTimeout(() => marqueurs[arretVoulu] && marqueurs[arretVoulu].openPopup(), 300);
  } else if (voulu && G.traces[voulu]) carte.fitBounds(Lf.latLngBounds(G.traces[voulu].pts.map((p) => p.pos)).pad(0.1));
  appliquer();
  majArrets();
  setInterval(animer, 2000);
})();
