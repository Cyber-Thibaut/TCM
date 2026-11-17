/* Parkings relais : disponibilité estimée, rafraîchie chaque minute */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const [PR, R] = await Promise.all([TCM.parkings(), TCM.reseau()]);
  const L = R.lignes;
  const rendre = async () => {
    const now = new Date();
    $("#pr-heure").textContent = now.getHours() + "h" + String(now.getMinutes()).padStart(2, "0");
    const cartes = await Promise.all(
      PR.map(async (p) => {
        const o = p.statut === "ouvert" ? await TCM.occupation(p, now) : { libres: 0, taux: 0, etat: p.statut };
        const lignes = Object.values(L).filter(
          (l) => l.depart === p.arret || l.terminus === p.arret || (l.troncons || []).some((t) => t.de === p.arret || t.a === p.arret)
        );
        const cls =
          p.statut === "a venir"
            ? "statut-futur"
            : p.statut === "ferme" || o.etat === "complet"
              ? "statut-interruption"
              : o.etat === "presque"
                ? "statut-perturbation"
                : "statut-ok";
        const libelle =
          p.statut === "a venir"
            ? "Bientôt"
            : p.statut === "ferme"
              ? "Fermé"
              : o.etat === "complet"
                ? "Complet"
                : o.etat === "presque"
                  ? "Presque complet"
                  : "Places disponibles";
        const chiffre =
          p.statut === "ouvert"
            ? `<p class="chiffres texte-statut text-6xl font-black leading-none">${o.libres}</p><p class="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-doux">places libres sur ${p.places}</p>`
            : `<p class="text-2xl font-black uppercase leading-tight texte-statut">${p.statut === "a venir" ? (p.ouverture ? "Ouverture le " + TCM.dateFr(p.ouverture) : "Ouverture prochaine") : "Fermé"}</p><p class="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-doux">${p.places} places</p>`;
        return `<article class="${cls} flex flex-col bg-carte">
          ${p.image ? `<div class="grid h-40 place-items-center border-b border-trait bg-carte-2"><img src="${TCM.esc(p.image)}" alt="" class="h-28 w-28 object-contain" loading="lazy" onerror="this.parentNode.remove()"></div>` : `<div class="grid h-40 place-items-center border-b border-trait bg-carte-2"><span class="grid h-20 w-20 place-items-center bg-tcm-600 text-4xl font-black text-white">P+R</span></div>`}
          <div class="flex flex-1 flex-col p-6">
            <h2 class="text-2xl uppercase">${TCM.esc(p.nom)}</h2>
            <p class="mt-2 text-sm text-doux">${TCM.esc(p.description)}</p>
            <div class="mt-6 flex items-end justify-between border-t border-encre pt-4">
              <div>${chiffre}</div>
              <span class="pastille fond-statut">${libelle}</span>
            </div>
            ${p.statut === "ouvert" ? `<div class="mt-4 h-1.5 bg-carte-2"><div class="h-full" style="width:${Math.round(o.taux * 100)}%;background:var(--s)"></div></div>` : ""}
            ${p.tarif ? `<p class="mt-4 text-sm"><i class="fa-solid fa-ticket mr-2 text-doux"></i>${TCM.esc(p.tarif)}</p>` : ""}
            <div class="mt-6 flex flex-wrap gap-2 text-xs text-doux">${p.recharge ? '<span class="pastille border border-trait"><i class="fa-solid fa-charging-station"></i>Recharge</span>' : ""}${p.surveille ? '<span class="pastille border border-trait"><i class="fa-solid fa-video"></i>Surveillé</span>' : ""}</div>
            ${
              lignes.length
                ? `<div class="mt-auto pt-6"><p class="text-[11px] font-bold uppercase tracking-[0.16em] text-doux">Lignes en correspondance</p><div class="mt-2 flex flex-wrap gap-1">${lignes
                    .sort((a, b) => TCM.triLignes(a.id, b.id))
                    .map((l) => TCM.picto(l, 32, true))
                    .join("")}</div></div>`
                : ""
            }
          </div>
        </article>`;
      })
    );
    $("#parkings").innerHTML = cartes.join("");
  };
  await rendre();
  setInterval(rendre, 60000);
})();
