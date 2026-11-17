/* Vélos en libre service : stations (feuille Google ou data/velos.json), disponibilité estimée, carte, tarifs */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const [V, R, I, T] = await Promise.all([TCM.velos(), TCM.reseau(), TCM.itineraires().catch(() => null), TCM.json("/data/tarifs.json").catch(() => null)]);
  const L = R.lignes;
  const parNom = I ? Object.fromEntries(I.arrets.map((a) => [TCM.cleNom(a.nom), a])) : {};
  $("#v-nb").textContent = V.length;

  const prochaine = V.filter((v) => v.statut === "a venir" && v.ouverture)
    .map((v) => v.ouverture)
    .sort()[0];
  const ouvertes = V.filter((v) => v.statut === "ouverte").length;
  if (prochaine && !ouvertes) {
    const j = Math.ceil((TCM.date(prochaine) - new Date()) / 86400000);
    $("#v-ouverture").innerHTML = `<i class="fa-solid fa-bicycle"></i>Ouverture le ${TCM.dateFr(prochaine)} <span class="chiffres text-white/60">J-${j}</span>`;
  } else if (ouvertes)
    $("#v-ouverture").innerHTML = `<span class="statut-ok point-statut"></span>${ouvertes} station${ouvertes > 1 ? "s" : ""} ouverte${ouvertes > 1 ? "s" : ""}`;
  else $("#v-ouverture").remove();

  /* tarifs */
  const g = T && T.groupes.find((x) => /v[ée]lo/i.test(x.titre));
  if (g) {
    const prix = (p) => p.toFixed(2).replace(".", ",") + " €";
    const ticket = g.titres.find((t) => /ticket/i.test(t.nom));
    if (ticket) $("#v-prix").textContent = prix(ticket.prix);
    $("#v-tarifs").innerHTML = g.titres
      .map(
        (t) => `<div class="bg-carte p-6"><p class="text-sm font-bold uppercase tracking-[0.12em] text-doux">${TCM.esc(t.nom)}</p>
        <p class="chiffres mt-3 text-4xl font-black">${prix(t.prix)}<span class="text-base font-bold text-doux">${TCM.esc(t.unite || "")}</span></p>
        <p class="mt-2 text-sm text-doux">${TCM.esc(t.detail || "")}</p></div>`
      )
      .join("");
  } else $("#v-tarifs").closest("section").remove();

  /* stations */
  const rendre = async () => {
    const now = new Date();
    $("#v-heure").textContent = "mis à jour à " + now.getHours() + "h" + String(now.getMinutes()).padStart(2, "0");
    const cartes = await Promise.all(
      V.map(async (v) => {
        const a = parNom[TCM.cleNom(v.arret || v.nom)];
        const lignes = a ? a.lignes.filter((x) => L[x]).sort(TCM.triLignes) : [];
        let etat;
        if (v.statut === "ouverte") {
          const d = await TCM.dispoVelo(v, now);
          const cls = d.etat === "vide" ? "statut-interruption" : d.etat === "peu" ? "statut-perturbation" : "statut-ok";
          etat = `<div class="${cls} mt-5 grid grid-cols-3 border-t border-encre pt-4 text-center">
            <div><p class="chiffres texte-statut text-3xl font-black leading-none">${d.mecaniques}</p><p class="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-doux">mécaniques</p></div>
            <div><p class="chiffres texte-statut text-3xl font-black leading-none">${d.electriques}</p><p class="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-doux">électriques</p></div>
            <div><p class="chiffres text-3xl font-black leading-none">${d.libres}</p><p class="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-doux">${v.virtuelle ? "places" : "bornes libres"}</p></div></div>`;
        } else
          etat = `<div class="${v.statut === "fermee" ? "statut-interruption" : "statut-futur"} mt-5 border-t border-encre pt-4"><p class="texte-statut text-lg font-black uppercase leading-tight">${v.statut === "fermee" ? "Station fermée" : v.ouverture ? "Ouverture le " + TCM.dateFr(v.ouverture) : "Ouverture prochaine"}</p><p class="mt-1 text-xs text-doux">${v.places} places</p></div>`;
        return `<li class="flex flex-col bg-carte p-6">
          <div class="flex items-start gap-4">
            <span class="chiffres grid h-11 w-11 shrink-0 place-items-center bg-tcm-950 text-lg font-black text-white dark:bg-white dark:text-tcm-950">${v.numero}</span>
            <div class="min-w-0"><h3 class="text-xl uppercase leading-tight">${a ? `<a href="/arret.html?a=${encodeURIComponent(a.id)}" class="hover:text-tcm-600">${TCM.esc(v.nom)}</a>` : TCM.esc(v.nom)}</h3>
            <p class="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-doux"><i class="fa-solid ${v.virtuelle ? "fa-location-crosshairs" : "fa-charging-station"} mr-1.5"></i>${v.virtuelle ? "Station virtuelle" : "Station à bornes"}</p></div>
          </div>
          ${v.description ? `<p class="mt-3 text-sm text-doux">${TCM.esc(v.description)}</p>` : ""}
          ${
            lignes.length
              ? `<div class="mt-4 flex flex-wrap gap-1">${lignes
                  .slice(0, 10)
                  .map((x) => TCM.picto(L[x], 24, true))
                  .join("")}</div>`
              : ""
          }
          <div class="mt-auto">${etat}</div>
        </li>`;
      })
    );
    $("#v-stations").innerHTML = cartes.join("");
  };
  await rendre();
  setInterval(rendre, 60000);

  /* carte des stations */
  try {
    const [Lf, G] = await Promise.all([TCM.leaflet(), TCM.geo()]);
    const pts = V.map((v) => {
      const a = parNom[TCM.cleNom(v.arret || v.nom)];
      return a && G.parId[a.id] ? { v, pos: G.parId[a.id] } : null;
    }).filter(Boolean);
    if (!pts.length) throw new Error("aucune position");
    const carte = Lf.map("v-carte", { scrollWheelZoom: false });
    TCM.fondCarte(Lf, carte);
    for (const x of ["A", "B", "ET"])
      if (G.traces[x] && L[x])
        Lf.polyline(
          G.traces[x].pts.map((p) => p.pos),
          { color: L[x].couleur, weight: 4, opacity: 0.55 }
        ).addTo(carte);
    for (const { v, pos } of pts)
      Lf.marker(pos, {
        icon: Lf.divIcon({
          className: "",
          html: `<span style="display:grid;place-items:center;width:30px;height:30px;background:#070B1A;color:#fff;font:900 14px/1 CitroenType,system-ui;border:3px solid #10B4FF">${v.numero}</span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      })
        .bindTooltip(`${v.numero}. ${TCM.esc(v.nom)}`, { direction: "top", offset: [0, -14] })
        .addTo(carte);
    carte.fitBounds(Lf.latLngBounds(pts.map((p) => p.pos)).pad(0.25));
  } catch (e) {
    $("#v-carte").remove();
  }
})();
