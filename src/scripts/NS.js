// Script spécialisé pour le Hub Caramel Arena (Navettes Nav1 à Nav6)

// Configuration des navettes
const NAVETTES = [
    { id: 'NAV1', color: '#007941', icon: 'fa-train-tram', name: 'Navette 1', desc: 'Clinique Saint Paul <> Hotel police' },
    { id: 'NAV2', color: '#007941', icon: 'fa-bus', name: 'Navette 2', desc: 'Quartier résidentiel <> Arena' },
    { id: 'NAV3', color: '#007941', icon: 'fa-bus', name: 'Navette 3', desc: 'Campus Maryse Esterie <> Arena' },
    { id: 'NAV4', color: '#007941', icon: 'fa-bus-simple', name: 'Navette 4', desc: 'Chatonmeow <> Gare de l\'Ouest' },
    { id: 'NAV5', color: '#007941', icon: 'fa-bus-simple', name: 'Navette 5', desc: 'Ludorgue Mont Ludorgue <> Arena' },
    { id: 'NAV6', color: '#007941', icon: 'fa-bus-simple', name: 'Navette 6', desc: 'Asquillay <> Gare de l\'Ouest' }
];

async function init() {
    console.log("🏟️ [Arena] Initialisation du Hub Caramel Arena");
    
    // 1. Mise en place du Header "Caramel Arena"
    setupArenaHeader();

    // 2. Chargement des données (Events + Lignes)
    const events = await fetchEventData();
    const linesData = await fetchAllNavettesData();

    // 3. Affichage des événements
    renderEventInfo(events);

    // 4. Affichage du Hub (Grille des navettes)
    renderNavetteGrid(linesData);

    // 5. Gestion du bouton PDF Global
    setupGlobalPDFButton();
}

function setupArenaHeader() {
    const destination = document.getElementById("destination");
    if (destination) {
        destination.innerHTML = `
            <div class="flex flex-col items-center gap-4">
                <div class="bg-white/90 p-4 rounded-xl shadow-lg backdrop-blur-sm transform hover:scale-105 transition-transform duration-300">
                    <img src="../img/Caramel Arena.png" alt="Caramel Arena" class="h-32 object-contain drop-shadow-md" onerror="this.style.display='none'">
                </div>
                <span class="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 drop-shadow-sm mt-4">
                    DISPOSITIF ÉVÉNEMENTIEL
                </span>
            </div>
        `;
    }
    
    // Customiser le fond du hero
    const heroBlock = document.getElementById("blocc");
    if (heroBlock) {
        heroBlock.classList.remove("bg-black");
        heroBlock.style.background = "linear-gradient(135deg, #1a1a1a 0%, #2d1b0e 100%)";
        // On garde l'image de fond existante mais on change son opacité
        const bgImg = heroBlock.querySelector("img");
        if(bgImg) bgImg.style.opacity = "0.4";
    }
}

async function fetchAllNavettesData() {
    try {
        const response = await fetch('ligne.json');
        const data = await response.json();
        return data.lignes.filter(l => String(l.id).startsWith('NAV'));
    } catch (error) {
        console.error("Erreur chargement lignes", error);
        return [];
    }
}

