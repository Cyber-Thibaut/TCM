/* Parkings relais : disponibilité estimée, rafraîchie chaque minute */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const [P, R] = await Promise.all([TCM.json("/data/parkings.json"), TCM.reseau()]);
  const L = R.lignes;
  const rendre = async () => {
    const now = new Date();
    $("#pr-heure").textContent = now.getHours() + "h" + String(now.getMinutes()).padStart(2, "0");
    const cartes = await Promise.all(
      P.parkings.map(async (p) => {
        const o = await TCM.occupation(p, now);
        const lignes = Object.values(L).filter(
          (l) => l.depart === p.arret || l.terminus === p.arret || (l.troncons || []).some((t) => t.de === p.arret || t.a === p.arret)
        );
        const cls = o.etat === "complet" ? "statut-interruption" : o.etat === "presque" ? "statut-perturbation" : "statut-ok";
        const libelle = o.etat === "complet" ? "Complet" : o.etat === "presque" ? "Presque complet" : "Places disponibles";
        return `<article class="${cls} flex flex-col bg-carte">
          <div class="grid h-40 place-items-center border-b border-trait bg-carte-2"><img src="${p.image}" alt="" class="h-28 w-28 object-contain" loading="lazy" onerror="this.parentNode.remove()"></div>
          <div class="flex flex-1 flex-col p-6">
            <h2 class="text-2xl uppercase">${TCM.esc(p.nom)}</h2>
            <p class="mt-2 text-sm text-doux">${TCM.esc(p.description)}</p>
            <div class="mt-6 flex items-end justify-between border-t border-encre pt-4">
              <div><p class="chiffres texte-statut text-6xl font-black leading-none">${o.libres}</p><p class="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-doux">places libres sur ${p.places}</p></div>
              <span class="pastille fond-statut">${libelle}</span>
            </div>
            <div class="mt-4 h-1.5 bg-carte-2"><div class="h-full" style="width:${Math.round(o.taux * 100)}%;background:var(--s)"></div></div>
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
