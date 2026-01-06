document.addEventListener("DOMContentLoaded", function () {
    // Inject Custom Styles
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
          --tcm-blue: #0077E6; /* Standard Business Blue */
          --tcm-blue-hover: #005bb5;
          --glass-bg: rgba(22, 22, 24, 0.7);
          --glass-border: rgba(255, 255, 255, 0.08);
      }
      
      [data-theme="dark"] {
          --glass-bg: rgba(10, 10, 12, 0.8);
          --tcm-blue: #3b82f6; /* Brighter Blue for Dark Mode */
      }

      /* Floating Pill Design - Absolute (Not Fixed) */
      .navbar-glass {
          position: absolute; /* Floats over content but scrolls away */
          top: 1rem;
          left: 50%;
          transform: translateX(-50%);
          width: 95%;
          max-width: 1280px;
          border-radius: 1rem;
          
          background: var(--glass-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--glass-border);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          z-index: 50;
      }
      
      /* Force Blue instead of Theme Violet */
      .text-tcm { color: var(--tcm-blue) !important; }
      .bg-tcm { background-color: var(--tcm-blue) !important; color: white; }
      
      .nav-link {
          font-weight: 600;
          transition: all 0.2s;
          border-radius: 0.5rem;
          color: inherit;
      }
      .nav-link:hover {
         background: rgba(255, 255, 255, 0.1);
         color: var(--tcm-blue);
      }

      /* Mobile Dropdown */
      .glass-menu {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
      }
    `;
    document.head.appendChild(style);
  
    const menuContent = `
      <div class="navbar navbar-glass text-base-content">
          <!-- Start: Mobile Menu & Logo -->
          <div class="navbar-start">
              <div class="dropdown">
                  <label tabindex="0" class="btn btn-ghost lg:hidden hover:bg-white/10">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" />
                      </svg>
                  </label>
                  <ul tabindex="0" class="menu menu-lg dropdown-content mt-3 z-[1] p-3 shadow-2xl glass-menu rounded-2xl w-64 text-base-content">
                      <li><a href="/src/reseau.html"><i class="fa-solid fa-map w-6 text-center"></i> Notre Réseau</a></li>
                      <li><a href="/src/trafic.html"><i class="fa-solid fa-triangle-exclamation w-6 text-center"></i> Info Trafic</a></li>
                      <li><a href="/src/tarifs.html"><i class="fa-solid fa-ticket w-6 text-center"></i> Tarifs</a></li>
                      <li><a href="/src/agences.html"><i class="fa-solid fa-store w-6 text-center"></i> Nos Agences</a></li>
                      <li><a href="/src/parkings.html"><i class="fa-solid fa-square-parking w-6 text-center"></i> P+R</a></li>
                      <div class="divider my-1 border-white/10"></div>
                      <li><a href="/index.html"><i class="fa-solid fa-home w-6 text-center"></i> Accueil</a></li>
                  </ul>
              </div>
              <a class="btn btn-ghost normal-case text-xl hover:bg-white/10 gap-2" href="/index.html">
                  <img src="/img/TCM-Clair.png" class="h-8 w-auto opacity-90 drop-shadow-md" alt="TCM Logo" onerror="this.src='/img/TCM-Sombre.png'">
                  <span class="hidden sm:inline font-black tracking-tight"><span class="text-tcm">TCM</span> Mobililité</span>
              </a>
          </div>
  
          <!-- Center: Desktop Menu -->
          <div class="navbar-center hidden lg:flex">
              <ul class="menu menu-horizontal px-1 gap-1">
                  <li><a href="/src/reseau.html" class="nav-link"><i class="fa-solid fa-map mr-1"></i> Réseau</a></li>
                  <li><a href="/src/trafic.html" class="nav-link"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Infos</a></li>
                  <li><a href="/src/tarifs.html" class="nav-link"><i class="fa-solid fa-ticket mr-1"></i> Tarifs</a></li>
                  <li><a href="/src/agences.html" class="nav-link"><i class="fa-solid fa-store mr-1"></i> Agences</a></li>
                  <li><a href="/src/parkings.html" class="nav-link"><i class="fa-solid fa-square-parking mr-1"></i> P+R</a></li>
              </ul>
          </div>
  
          <!-- End: Theme Toggle (Fixed Logic) -->
          <div class="navbar-end">
                <label class="swap swap-rotate btn btn-ghost btn-circle hover:bg-white/10 text-tcm">
                    <!-- this hidden checkbox controls the state -->
                    <input type="checkbox" id="theme-toggle" />
                    
                    <!-- sun icon -->
                    <svg class="swap-off fill-current w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/></svg>
                    
                    <!-- moon icon -->
                    <svg class="swap-on fill-current w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/></svg>
                </label>
          </div>
      </div>
      `;
  
    // Insert Menu
    document.body.insertAdjacentHTML("afterbegin", menuContent);
    
    // Logic (Executed immediately after insertion is safe in DOMContentLoaded)
    const toggle = document.getElementById('theme-toggle');
    const root = document.documentElement;

    // 1. Get Saved or Default Theme
    const savedTheme = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    let currentTheme = savedTheme || (systemDark ? "dark" : "light");

    // 2. Apply Start State
    root.setAttribute("data-theme", currentTheme);
    if(toggle) {
        // Swap logic: Checkbox CHECKED = Dark (Moon visible), UNCHECKED = Light (Sun visible)
        // Adjust based on your icon swap preference. Usually swap-on/off classes.
        // If swap-on is moon -> Checked = Moon = Dark.
        toggle.checked = (currentTheme === "dark");
        
        // 3. Helper Function to set theme
        const setTheme = (theme) => {
            root.setAttribute("data-theme", theme);
            localStorage.setItem("theme", theme);
        };

        // 4. Listener
        toggle.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? "dark" : "light";
            setTheme(newTheme);
        });
    }

  });