function renderNavetteGrid(linesData) {
    const container = document.getElementById('infos-ligne');
    if (!container) return;

    let gridHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
    `;

    NAVETTES.forEach(nav => {
        const data = linesData.find(l => l.id === nav.id) || {};
        const stats = data.stats || { temps_trajet: '?', vehicule: 'Bus' };

        gridHTML += `
            <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border-t-4 border-[#007941] group cursor-pointer"
                 onclick="showNavetteDetails('${nav.id}')">
                <div class="card-body p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div class="badge badge-lg font-bold text-white" style="background-color: ${nav.color}">${nav.id}</div>
                        <i class="fa-solid ${nav.icon} text-2xl text-[#007941] group-hover:scale-110 transition-transform"></i>
                    </div>
                    <h3 class="card-title text-lg mb-2 min-h-[3.5rem]">${nav.desc}</h3>
                    
                    <div class="flex justify-between items-center text-sm text-base-content/70 mt-auto pt-4 border-t border-base-200">
                        <span class="flex items-center gap-2"><i class="fa-regular fa-clock"></i> ${stats.temps_trajet}</span>
                        <span class="flex items-center gap-2"><i class="fa-solid fa-road"></i> ${stats.longueur_ligne || '? km'}</span>
                    </div>
                </div>
            </div>
        `;
    });

    gridHTML += `</div>`;

    // Zone de détails (initialement cachée ou vide)
    gridHTML += `<div id="navette-detail-view" class="hidden animate-fade-in"></div>`;

    container.innerHTML = gridHTML;
}

async function showNavetteDetails(id) {
    const detailContainer = document.getElementById('navette-detail-view');
    const linesData = await fetchAllNavettesData();
    const data = linesData.find(l => l.id === id);
    
    if (!data || !detailContainer) return;

    // Scroll smooth vers les détails
    detailContainer.classList.remove('hidden');
    
    detailContainer.innerHTML = `
        <div class="card bg-base-100 shadow-2xl overflow-hidden border border-base-200">
            <div class="bg-[#007941] text-white p-4 flex justify-between items-center">
                <h3 class="text-2xl font-bold flex items-center gap-3">
                    <span class="badge badge-lg bg-white text-[#007941] border-none">${id}</span>
                    ${data.nom}
                </h3>
                <button onclick="document.getElementById('navette-detail-view').classList.add('hidden')" class="btn btn-circle btn-ghost btn-sm text-white">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div class="card-body p-0">
                <div class="grid md:grid-cols-2">
                    <!-- Colonne Info -->
                    <div class="p-8 space-y-6">
                        <div>
                            <h4 class="font-bold text-lg mb-2 text-[#007941]">Informations Ligne</h4>
                            <p class="text-base-content/80">${data.description}</p>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div class="stat bg-base-200 rounded-box p-4">
                                <div class="stat-title">Véhicule</div>
                                <div class="stat-value text-lg text-[#007941]">${data.stats.vehicule}</div>
                            </div>
                            <div class="stat bg-base-200 rounded-box p-4">
                                <div class="stat-title">Arrêts</div>
                                <div class="stat-value text-lg text-[#007941]">${data.stats.nombre_arrets}</div>
                            </div>
                            <div class="stat bg-base-200 rounded-box p-4">
                                <div class="stat-title">Temps</div>
                                <div class="stat-value text-lg text-[#007941]">${data.stats.temps_trajet}</div>
                            </div>
                            <div class="stat bg-base-200 rounded-box p-4">
                                <div class="stat-title">Distance</div>
                                <div class="stat-value text-lg text-[#007941]">${data.stats.longueur_ligne}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Colonne Plan -->
                    <div class="bg-base-200 p-8 flex items-center justify-center">
                        <div class="text-center w-full">
                            <img src="../img/plans/${id}.png" 
                                 onerror="this.src='../img/plans/LNS.png'; this.onerror=null;" 
                                 class="rounded-lg shadow-lg max-h-[400px] w-full object-contain bg-white mx-auto mb-4" 
                                 alt="Plan ${id}">
                            <p class="text-sm opacity-60 italic">Plan de la ligne ${id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    detailContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setupGlobalPDFButton() {
    const container = document.getElementById('nextBusTime'); // On utilise la zone sous le titre
    if (!container) return;

    container.innerHTML = `
        <button onclick="generateArenaGlobalPDF()" class="btn btn-lg bg-gradient-to-r from-[#007941] to-[#005c32] text-white border-none shadow-lg hover:scale-105 transition-transform gap-3">
            <i class="fa-solid fa-file-pdf fa-xl"></i>
            <div>
                <div class="font-bold">Télécharger le Guide Complet</div>
                <div class="text-xs font-normal opacity-80">Toutes les navettes (PDF)</div>
            </div>
        </button>
    `;
}

// --- Fonctions utilitaires (Events / Trafic) ---
// (Réutilisation simplifiée de la logique existante)

async function fetchEventData() {
    try {
        // Simulation ou fetch réel
        const response = await fetch("https://raw.githubusercontent.com/Cyber-Thibaut/infotrafic/main/info.json");
        if (!response.ok) return [];
        const data = await response.json();
        const ligne = data.lignes.find(l => l.ligne === "NS");
        return ligne && ligne.infos_trafic ? ligne.infos_trafic : [];
    } catch (e) { return []; }
}

function renderEventInfo(events) {
    const container = document.getElementById('alertMessage');
    if (!container) return;
    
    // Logique d'affichage simplifiée pour l'exemple
    if (events.length > 0) {
        container.innerHTML = `
            <div class="alert alert-info shadow-lg">
                <i class="fa-solid fa-calendar-days"></i>
                <div>
                    <h3 class="font-bold">Prochains événements</h3>
                    <div class="text-xs">${events.length} événement(s) programmé(s)</div>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
    }
}

// Expose init globally
window.init = init;
