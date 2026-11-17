/* Pages d'archives : elles gardent leur contenu d'origine et reçoivent l'en-tête et le pied de page du nouveau site. */
(function () {
  "use strict";
  var corps = function () {
    if (!document.getElementById("entete-site")) {
      var e = document.createElement("div");
      e.id = "entete-site";
      document.body.insertBefore(e, document.body.firstChild);
    }
    if (!document.getElementById("pied-site")) {
      var p = document.createElement("div");
      p.id = "pied-site";
      document.body.appendChild(p);
    }
    var bandeau = document.createElement("div");
    bandeau.innerHTML =
      '<div class="border-b border-trait bg-carte-2"><div class="conteneur flex flex-wrap items-center justify-between gap-2 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-doux">' +
      '<span>Archive · page publiée lors d\'un événement passé</span><a href="/archives.html" class="text-encre underline underline-offset-4">Toutes les archives</a></div></div>';
    document.getElementById("entete-site").after(bandeau);
    if (!document.querySelector('link[href*="CitroenType"],link[href="/dist/output.css"]')) {
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "/dist/output.css";
      document.head.appendChild(l);
    }
    var s = document.createElement("script");
    s.src = "/assets/js/site.js";
    document.head.appendChild(s);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", corps);
  else corps();
})();
