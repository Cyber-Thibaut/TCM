/* Page d'un arrêt : arret.html?a=<identifiant> — prochains départs de toutes les lignes */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const [I, R, ms] = await Promise.all([TCM.itineraires(), TCM.reseau(), TCM.messages().catch(() => [])]);
  const L = R.lignes;
  const A = Object.fromEntries(I.arrets.map((a) => [a.id, a]));
  const a = A[TCM.param("a")];
  TCM.brancherArret($("#autre-arret"), $("#autre-arret-liste"), (x) => (location.href = "/arret.html?a=" + encodeURIComponent(x.id)));
  if (!a) {
    $("#arret-nom").textContent = "Arrêt introuvable";
    $("#arret-inconnu").hidden = false;
    return;
  }
  document.title = `${a.nom} : prochains départs — TCM`;
  $("#arret-nom").textContent = a.nom;
  $("#arret-depuis").href = "/itineraire.html?de=" + encodeURIComponent(a.id);
  $("#arret-vers").href = "/itineraire.html?a=" + encodeURIComponent(a.id);
  $("#arret-carte").href = "/carte.html?arret=" + encodeURIComponent(a.id);
  TCM.velos()
    .then(async (V) => {
      const v = V.find((x) => TCM.cleNom(x.arret || x.nom) === TCM.cleNom(a.nom));
      if (!v) return;
      let txt = v.statut === "fermee" ? "station fermée" : v.statut === "a venir" ? "ouverture le " + TCM.dateFr(v.ouverture) : "";
      if (v.statut === "ouverte") {
        const d = await TCM.dispoVelo(v);
        txt = `${d.velos} vélo${d.velos > 1 ? "s" : ""} disponible${d.velos > 1 ? "s" : ""}`;
      }
      $("#arret-lignes").insertAdjacentHTML(
        "afterend",
        `<p class="mt-4 flex items-center gap-2 text-sm font-bold text-white"><i class="fa-solid fa-bicycle text-ciel"></i>Station vélos n° ${v.numero} · ${TCM.esc(txt)} <a href="/velos.html" class="font-normal text-white/60 underline">en savoir plus</a></p>`
      );
    })
    .catch(() => {});
  TCM.json("/data/agences.json")
    .then(async (AG) => {
      const ag = AG.agences.filter((x) => x.arret === a.nom);
      if (!ag.length) return;
      const etats = await Promise.all(ag.map((x) => TCM.etatAgence(x)));
      $("#arret-lignes").insertAdjacentHTML(
        "afterend",
        ag
          .map(
            (x, i) =>
              `<p class="${etats[i].classe} mt-4 flex items-center gap-2 text-sm font-bold text-white"><span class="point-statut"></span>Agence TCM · ${TCM.esc(etats[i].texte)} <a href="/agences.html" class="font-normal text-white/60 underline">horaires</a></p>`
          )
          .join("")
      );
    })
    .catch(() => {});

  /* lignes qui passent ici, avec la position de l'arrêt sur leur parcours */
  const passages = [];
  for (const [lid, li] of Object.entries(I.lignes)) {
    const c = li.chemins.find((ch) => ch.some(([sid]) => sid === a.id));
    if (!c || !L[lid]) continue;
    const k = c.findIndex(([sid]) => sid === a.id);
    const fin = c[c.length - 1][1];
    const dir = (j) => (I.arrets.find((x) => x.id === c[j][0]) || {}).nom || "";
    if (li.boucle) passages.push({ lid, s: 0, t: c[k][1], dir: "Ligne en boucle", fin });
    else {
      if (k < c.length - 1) passages.push({ lid, s: 0, t: c[k][1], dir: dir(c.length - 1), fin });
      if (k > 0) passages.push({ lid, s: 1, t: fin - c[k][1], dir: dir(0), fin });
    }
  }
  const scolaires = Object.values(L).filter((l) => l.mode === "scolaire" && (l.depart === a.nom || l.terminus === a.nom));
  const ids = [...new Set([...passages.map((p) => p.lid), ...scolaires.map((l) => l.id), ...a.lignes])].filter((x) => L[x]).sort(TCM.triLignes);
  $("#arret-lignes").innerHTML = ids.map((x) => TCM.picto(L[x], 40, true)).join("");

  const heure = (t) => t.getHours() + "h" + String(t.getMinutes()).padStart(2, "0");
  const rendre = async () => {
    const now = new Date();
    $("#arret-heure").textContent = heure(now);
    const lignes = await Promise.all(
      passages
        .sort((x, y) => TCM.triLignes(x.lid, y.lid) || x.s - y.s)
        .map(async (p) => {
          const l = L[p.lid];
          const ps = await TCM.passages(l, p.s, p.t, now, 2);
          const etat = TCM.etatLigne(l, ms);
          const alerte = etat.messages.filter((m) => m.type !== "information")[0];
          let droite;
          if (!TCM.circule(l, now)) droite = `<p class="text-sm font-bold text-doux">${TCM.esc(etat.texte)}</p>`;
          else if (!ps.length) droite = `<p class="text-sm font-bold text-doux">Plus de passage aujourd'hui</p>`;
          else
            droite = `<div class="flex items-end gap-6 text-right">
              <div><p class="chiffres text-3xl font-black leading-none text-tcm-600 dark:text-tcm-300">${TCM.delai(ps[0], now)}</p><p class="chiffres mt-1 text-xs font-bold text-doux">${heure(ps[0])}</p></div>
              ${ps[1] ? `<div class="hidden sm:block"><p class="chiffres text-xl font-black leading-none">${TCM.delai(ps[1], now)}</p><p class="chiffres mt-1 text-xs font-bold text-doux">${heure(ps[1])}</p></div>` : ""}
            </div>`;
          return `<li class="flex items-center gap-4 py-4">
            ${TCM.picto(l, 44, true)}
            <div class="min-w-0 flex-1">
              <p class="truncate font-bold"><span class="font-normal text-doux">Vers</span> ${TCM.esc(p.dir)}</p>
              <p class="mt-0.5 truncate text-xs text-doux">${(TCM.MODES[l.mode] || TCM.MODES.bus).nom}${l.frequences ? "" : ""}${alerte ? ` · <span class="${TCM.TYPES[alerte.type].classe} texte-statut font-bold">${TCM.esc(alerte.titre)}</span>` : ""}</p>
            </div>
            ${droite}
          </li>`;
        })
    );
    const sco = await Promise.all(
      scolaires.map(async (l) => {
        const e = await TCM.etatScolaire(l, now);
        return `<li class="flex items-center gap-4 py-4">${TCM.picto(l, 44, true)}<div class="min-w-0 flex-1"><p class="font-bold">Service scolaire</p><p class="mt-0.5 text-xs text-doux">${TCM.esc(e.titre)}${e.texte ? " · " + TCM.esc(e.texte) : ""}</p></div></li>`;
      })
    );
    $("#departs").innerHTML = lignes.join("") + sco.join("") || '<li class="py-8 text-doux">Aucune ligne régulière ne dessert cet arrêt.</li>';
  };
  if (new Date() < TCM.date(R.mise_en_service))
    $("#departs").insertAdjacentHTML(
      "beforebegin",
      `<p class="statut-futur fond-statut mt-4 p-3 text-sm"><i class="fa-solid fa-circle-info mr-2"></i>Départs du nouveau réseau, en service à partir du ${TCM.dateFr(R.mise_en_service, { jour: true })}.</p>`
    );
  await rendre();
  setInterval(rendre, 20000);

  /* mini-carte */
  try {
    const [Lf, G] = await Promise.all([TCM.leaflet(), TCM.geo()]);
    const pos = G.parId[a.id];
    if (!pos) return $("#arret-mini").remove();
    const carte = Lf.map($("#arret-mini"), { zoomControl: false, attributionControl: true, scrollWheelZoom: false }).setView(pos, 15);
    TCM.fondCarte(Lf, carte);
    for (const x of ids) {
      const tr = G.traces[x];
      if (tr)
        Lf.polyline(
          tr.pts.map((p) => p.pos),
          { color: L[x].couleur, weight: 4, opacity: 0.85 }
        ).addTo(carte);
    }
    Lf.circleMarker(pos, { radius: 9, color: "#070B1A", weight: 4, fillColor: "#fff", fillOpacity: 1 }).addTo(carte);
  } catch (e) {
    $("#arret-mini").remove();
  }
})();
