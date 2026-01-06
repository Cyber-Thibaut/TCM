document.addEventListener("DOMContentLoaded", function () {
    // Inject FontAwesome if missing
    if (!document.querySelector('link[href*="fontawesome"], script[src*="fontawesome"]')) {
       const fa = document.createElement('script');
       fa.src = "https://kit.fontawesome.com/d8bf012a3e.js";
       fa.crossOrigin = "anonymous";
       document.head.appendChild(fa);
    }

    const menu = `
    <style>
    :root {
        --menu-glass: rgba(255, 255, 255, 0.75);
        --menu-border: rgba(255, 255, 255, 0.5);
    }
    [data-theme="dark"] {
        --menu-glass: rgba(30, 41, 59, 0.65);
        --menu-border: rgba(255, 255, 255, 0.1);
    }
    .glass-menu {
        background: var(--menu-glass) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        border: 1px solid var(--menu-border) !important;
        box-shadow: 0 8px 32px 0 rgba(0,0,0,0.1);
        transition: all 0.3s ease;
    }
    /* Logo switching */
    .logo-light { display: block; }
    .logo-dark { display: none; }
    [data-theme="dark"] .logo-light { display: none; }
    [data-theme="dark"] .logo-dark { display: block; }
    </style>
    <nav class="w-full sticky top-4 z-50 mb-8" style="pointer-events: none;">
      <div class="mx-auto max-w-5xl px-4" style="pointer-events: auto;">
        <div class="glass-menu rounded-full px-4 py-2 flex items-center justify-between">
          
          <!-- Logo & Brand -->
          <a href="/index.html" class="flex items-center gap-3 shrink-0 group">
            <div class="relative w-[48px] h-[48px] group-hover:scale-105 transition-transform">
                <img src="/img/TCM-Sombre.png" alt="Logo TCM" class="logo-light object-contain w-full h-full" />
                <img src="/img/TCM-Clair.png" alt="Logo TCM" class="logo-dark object-contain w-full h-full" />
            </div>
            <span class="hidden sm:inline font-bold text-lg text-base-content group-hover:text-primary transition-colors">TCM</span>
          </a>

          <!-- Desktop Menu -->
          <div class="hidden md:flex items-center gap-1">
            <a class="btn btn-ghost btn-sm rounded-full font-medium" href="/src/reseau.html"><i class="fa-solid fa-map mr-1"></i>Notre Réseau</a>
            <a class="btn btn-ghost btn-sm rounded-full font-medium" href="/src/parkings.html"><i class="fa-solid fa-square-parking mr-1"></i>Parkings</a>
            <a class="btn btn-ghost btn-sm rounded-full font-medium" href="/src/parkings.html#relais"><i class="fa-solid fa-car mr-1"></i>Parkings Relais</a>
            <a class="btn btn-ghost btn-sm rounded-full font-medium" href="/src/trafic.html"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Info Trafic</a>
            <a class="btn btn-ghost btn-sm rounded-full font-medium" href="/src/tarifs.html"><i class="fa-solid fa-ticket mr-1"></i>Tarif</a>
            <a class="btn btn-ghost btn-sm rounded-full font-medium" href="/src/agences.html"><i class="fa-solid fa-store mr-1"></i>Nos Agences</a>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <!-- Theme Controller -->
            <label class="swap swap-rotate btn btn-circle btn-ghost btn-sm">
              <input type="checkbox" class="theme-controller" value="night" />
              <!-- sun -->
              <svg class="swap-off h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/></svg>
              <!-- moon -->
              <svg class="swap-on h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/></svg>
            </label>

            <!-- Mobile Menu Mobile -->
            <div class="dropdown dropdown-end md:hidden">
              <label tabindex="0" class="btn btn-ghost btn-circle btn-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              </label>
              <ul tabindex="0" class="menu dropdown-content mt-3 p-2 shadow-2xl bg-base-100/95 backdrop-blur-xl rounded-box w-52 z-[100] border border-base-200">
                <li><a href="/src/reseau.html"><i class="fa-solid fa-map w-5"></i> Notre Réseau</a></li>
                <li><a href="/src/parkings.html"><i class="fa-solid fa-square-parking w-5"></i> Parkings</a></li>
                <li><a href="/src/parkings.html#relais"><i class="fa-solid fa-car w-5"></i> Parkings Relais</a></li>
                <li><a href="/src/trafic.html"><i class="fa-solid fa-triangle-exclamation w-5"></i> Info Trafic</a></li>
                <li><a href="/src/tarifs.html"><i class="fa-solid fa-ticket w-5"></i> Tarif</a></li>
                <li><a href="/src/agences.html"><i class="fa-solid fa-store w-5"></i> Nos Agences</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
    `;

  // Insérez le menu dans la page
  document.body.insertAdjacentHTML("afterbegin", menu);
  setTimeout(() => {
    // Détecter la préférence système
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const storedTheme = localStorage.getItem("theme");
    const themeToggle = document.querySelector(".theme-controller");

    // Définir le thème initial
    const initialTheme = storedTheme || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", initialTheme);
    if (themeToggle) {
      themeToggle.checked = initialTheme === "dark";

      // Écouter les changements de l'utilisateur
      themeToggle.addEventListener("change", (e) => {
        const newTheme = e.target.checked ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
      });
    }
  }, 0);
});
