/* Agences */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const [A, R] = await Promise.all([TCM.json("/data/agences.json"), TCM.reseau()]);
  const L = R.lignes;
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const fmt = (p) =>
    p
      ? p
          .replace(/:00/g, "h")
          .replace(/:(\d\d)/g, "h$1")
          .replace("-", " – ")
      : "Fermé";
  const rendre = async () => {
    const etats = await Promise.all(A.agences.map((a) => TCM.etatAgence(a)));
    const n = etats.filter((e) => e.ouvert).length;
    $("#ag-resume").innerHTML =
      `<span class="${n ? "statut-ok" : "statut-futur"} point-statut mr-2"></span>${n} agence${n > 1 ? "s" : ""} ouverte${n > 1 ? "s" : ""} en ce moment`;
    const aujourd = (new Date().getDay() + 6) % 7;
    $("#agences").innerHTML = A.agences
      .map((a, i) => {
        const e = etats[i];
        const lignes = new Set(a.lignes || []);
        if (a.arret)
          Object.values(L).forEach((l) => {
            if (l.depart === a.arret || l.terminus === a.arret || (l.troncons || []).some((t) => t.de === a.arret || t.a === a.arret)) lignes.add(l.id);
          });
        const ls = [...lignes].filter((x) => L[x]).sort(TCM.triLignes);
        return `<article class="flex flex-col bg-carte p-6">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-xl uppercase leading-tight">${TCM.esc(a.nom)}</h2>
          <img src="${a.image}" alt="" class="h-12 w-12 object-contain" loading="lazy" onerror="this.remove()">
        </div>
        <p class="${e.classe} mt-3 flex items-center gap-2 text-sm font-bold ${e.etat === "ferme" ? "text-doux" : "texte-statut"}"><span class="point-statut"></span>${e.texte}</p>
        <table class="mt-5 w-full text-sm"><tbody>${JOURS.map((j, k) => {
          const p = a.horaires[String((k + 1) % 7)];
          return `<tr class="border-t border-trait ${k === aujourd ? "font-bold" : "text-doux"}"><th scope="row" class="py-1.5 text-left font-[inherit]">${j}</th><td class="chiffres py-1.5 text-right">${fmt(p)}</td></tr>`;
        }).join("")}</tbody></table>
        ${a.premier_du_mois ? `<p class="mt-3 text-xs text-doux">Le 1er du mois : ${fmt(a.premier_du_mois)}</p>` : ""}
        ${ls.length ? `<div class="mt-auto pt-6"><p class="text-[11px] font-bold uppercase tracking-[0.16em] text-doux">Lignes</p><div class="mt-2 flex flex-wrap gap-1">${ls.map((x) => TCM.picto(L[x], 28, true)).join("")}</div></div>` : ""}
      </article>`;
      })
      .join("");
  };
  await rendre();
  setInterval(rendre, 60000);
})();
