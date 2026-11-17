/* Tarifs */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const T = await TCM.json("/data/tarifs.json");
  $("#tarifs-maj").textContent = TCM.dateFr(T.maj);
  $("#tarifs").innerHTML = T.groupes
    .map(
      (g, i) => `
    <section aria-labelledby="g${i}">
      <div class="flex items-end justify-between gap-4 border-b border-encre pb-4">
        <div><p class="index-section">${String(i + 1).padStart(2, "0")}</p><h2 id="g${i}" class="mt-3 text-3xl uppercase">${TCM.esc(g.titre)}</h2></div>
        <i class="fa-solid ${g.icone} text-3xl text-tcm-600 dark:text-tcm-300"></i>
      </div>
      <ul>${g.titres
        .map(
          (t) => `
        <li class="grid gap-3 border-b border-trait py-6 md:grid-cols-12 md:items-center">
          <div class="md:col-span-4"><p class="text-xl font-black uppercase">${TCM.esc(t.nom)}</p>${t.vedette ? '<p class="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-tcm-600 dark:text-tcm-300">Le plus choisi</p>' : ""}</div>
          <p class="text-doux md:col-span-5">${TCM.esc(t.detail)}<span class="mt-2 flex flex-wrap gap-1.5">${(t.inclus || []).map((x) => `<span class="pastille border border-trait text-doux">${TCM.esc(x)}</span>`).join("")}</span></p>
          <p class="md:col-span-3 md:text-right"><span class="chiffres text-4xl font-black">${TCM.euros(t.prix).replace(" €", "")}</span><span class="ml-1 text-lg font-bold">€</span><span class="text-sm text-doux">${TCM.esc(t.unite)}</span></p>
        </li>`
        )
        .join("")}</ul>
    </section>`
    )
    .join("");
  $("#tarifs-notes").innerHTML = [
    ...T.notes.map(
      (n) =>
        `<div class="bg-carte p-6"><i class="fa-solid fa-hand-holding-heart text-xl text-tcm-600 dark:text-tcm-300"></i><p class="mt-3 text-doux">${TCM.esc(n)}</p></div>`
    ),
    `<div class="bg-carte p-6"><i class="fa-solid fa-plane text-xl text-tcm-600 dark:text-tcm-300"></i><p class="mt-3 text-doux">Le tram-train ET vers l'aéroport a sa propre tarification : seul le ticket Aéroport y est valable.</p></div>`,
  ].join("");
})();
