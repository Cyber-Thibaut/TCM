/* Le nouveau réseau : ce qui change au 5 décembre 2026 */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const R = await TCM.reseau();
  const L = R.lignes;
  const debut = TCM.date(R.mise_en_service);
  const now = new Date();
  $("#nr-surtitre").textContent = (now < debut ? "À partir du " : "Depuis le ") + TCM.dateFr(R.mise_en_service, { jour: true });

  const compte = () => {
    const ms = debut - new Date();
    if (ms <= 0) {
      $("#compte").innerHTML =
        '<span class="pastille bg-ciel/15 px-4 py-2 text-sm text-ciel"><i class="fa-solid fa-circle-check"></i>Le nouveau réseau est en service</span>';
      return;
    }
    const j = Math.floor(ms / 864e5),
      h = Math.floor(ms / 36e5) % 24,
      mn = Math.floor(ms / 6e4) % 60;
    $("#compte").innerHTML = [
      [j, "jours"],
      [h, "heures"],
      [mn, "minutes"],
    ]
      .map(
        ([v, t]) =>
          `<div class="min-w-24 border border-white/20 px-5 py-4 text-center"><p class="chiffres text-5xl font-black">${v}</p><p class="text-xs uppercase tracking-wider text-white/60">${t}</p></div>`
      )
      .join("");
  };
  compte();
  setInterval(compte, 30000);

  const ls = Object.values(L);
  const chiffres = [
    ["Lignes", ls.length, "fa-route"],
    ["Nouvelles lignes", R.nouvelles.length, "fa-star"],
    ["Lignes électriques", R.chiffres.electriques, "fa-bolt"],
    ["Tram et tram-train", R.chiffres.tram, "fa-train-tram"],
  ];
  $("#nr-chiffres").innerHTML = chiffres
    .map(
      ([t, v, i]) =>
        `<div class="border-b border-r border-trait px-4 py-8 first:pl-0 lg:border-b-0 lg:last:border-r-0"><dt class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-doux"><i class="fa-solid ${i} text-tcm-600 dark:text-tcm-300"></i>${t}</dt><dd class="chiffres mt-3 text-5xl font-black">${v}</dd></div>`
    )
    .join("");

  $("#nr-etapes").innerHTML = R.etapes
    .map((e, i) => {
      const passe = TCM.date(e.date) <= now;
      return `<li class="carte relative overflow-hidden p-6"><span class="absolute right-5 top-4 text-6xl font-black text-carte-2">${i + 1}</span>
 <p class="pastille ${passe ? "fond-statut statut-ok" : "bg-tcm-50 text-tcm-700 dark:bg-tcm-900/60 dark:text-tcm-200"}"><i class="fa-solid ${passe ? "fa-check" : "fa-calendar"}"></i>${TCM.dateFr(e.date)}</p>
 <h3 class="relative mt-4 text-xl">${TCM.esc(e.titre)}</h3><p class="relative mt-2 text-sm text-doux">${TCM.esc(e.texte)}</p></li>`;
    })
    .join("");

  $("#nr-nouvelles").innerHTML = R.nouvelles
    .map((id) => L[id])
    .filter(Boolean)
    .map(
      (l) => `
 <a href="${TCM.lienLigne(l.id)}" class="carte-lien flex gap-4 p-5">${TCM.picto(l, 56)}
 <div class="min-w-0"><p class="font-black">${TCM.esc(l.nom)}</p><p class="text-sm">${TCM.esc(l.depart)} <i class="fa-solid fa-arrow-right-arrow-left mx-1 text-[10px] text-doux"></i> ${TCM.esc(l.terminus)}</p>
 <p class="mt-1 text-xs text-doux">${TCM.esc((TCM.MODES[l.mode] || {}).nom || "")}${l.temps ? " · " + Math.round(l.temps) + " min de bout en bout" : ""}${l.statut.etat === "ouverture" && TCM.date(l.statut.date) > now ? " · ouverture le " + TCM.dateFr(l.statut.date) : ""}</p></div></a>`
    )
    .join("");

  const groupes = {};
  R.disparues.forEach((d) => (groupes[d.remplacee_par] = groupes[d.remplacee_par] || []).push(d.ligne));
  $("#nr-fusions").innerHTML = Object.entries(groupes)
    .map(([n, anc]) => {
      const l = L[n];
      const futur = l.statut.etat === "ouverture" && TCM.date(l.statut.date) > now;
      const relais = futur
        ? [...new Set(Object.values(l.correspondances || {}).flat())]
            .sort(TCM.triLignes)
            .map((x) => L[x])
            .filter(Boolean)
        : [];
      return `<div class="bg-carte-2 p-5">
 <div class="flex items-center gap-3"><span class="flex gap-1">${anc
   .sort(TCM.triLignes)
   .map((a) => `<span class="grid h-10 w-10 place-items-center border-2 border-dashed border-trait font-black text-doux line-through">${a}</span>`)
   .join("")}</span>
 <i class="fa-solid fa-arrow-right text-doux"></i>${TCM.picto(l, 44, true)}<span class="text-sm font-bold">${TCM.esc(l.nom)}${futur ? `<span class="block text-xs font-normal text-doux">ouverture le ${TCM.dateFr(l.statut.date)}</span>` : ""}</span></div>
 ${relais.length ? `<p class="mt-4 text-sm text-doux">D'ici l'ouverture, les arrêts du tram ${TCM.esc(l.id)} restent desservis par :</p><div class="mt-2 flex flex-wrap gap-1.5">${relais.map((x) => TCM.picto(x, 30, true)).join("")}</div>` : ""}</div>`;
    })
    .join("");

  const lignes = ls.filter((l) => l.nouvelle || l.origines.length || l.ancien_terminus || l.changements.length).sort((a, b) => TCM.triLignes(a.id, b.id));
  const rendre = () => {
    const q = TCM.sansAccent($("#nr-filtre").value).trim();
    $("#nr-lignes").innerHTML =
      lignes
        .filter((l) => !q || TCM.sansAccent(l.id + " " + l.nom + " " + l.depart + " " + l.terminus).includes(q))
        .map((l) => {
          const items = [];
          if (l.nouvelle) items.push("Nouvelle ligne");
          if (l.origines.length) items.push("Reprend " + (l.origines.length > 1 ? "les lignes " : "la ligne ") + l.origines.join(" et "));
          if (l.ancien_terminus) items.push("Nouveaux terminus (avant : " + l.ancien_terminus.join(" – ") + ")");
          l.changements.forEach((c) =>
            items.push(
              c
                .replace(/^temps/, "Temps de parcours")
                .replace(/^arrêts/, "Arrêts")
                .replace(/^km/, "Longueur (km)")
                .replace(/(\d)\.(\d)/g, "$1,$2")
            )
          );
          return `<li><a href="${TCM.lienLigne(l.id)}" class="flex items-center gap-4 p-4 transition hover:bg-carte-2 sm:p-5">${TCM.picto(l, 44)}
 <div class="min-w-0 flex-1"><p class="truncate font-bold">${TCM.esc(l.depart)} <i class="fa-solid fa-arrow-right-arrow-left mx-1 text-[10px] text-doux"></i> ${TCM.esc(l.terminus)}</p>
 <p class="mt-1 flex flex-wrap gap-1.5">${items.map((i) => `<span class="bg-carte-2 px-2.5 py-0.5 text-xs text-doux">${TCM.esc(i)}</span>`).join("")}</p></div>
 <i class="fa-solid fa-chevron-right text-doux"></i></a></li>`;
        })
        .join("") || '<li class="p-6 text-center text-doux">Aucune ligne.</li>';
  };
  $("#nr-filtre").addEventListener("input", rendre);
  rendre();

  const et = L.ET,
    b = L.B;
  const faq = [
    [
      "Mes titres de transport restent-ils valables ?",
      "Oui. La grille tarifaire ne change pas au 5 décembre : tickets et abonnements en cours restent valables sur tout le réseau. Seul le tram-train ET a son propre titre, le ticket Aéroport.",
    ],
    [
      "Comment aller à l'aéroport avant l'ouverture du tram-train ?",
      `La ligne 106 relie la gare routière de Clermont-Ferrand à l'aéroport. Le tram-train ET prendra le relais${et ? " le " + TCM.dateFr(et.statut.date) : ""}, depuis la gare SNCF, en 28 minutes.`,
    ],
    [
      "Quand ouvre le tram B ?",
      b
        ? `Le tram B ouvrira le ${TCM.dateFr(b.statut.date)}, une fois toutes ses rames livrées et testées. Il reliera le campus Alan Turing au campus Centre par l'hôtel de Région et la gare.`
        : "",
    ],
    [
      "Les services scolaires et le transport à la demande changent-ils ?",
      "Non : les lignes Édu'Volcan et Volca'Demande sont maintenues. Une nouvelle ligne scolaire, la 604, relie le lycée Sidoine-Apollinaire au Cendre.",
    ],
    [
      "Les bus de nuit circulent-ils toujours ?",
      "Oui, et le réseau de nuit s'agrandit : BEN1, BEN2, BEN3 (assurée par le tram) et une nouvelle ligne BEN4 vers Le Cendre.",
    ],
    [
      "Où trouver les horaires de ma ligne ?",
      "Sur la fiche de chaque ligne : fréquences en semaine, le samedi et le dimanche, en période scolaire et pendant les vacances, avec les correspondances et une version imprimable.",
    ],
  ].filter((q) => q[1]);
  $("#faq").innerHTML = faq
    .map(
      ([q, r]) =>
        `<details class="carte group p-5 open:shadow-haute"><summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-black">${TCM.esc(q)}<i class="fa-solid fa-plus text-doux transition group-open:rotate-45"></i></summary><p class="mt-3 text-doux">${TCM.esc(r)}</p></details>`
    )
    .join("");
})();
