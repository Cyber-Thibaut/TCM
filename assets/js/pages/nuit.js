/* Réseau de nuit */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const R = await TCM.reseau();
  const ls = Object.values(R.lignes)
    .filter((l) => l.famille === "nocturne")
    .sort((a, b) => TCM.triLignes(a.id, b.id));
  const jours = [
    ["semaine", "Nuits de semaine"],
    ["samedi", "Nuit du samedi"],
    ["dimanche", "Nuit du dimanche"],
  ];
  $("#nuit").innerHTML = ls
    .map((l) => {
      const f = l.frequences?.scolaire || {};
      return `<a href="${TCM.lienLigne(l.id)}" class="group flex flex-col bg-carte p-6 transition-colors hover:bg-carte-2">
        <div class="flex items-center gap-4">${TCM.picto(l, 64)}<div class="min-w-0"><p class="text-2xl font-black uppercase">${TCM.esc(l.nom)}</p><p class="text-sm text-doux">${l.mode === "tram" || l.vehicules.some((v) => /Citadis/.test(v.modele)) ? "Assurée par le tram" : TCM.esc((TCM.MODES[l.mode] || {}).nom || "")}</p></div></div>
        <p class="mt-6 border-t border-encre pt-4 text-lg font-bold">${TCM.esc(l.depart)}${l.depart === l.terminus ? ' <span class="text-doux">· ligne circulaire</span>' : ` <i class="fa-solid fa-arrow-right-arrow-left mx-1 text-sm text-doux"></i> ${TCM.esc(l.terminus)}`}</p>
        <table class="mt-4 w-full text-sm"><tbody>${jours.map(([j, n]) => `<tr class="border-t border-trait"><th scope="row" class="py-2 text-left font-normal text-doux">${n}</th><td class="chiffres py-2 text-right font-bold">${f[j]?.nuit ? "toutes les " + f[j].nuit + " min" : "—"}</td></tr>`).join("")}</tbody></table>
        <p class="mt-auto pt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-tcm-600 group-hover:underline dark:text-tcm-300">Voir la ligne <i class="fa-solid fa-arrow-right ml-1"></i></p>
      </a>`;
    })
    .join("");
})();
