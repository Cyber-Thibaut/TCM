/* Actualités : articles du site WordPress du réseau (liste et lecture d'un article) */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const c = await TCM.config();
  const base = c.actualites_wordpress;
  const texte = (html) => {
    const d = document.createElement("div");
    d.innerHTML = html || "";
    return d.textContent.trim();
  };
  const id = TCM.param("id");
  try {
    if (!base) throw new Error("pas de source");
    if (id) {
      const r = await fetch(`${base}/${encodeURIComponent(id)}?_embed`);
      if (!r.ok) throw new Error(r.status);
      const p = await r.json();
      $("#actu-liste-vue").hidden = true;
      $("#actu-article").hidden = false;
      document.title = texte(p.title.rendered) + " — Actualités TCM";
      $("#art-date").textContent = TCM.dateFr(p.date);
      $("#art-titre").textContent = texte(p.title.rendered);
      const img = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
      if (img) {
        $("#art-image").src = img;
        $("#art-image").classList.remove("hidden");
      }
      // contenu de l'article : on garde la mise en forme simple, sans scripts
      const doc = new DOMParser().parseFromString(p.content.rendered, "text/html");
      doc.querySelectorAll("script, style, iframe:not([src*='youtube'])").forEach((e) => e.remove());
      $("#art-corps").innerHTML = doc.body.innerHTML;
      return;
    }
    const r = await fetch(`${base}?_embed&per_page=24${c.actualites_categorie ? "&categories=" + c.actualites_categorie : ""}`);
    if (!r.ok) throw new Error(r.status);
    const posts = await r.json();
    $("#actu-liste").innerHTML = posts
      .map((p, i) => {
        const img = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
        return `<a href="/actualites.html?id=${p.id}" class="group block ${i === 0 ? "md:col-span-2" : ""}">
          <div class="aspect-[16/10] overflow-hidden bg-carte-2">${img ? `<img src="${img}" alt="" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy">` : ""}</div>
          <p class="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-doux">${TCM.dateFr(p.date)}</p>
          <h2 class="mt-2 ${i === 0 ? "text-3xl" : "text-xl"} leading-snug group-hover:text-tcm-600">${TCM.esc(texte(p.title.rendered))}</h2>
          <p class="mt-2 line-clamp-3 text-doux">${TCM.esc(texte(p.excerpt?.rendered))}</p></a>`;
      })
      .join("");
  } catch (e) {
    $("#actu-erreur").hidden = false;
  }
})();
