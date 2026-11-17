/* Liste des lignes, par famille */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const [R, ms] = await Promise.all([TCM.reseau(), TCM.messages().catch(() => [])]);
  const L = R.lignes;
  $("#nb").textContent = Object.keys(L).length;

  const freqPointe = (l) => {
    const f = l.frequences?.scolaire?.semaine;
    if (!f) return null;
    return f.pointe || f.creuse || f.nuit || null;
  };
  const carte = (l) => {
    const e = TCM.etatLigne(l, ms);
    const fp = freqPointe(l);
    const m = TCM.MODES[l.mode] || TCM.MODES.bus;
    const badges = [
      l.nouvelle ? '<span class="pastille bg-tcm-50 text-tcm-700 dark:bg-tcm-900/60 dark:text-tcm-200">Nouvelle</span>' : "",
      l.electrique ? '<span class="pastille bg-[#12A150]/10 text-[#0E7E3F] dark:text-[#4ADE80]"><i class="fa-solid fa-bolt"></i>Électrique</span>' : "",
      l.aeroport ? '<span class="pastille bg-carte-2 text-doux"><i class="fa-solid fa-plane"></i>Aéroport</span>' : "",
    ].join("");
    const etat =
      e.classe === "statut-ok" && !e.messages.length
        ? ""
        : `<span class="${e.classe} pastille fond-statut"><span class="point-statut !h-2 !w-2"></span>${TCM.esc(e.texte)}</span>`;
    const meta =
      l.mode === "scolaire"
        ? l.services_par_jour
          ? `${l.services_par_jour} service${l.services_par_jour > 1 ? "s" : ""} par jour d'école`
          : "Jours d'école"
        : l.mode === "tad"
          ? "Sur réservation"
          : fp
            ? `Toutes les ${fp} min${l.mode === "nuit" ? " la nuit" : " en heure de pointe"}`
            : "";
    return `<a href="${TCM.lienLigne(l.id)}" data-ligne="${TCM.esc(l.id)}" class="carte-lien group flex min-w-0 items-center gap-4 p-4">
 ${TCM.picto(l, 52)}
 <div class="min-w-0 flex-1">
 <p class="truncate font-bold leading-snug">${TCM.esc(l.depart)}</p>
 <p class="truncate font-bold leading-snug"><i class="fa-solid fa-arrow-right-arrow-left mr-1 text-[11px] text-doux"></i>${TCM.esc(l.terminus)}</p>
 <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-doux"><span><i class="fa-solid ${m.icone} mr-1"></i>${m.nom}</span>${meta ? `<span>${meta}</span>` : ""}</p>
 ${badges || etat ? `<div class="mt-2 flex flex-wrap gap-1.5">${etat}${badges}</div>` : ""}
 </div>
 <i class="fa-solid fa-chevron-right text-doux transition group-hover:translate-x-0.5 group-hover:text-tcm-600"></i>
 </a>`;
  };

  $("#familles-nav").innerHTML =
    `<button class="onglet whitespace-nowrap" role="tab" aria-selected="true" data-f="">Toutes</button>` +
    R.familles.map((f) => `<button class="onglet whitespace-nowrap" role="tab" aria-selected="false" data-f="${f.cle}">${TCM.esc(f.nom)}</button>`).join("");
  $("#familles").innerHTML = R.familles
    .map(
      (f) => `
 <section id="${f.cle}" data-famille="${f.cle}" class="scroll-mt-40">
 <div class="mb-6 flex items-center gap-4">
 <span class="grid h-12 w-12 shrink-0 place-items-center text-lg text-white" style="background:${f.couleur}"><i class="fa-solid ${f.icone}"></i></span>
 <div><h2 class="text-2xl">${TCM.esc(f.nom)}</h2><p class="text-sm text-doux">${TCM.esc(f.accroche)} · ${f.lignes.length} ligne${f.lignes.length > 1 ? "s" : ""}</p></div>
 </div>
 <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">${f.lignes.map((id) => carte(L[id])).join("")}</div>
 </section>`
    )
    .join("");

  let famille = location.hash.slice(1);
  const appliquer = () => {
    const q = $("#filtre").value;
    const ok = q.trim() ? new Set(TCM.chercher(R, q).map((r) => r.ligne.id)) : null;
    let visibles = 0;
    document.querySelectorAll("[data-famille]").forEach((s) => {
      let n = 0;
      s.querySelectorAll("[data-ligne]").forEach((a) => {
        const v = !ok || ok.has(a.dataset.ligne);
        a.hidden = !v;
        n += v;
      });
      s.hidden = !n || (famille && s.dataset.famille !== famille && !q.trim());
      if (!s.hidden) visibles += n;
    });
    $("#aucun").hidden = !!visibles;
    document.querySelectorAll("#familles-nav [data-f]").forEach((b) => b.setAttribute("aria-selected", b.dataset.f === (q.trim() ? "" : famille)));
  };
  $("#familles-nav").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]");
    if (!b) return;
    famille = b.dataset.f;
    $("#filtre").value = "";
    history.replaceState(null, "", famille ? "#" + famille : location.pathname);
    appliquer();
    window.scrollTo({ top: document.querySelector("#familles").offsetTop - 150, behavior: "smooth" });
  });
  $("#filtre").addEventListener("input", appliquer);
  if (TCM.param("q")) $("#filtre").value = TCM.param("q");
  if (!R.familles.some((f) => f.cle === famille)) famille = "";
  appliquer();
})();
