/* Page d'accueil */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  TCM.brancherRecherche($("#recherche"), $("#recherche-resultats"));

  /* ---- héros : itinéraire ou recherche de ligne ---- */
  const deH = $("#heros-de"),
    aH = $("#heros-a");
  const allerIti = () => {
    if (!deH.dataset.arret) return deH.focus();
    if (!aH.dataset.arret) return aH.focus();
    location.href = `/itineraire.html?de=${deH.dataset.arret}&a=${aH.dataset.arret}`;
  };
  TCM.brancherArret(deH, $("#heros-de-liste"), () => aH.focus());
  TCM.brancherArret(aH, $("#heros-a-liste"), () => deH.dataset.arret && allerIti());
  $("#heros-iti").addEventListener("submit", (e) => {
    e.preventDefault();
    allerIti();
  });
  $("#heros-onglets").addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]");
    if (!b) return;
    document.querySelectorAll("#heros-onglets [data-t]").forEach((x) => {
      x.setAttribute("aria-selected", x === b);
      $("#" + x.dataset.t).hidden = x !== b;
    });
    $("#" + b.dataset.t)
      .querySelector("input")
      .focus();
  });

  const R = await TCM.reseau();
  const L = R.lignes;
  const now = new Date();
  const avant = now < TCM.date(R.mise_en_service);
  const d = TCM.date(R.mise_en_service);
  const court = String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear();
  $("#heros-etiquette").textContent = (avant ? "Nouveau réseau le " : "Nouveau réseau depuis le ") + court;
  $("#heros-raccourcis").innerHTML = ["A", "B", "ET", "10", "3", "BEN1"]
    .filter((id) => L[id])
    .map((id) => TCM.picto(L[id], 34, true))
    .join("");
  $("#heros-heure").textContent = now.getHours() + "h" + String(now.getMinutes()).padStart(2, "0");

  /* ---- info trafic ---- */
  const ms = await TCM.messages().catch(() => []);
  const graves = ms.filter((m) => m.type !== "information");
  const touchees = new Set(graves.flatMap((m) => m.lignes).filter((x) => x !== "TCM"));
  const nb = Object.keys(L).length;
  $("#heros-etat").innerHTML = graves.length
    ? `<span class="statut-perturbation point-statut mr-2 align-middle"></span>${touchees.size} ligne${touchees.size > 1 ? "s" : ""} en travaux ou perturbée${touchees.size > 1 ? "s" : ""}`
    : '<span class="statut-ok point-statut mr-2 align-middle"></span>Trafic normal sur tout le réseau';
  $("#trafic-resume").textContent = graves.length
    ? `${touchees.size} ligne${touchees.size > 1 ? "s" : ""} concernée${touchees.size > 1 ? "s" : ""} par des travaux ou perturbations. Trafic normal sur les autres lignes.`
    : `Trafic normal sur les ${nb} lignes du réseau.`;
  $("#trafic-liste").innerHTML =
    ms
      .slice(0, 3)
      .map((m) => {
        const t = TCM.TYPES[m.type];
        const pictos = m.lignes.includes("TCM")
          ? '<span class="pastille bg-carte-2 text-doux">Tout le réseau</span>'
          : m.lignes
              .filter((id) => L[id])
              .map((id) => TCM.picto(L[id], 28))
              .join("");
        return `<li class="bg-carte"><a href="/trafic.html#${m.id}" class="${t.classe} bande-statut flex h-full flex-col gap-3 p-5 transition-colors hover:bg-carte-2">
      <span class="flex items-center gap-2"><span class="pastille fond-statut"><i class="fa-solid ${t.icone}"></i>${t.nom}</span><span class="ml-auto flex gap-1">${pictos}</span></span>
      <span class="font-bold leading-snug">${TCM.esc(m.titre)}</span>
      <span class="mt-auto text-xs text-doux">Jusqu'au ${TCM.dateFr(m.fin)}</span></a></li>`;
      })
      .join("") || '<li class="bg-carte p-5 text-sm text-doux lg:col-span-3">Aucun message en cours.</li>';

  /* ---- nouveau réseau ---- */
  const cartes = [
    { id: "A", titre: "Tram A", texte: "Des Vergnes à la clinique Saint-Paul, sur un parcours redessiné." },
    { id: "ET", titre: "Tram-train ET", texte: "La gare reliée à l'aéroport en 28 minutes, avec un tarif dédié." },
    { id: "10", titre: "BHNS", texte: "Les lignes 5, 7, 8 et 10 à haut niveau de service ; la 10 en électrique." },
    { id: "BEN1", titre: "Nuit", texte: "Quatre lignes BEN pour rentrer à toute heure, jusqu'à Pont-du-Château." },
  ].filter((c) => L[c.id]);
  $("#nouveau-cartes").innerHTML = cartes
    .map((c, i) => {
      const l = L[c.id];
      const futur = l.statut.etat === "ouverture" && TCM.date(l.statut.date) > now;
      return `<a href="${TCM.lienLigne(c.id)}" class="apparait group flex min-h-64 flex-col border-b border-r border-white/15 p-6 transition-colors hover:bg-tcm-600">
      <div class="flex items-start justify-between"><span class="chiffres text-xs font-bold text-white/40">0${i + 1}</span>${TCM.picto(l, 48)}</div>
      <h3 class="mt-auto pt-10 text-2xl uppercase">${c.titre}</h3>
      <p class="mt-2 text-sm text-white/65 group-hover:text-white/90">${c.texte}</p>
      <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] ${futur ? "text-ciel" : "text-white/50"} group-hover:text-white">${futur ? "Ouverture " + TCM.dateFr(l.statut.date) : "En service"} <i class="fa-solid fa-arrow-right ml-1"></i></p></a>`;
    })
    .join("");
  $("#nouveau-etapes").innerHTML = R.etapes
    .map((e) => {
      const passe = TCM.date(e.date) <= now;
      return `<li class="apparait border-t-2 ${passe ? "border-ciel" : "border-white/25"} pt-5">
      <p class="chiffres text-sm font-bold ${passe ? "text-ciel" : "text-white/60"}">${TCM.dateFr(e.date)}</p>
      <p class="mt-2 text-lg font-black uppercase">${TCM.esc(e.titre)}</p><p class="mt-2 text-sm text-white/60">${TCM.esc(e.texte)}</p></li>`;
    })
    .join("");

  /* ---- familles : une rangée par famille ---- */
  $("#nb-lignes").textContent = nb;
  $("#familles").innerHTML = R.familles
    .map(
      (f, i) => `
    <a href="/reseau.html#${f.cle}" class="apparait group grid items-center gap-4 border-b border-trait py-5 transition-colors hover:bg-carte md:grid-cols-12 md:px-3">
      <span class="chiffres hidden text-xs font-bold text-doux md:col-span-1 md:block">${String(i + 1).padStart(2, "0")}</span>
      <span class="md:col-span-4"><span class="flex items-center gap-3"><span class="h-4 w-4 shrink-0" style="background:${f.couleur}"></span><span class="text-lg font-black uppercase leading-tight">${TCM.esc(f.nom)}</span></span><span class="mt-1 block text-sm text-doux md:pl-7">${TCM.esc(f.accroche)}</span></span>
      <span class="flex flex-wrap gap-1 md:col-span-6">${f.lignes
        .slice(0, 16)
        .map((id) => TCM.picto(L[id], 30))
        .join(
          ""
        )}${f.lignes.length > 16 ? `<span class="grid h-[30px] place-items-center bg-carte-2 px-2 text-xs font-bold text-doux">+${f.lignes.length - 16}</span>` : ""}</span>
      <i class="fa-solid fa-arrow-right hidden justify-self-end text-doux transition-transform group-hover:translate-x-1 group-hover:text-tcm-600 md:col-span-1 md:block"></i>
    </a>`
    )
    .join("");
  $("#chiffre-elec").textContent = R.chiffres.electriques;
  $("#chiffre-tram").textContent = R.chiffres.tram;

  /* ---- parkings relais ---- */
  TCM.json("/data/parkings.json")
    .then(async (P) => {
      const rows = await Promise.all(
        P.parkings.map(async (p) => {
          const o = await TCM.occupation(p);
          const lignes = Object.values(L).filter(
            (l) => l.depart === p.arret || l.terminus === p.arret || (l.troncons || []).some((t) => t.de === p.arret || t.a === p.arret)
          );
          const cls = o.etat === "complet" ? "statut-interruption" : o.etat === "presque" ? "statut-perturbation" : "statut-ok";
          return `<li class="flex items-center gap-4 border-b border-trait py-4"><div class="min-w-0 flex-1"><p class="font-bold uppercase">${TCM.esc(p.nom)}</p><div class="mt-2 flex flex-wrap gap-1">${lignes
            .slice(0, 6)
            .map((l) => TCM.picto(l, 24, true))
            .join("")}</div></div>
        <div class="${cls} text-right"><p class="chiffres texte-statut text-4xl font-black leading-none">${o.libres}</p><p class="mt-1 text-[11px] font-bold uppercase tracking-wider text-doux">places libres</p></div></li>`;
        })
      );
      $("#pr-liste").innerHTML = rows.join("");
    })
    .catch(() => {});

  /* ---- agences ---- */
  TCM.json("/data/agences.json")
    .then(async (A) => {
      const etats = await Promise.all(A.agences.map((a) => TCM.etatAgence(a)));
      const n = etats.filter((e) => e.ouvert).length;
      $("#ag-ouvertes").textContent = n + " / " + A.agences.length + " ouvertes";
      $("#ag-ouvertes").className = "pastille shrink-0 whitespace-nowrap " + (n ? "fond-statut statut-ok" : "bg-carte-2 text-doux");
      $("#ag-liste").innerHTML = A.agences
        .map(
          (a, i) =>
            `<li class="flex items-center gap-3 border-b border-trait py-3 sm:odd:pr-4 sm:even:pl-4"><span class="${etats[i].ouvert ? "statut-ok" : "statut-futur"} point-statut"></span><span class="min-w-0"><span class="block truncate text-sm font-bold">${TCM.esc(a.nom)}</span><span class="block text-xs text-doux">${etats[i].texte}</span></span></li>`
        )
        .join("");
    })
    .catch(() => {});

  /* ---- actualités (WordPress du réseau) ---- */
  TCM.config()
    .then(async (c) => {
      if (!c.actualites_wordpress) return;
      const r = await fetch(`${c.actualites_wordpress}?_embed&per_page=3${c.actualites_categorie ? "&categories=" + c.actualites_categorie : ""}`);
      if (!r.ok) return;
      const posts = await r.json();
      if (!posts.length) return;
      $("#actus").innerHTML = posts
        .map((p) => {
          const img = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
          const txt = document.createElement("div");
          txt.innerHTML = p.excerpt?.rendered || "";
          const titre = document.createElement("div");
          titre.innerHTML = p.title.rendered;
          return `<a href="/actualites.html?id=${p.id}" class="group block">
        <div class="aspect-[16/10] overflow-hidden bg-carte-2">${img ? `<img src="${img}" alt="" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy">` : ""}</div>
        <p class="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-doux">${TCM.dateFr(p.date)}</p>
        <h3 class="mt-2 text-xl leading-snug group-hover:text-tcm-600">${TCM.esc(titre.textContent)}</h3><p class="mt-2 line-clamp-3 text-sm text-doux">${TCM.esc(txt.textContent.trim())}</p></a>`;
        })
        .join("");
      $("#bloc-actus").hidden = false;
    })
    .catch(() => {});

  TCM.observer();
})();
