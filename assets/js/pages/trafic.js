/* Info trafic */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const [R, ms] = await Promise.all([TCM.reseau(), TCM.messages().catch(() => [])]);
  const L = R.lignes;
  const now = new Date();
  $("#tr-heure").textContent = now.getHours() + "h" + String(now.getMinutes()).padStart(2, "0");
  const graves = ms.filter((m) => m.type !== "information");
  $("#tr-resume").innerHTML = graves.length
    ? `${graves.length} message${graves.length > 1 ? "s" : ""} de travaux ou de perturbation en cours. Le trafic est normal sur les autres lignes.`
    : "Le trafic est normal sur l'ensemble du réseau.";

  let filtreType = "",
    filtreLigne = TCM.param("l") || "";
  const types = [
    ["", "Tous"],
    ...Object.entries(TCM.TYPES)
      .filter(([k]) => ms.some((m) => m.type === k))
      .map(([k, t]) => [k, t.nom]),
  ];
  $("#tr-types").innerHTML = types.map(([k, n]) => `<button class="onglet !py-1.5" role="tab" data-type="${k}" aria-selected="${!k}">${n}</button>`).join("");

  const rendre = () => {
    const liste = ms.filter((m) => (!filtreType || m.type === filtreType) && (!filtreLigne || m.lignes.includes(filtreLigne) || m.lignes.includes("TCM")));
    $("#tr-messages").innerHTML =
      (filtreLigne
        ? `<div class="flex items-center gap-3 bg-carte-2 p-3 text-sm">${L[filtreLigne] ? TCM.picto(L[filtreLigne], 32) : ""}<span>Messages pour la ligne <strong>${TCM.esc(filtreLigne)}</strong></span><button data-raz class="lien ml-auto">Tout afficher</button></div>`
        : "") +
      (liste
        .map((m) => {
          const t = TCM.TYPES[m.type];
          const pictos = m.lignes.includes("TCM")
            ? '<span class="pastille bg-carte-2 text-doux"><img src="/img/TCM.png" alt="" class="h-4">Tout le réseau</span>'
            : m.lignes
                .map((id) => (L[id] ? TCM.picto(L[id], 34, true) : `<span class="pastille bg-carte-2 text-doux">Ancienne ligne ${TCM.esc(id)}</span>`))
                .join("");
          return `<article id="${m.id}" class="${t.classe} carte bande-statut scroll-mt-28 p-5 sm:p-6">
 <div class="flex flex-wrap items-center gap-2"><span class="pastille fond-statut"><i class="fa-solid ${t.icone}"></i>${t.nom}</span><span class="ml-auto text-xs text-doux">Du ${TCM.dateFr(m.debut, { heure: true })} au ${TCM.dateFr(m.fin, { heure: true })}</span></div>
 <h3 class="mt-3 text-xl leading-snug">${TCM.esc(m.titre)}</h3>
 ${m.detail ? `<p class="mt-2 text-doux">${TCM.esc(m.detail)}</p>` : ""}
 <div class="mt-4 flex flex-wrap items-center gap-1.5">${pictos}</div>
 ${m.lien ? `<a href="${TCM.esc(m.lien)}" class="lien mt-3 inline-block text-sm">En savoir plus <i class="fa-solid fa-arrow-right"></i></a>` : ""}
 </article>`;
        })
        .join("") ||
        `<div class="carte flex items-center gap-4 p-6"><span class="statut-ok fond-statut grid h-12 w-12 place-items-center text-xl"><i class="fa-solid fa-circle-check"></i></span><div><p class="font-black">Aucun message</p><p class="text-sm text-doux">Le trafic est normal${filtreLigne ? " sur cette ligne" : ""}.</p></div></div>`);
    document.querySelectorAll("[data-type]").forEach((b) => b.setAttribute("aria-selected", b.dataset.type === filtreType));
    document.querySelectorAll("[data-filtre-ligne]").forEach((b) => b.classList.toggle("ring-2", b.dataset.filtreLigne === filtreLigne));
  };
  $("#tr-types").addEventListener("click", (e) => {
    const b = e.target.closest("[data-type]");
    if (b) {
      filtreType = b.dataset.type;
      rendre();
    }
  });
  $("#tr-messages").addEventListener("click", (e) => {
    if (e.target.closest("[data-raz]")) {
      filtreLigne = "";
      history.replaceState(null, "", location.pathname);
      rendre();
    }
  });

  $("#tr-lignes").innerHTML = R.familles
    .filter((f) => !["edu", "demande"].includes(f.cle))
    .map(
      (f) => `
 <div><p class="mb-2 text-xs font-bold uppercase tracking-wider text-doux">${TCM.esc(f.nom)}</p>
 <div class="flex flex-wrap gap-1.5">${f.lignes
   .map((id) => {
     const e = TCM.etatLigne(L[id], ms);
     return `<button data-filtre-ligne="${id}" class="${e.classe} relative ring-tcm-500 ring-offset-2 ring-offset-carte transition hover:-translate-y-0.5" title="${TCM.esc(L[id].nom + " : " + e.texte)}">${TCM.picto(L[id], 34)}<span class="point-statut absolute -right-1 -top-1 !h-3 !w-3 border-2 border-carte"></span></button>`;
   })
   .join("")}</div></div>`
    )
    .join("");
  $("#tr-lignes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filtre-ligne]");
    if (!b) return;
    filtreLigne = filtreLigne === b.dataset.filtreLigne ? "" : b.dataset.filtreLigne;
    history.replaceState(null, "", filtreLigne ? "?l=" + filtreLigne : location.pathname);
    rendre();
    window.scrollTo({ top: $("#t-messages").getBoundingClientRect().top + scrollY - 100, behavior: "smooth" });
  });
  rendre();
  if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth" }), 100);
})();
