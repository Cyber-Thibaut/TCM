// Script spécialisé pour la Navette Spéciale NS (Gare SNCF <> Zénith d'Auvergne)
// Service événementiel avec horaires adaptatifs

// Récupération des données de trafic
async function fetchTrafficData() {
  try {
    console.log("🔄 [NS] Chargement des données de trafic");
    const response = await fetch("https://raw.githubusercontent.com/Cyber-Thibaut/infotrafic/main/info.json");
    //const response = await fetch("test.json");
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Chercher les perturbations de la ligne NS
    const ligneNS = data.lignes.find(l => l.ligne === "NS");
    
    if (ligneNS && ligneNS.infos_trafic) {
      // Filtrer uniquement les perturbations/incidents (pas les événements)
      const perturbations = ligneNS.infos_trafic.filter(info => 
        info.type === 'travaux' || info.type === 'fermeture' || 
        (info.type === 'information' && !info.titre.toLowerCase().includes('concert'))
      );
      console.log(`✅ [NS] ${perturbations.length} perturbation(s) trouvée(s)`);
      return perturbations;
    }
    return [];
  } catch (error) {
    console.error('Erreur lors du chargement des données de trafic:', error);
    return [];
  }
}

// Récupération des données d'événements spécifiques NS
async function fetchEventData() {
  try {
    console.log("🎪 [NS] Chargement des événements");
    const response = await fetch("https://raw.githubusercontent.com/Cyber-Thibaut/infotrafic/main/info.json");
    //const response = await fetch("test.json");
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const ligne = data.lignes.find(l => l.ligne === "NS");
    
    if (ligne && ligne.infos_trafic) {
      // Filtrer uniquement les événements (concerts, spectacles)
      const evenements = ligne.infos_trafic.filter(info => 
        info.type === 'information' && 
        (info.titre.toLowerCase().includes('concert') || 
         info.titre.toLowerCase().includes('spectacle') ||
         info.titre.toLowerCase().includes('événement') ||
         info.titre.toLowerCase().includes('show'))
      );
      console.log(`🎵 [NS] ${evenements.length} événement(s) trouvé(s)`);
      return evenements;
    }
    return [];
  } catch (error) {
    console.error('Erreur lors du chargement des données d\'événements:', error);
    return [];
  }
}

// Affichage de l'encart trafic harmonisé
function renderTrafficInfo(perturbations) {
  const trafficContainer = document.getElementById('lignes');
  if (!trafficContainer) return;

  const now = new Date();
  const activeIncidents = perturbations.filter(p => {
    const startDate = new Date(p.debut);
    const endDate = new Date(p.fin);
    return now >= startDate && now <= endDate;
  });

  if (activeIncidents.length === 0) {
    trafficContainer.innerHTML = `
      <div class="card bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 mb-4">
        <div class="card-body p-4">
          <div class="flex items-center gap-3">
            <div class="text-green-600 dark:text-green-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-green-800 dark:text-green-200">Navette opérationnelle</h3>
              <p class="text-green-600 dark:text-green-300 text-sm">Aucune perturbation signalée sur la navette spéciale</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    const incidentText = activeIncidents.length === 1 ? 
      '1 incident en cours' : 
      `${activeIncidents.length} incidents en cours`;
    
    trafficContainer.innerHTML = `
      <div class="card bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 mb-4">
        <div class="card-body p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="text-orange-600 dark:text-orange-400">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-orange-800 dark:text-orange-200">Perturbations détectées</h3>
                <p class="text-orange-600 dark:text-orange-300 text-sm">${incidentText} sur la navette spéciale</p>
              </div>
            </div>
            <a href="../details.html#NS" class="btn btn-sm btn-outline btn-primary">Voir détails</a>
          </div>
        </div>
      </div>
    `;
  }
}

// Affichage des événements au Zénith
function renderEventInfo(events) {
  const eventContainer = document.getElementById('alertMessage');
  if (!eventContainer) return;

  const now = new Date();
  let hasActiveEvent = false;

  eventContainer.innerHTML = '';

  // Trier les événements par ordre chronologique (événements en cours d'abord, puis à venir)
  const sortedEvents = events
    .map(event => ({
      ...event,
      startDate: new Date(event.debut),
      endDate: new Date(event.fin),
      announceDate: new Date(event.annonce)
    }))
    .filter(event => now >= event.announceDate && now <= event.endDate)
    .sort((a, b) => {
      // D'abord les événements en cours, puis ceux à venir
      const aIsCurrent = now >= a.startDate && now <= a.endDate;
      const bIsCurrent = now >= b.startDate && now <= b.endDate;
      
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      
      // Si même statut, trier par date de début
      return a.startDate - b.startDate;
    });

  sortedEvents.forEach(event => {
    hasActiveEvent = true;
    
    let badgeColor, bgColor, emoji, eventTitle;
    
    if (now < event.startDate) {
      badgeColor = 'badge-warning';
      bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
      emoji = '📅';
      eventTitle = 'Événement à venir au Zénith';
    } else if (now >= event.startDate && now <= event.endDate) {
      badgeColor = 'badge-error';
      bgColor = 'bg-red-50 dark:bg-red-900/20';
      emoji = '🔥';
      eventTitle = 'Événement en cours au Zénith';
    }

    eventContainer.innerHTML += `
      <div class="card ${bgColor} border-l-4 border-primary shadow-lg mb-4 animate-fade-in">
        <div class="card-body p-6">
          <div class="flex items-center gap-3 mb-4">
            <img src="../img/NS.png" alt="Navette NS" class="w-16 h-12 object-contain">
            <div>
              <h3 class="text-lg font-semibold text-primary">${emoji} ${eventTitle}</h3>
              <div class="badge ${badgeColor} text-white font-semibold">${event.titre}</div>
            </div>
          </div>
          
          <div class="prose prose-sm max-w-none text-base-content/80 mb-4">
            <p>${event.description.replace(/\n/g, '<br>')}</p>
          </div>
          
          <div class="text-sm text-base-content/60">
            📍 Du ${event.startDate.toLocaleDateString('fr-FR')} au ${event.endDate.toLocaleDateString('fr-FR')}
          </div>
        </div>
      </div>
    `;
  });

  if (!hasActiveEvent) {
    eventContainer.innerHTML = `
      <div class="card bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 mb-4">
        <div class="card-body p-4">
          <div class="flex items-center gap-3">
            <div class="text-blue-600 dark:text-blue-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-blue-800 dark:text-blue-200">Aucun événement programmé</h3>
              <p class="text-blue-600 dark:text-blue-300 text-sm">Pas d'événement prévu au Zénith d'Auvergne prochainement</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Récupération des informations de ligne
async function fetchLineDetails() {
  try {
    const response = await fetch('../ligne.json');
    const data = await response.json();
    const line = data.lignes.find(l => l.id === "NS");
    return line || {
      id: "NS",
      nom: "Gare SNCF <> Zénith d'Auvergne",
      type: "Navette Spéciale",
      description: "Navette spéciale événementielle reliant la Gare SNCF au Zénith d'Auvergne. Service adaptatif selon la programmation des événements.",
      stats: {
        nombre_arrets: 5,
        temps_trajet: "17 minutes",
        longueur_ligne: "6 km"
      }
    };
  } catch (error) {
    console.error('Erreur lors du chargement des détails de ligne:', error);
    return {
      id: "NS",
      nom: "Gare SNCF <> Zénith d'Auvergne",
      type: "Navette Spéciale",
      description: "Navette spéciale événementielle reliant la Gare SNCF au Zénith d'Auvergne. Service adaptatif selon la programmation des événements.",
      stats: {
        nombre_arrets: 5,
        temps_trajet: "17 minutes",
        longueur_ligne: "6 km"
      }
    };
  }
}


// Affichage des informations de ligne harmonisé
function renderLineDetails(lineData) {
  const lineContainer = document.getElementById('infos-ligne');
  if (!lineContainer) return;

  lineContainer.innerHTML = `
    <div class="card bg-base-100 dark:bg-base-200 shadow-lg mb-6">
      <div class="card-body">
        <!-- Plan de ligne sur toute la largeur -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-3 text-primary">Plan de la ligne</h3>
          <div class="bg-base-200 dark:bg-base-300 rounded-lg p-4 text-center">
            <img src="../img/plans/LNS.png" alt="Plan navette NS" class="w-full h-auto rounded-lg mb-3 max-h-96 object-contain" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div style="display: none;" class="text-base-content/60">
              <svg class="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
              </svg>
              <p class="text-sm">Plan de ligne non disponible</p>
            </div>
          </div>
        </div>

        <!-- Informations ligne -->
        <div class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold mb-3 text-primary">Informations navette</h3>
              <div class="grid md:grid-cols-3 gap-4 mb-4">
                <div class="stat bg-base-200 dark:bg-base-300 rounded-lg p-4">
                  <div class="stat-title text-sm">Arrêts</div>
                  <div class="stat-value text-2xl text-primary">${lineData.stats.nombre_arrets}</div>
                </div>
                <div class="stat bg-base-200 dark:bg-base-300 rounded-lg p-4">
                  <div class="stat-title text-sm">Temps de trajet</div>
                  <div class="stat-value text-2xl text-primary">${lineData.stats.temps_trajet}</div>
                </div>
                <div class="stat bg-base-200 dark:bg-base-300 rounded-lg p-4">
                  <div class="stat-title text-sm">Distance</div>
                  <div class="stat-value text-2xl text-primary">${lineData.stats.longueur_ligne}</div>
                </div>
              </div>
            </div>

            <!-- Description spécifique navette -->
            <div>
              <h4 class="font-semibold mb-2 text-secondary">À propos de la navette spéciale</h4>
              <div class="prose prose-sm max-w-none text-base-content/80 mb-4">
                <p>${lineData.description}</p>
              </div>
            </div>

            <!-- Horaires adaptatifs -->
            <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <h4 class="font-semibold mb-2 text-purple-800 dark:text-purple-200">🚌 Service événementiel</h4>
              <div class="text-purple-700 dark:text-purple-300 text-sm space-y-2">
                <p><strong>Départs :</strong> Toutes les 15 minutes environ</p>
                <p><strong>Avant l'événement :</strong> 30 min avant l'ouverture des portes jusqu'à 10 min avant le début</p>
                <p><strong>Après l'événement :</strong> Navettes dès qu'elles sont pleines, jusqu'à 2h après la fin</p>
              </div>
              <div class="flex flex-wrap gap-2 mt-3">
                <span class="badge badge-primary badge-outline">Véhicules climatisés</span>
                <span class="badge badge-primary badge-outline">Accessibilité PMR</span>
                <span class="badge badge-secondary badge-outline">Service prolongé si nécessaire</span>
              </div>
            </div>

            <!-- Informations pratiques -->
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 class="font-semibold mb-2 text-blue-800 dark:text-blue-200">💡 Informations pratiques</h4>
              <p class="text-blue-700 dark:text-blue-300 text-sm mb-3">
                La navette fonctionne uniquement lors des événements au Zénith d'Auvergne.
                Consultez la programmation pour connaître les horaires spécifiques.
              </p>
              <div class="flex flex-wrap gap-2">
                <a href="../tarifs.html" class="btn btn-sm btn-primary">Tarifs navette</a>
                <a href="https://zenith-auvergne.com" target="_blank" class="btn btn-sm btn-outline btn-secondary">Programmation Zénith</a>
              </div>
            </div>
        </div>
      </div>
    </div>
  `;
}

// Affichage des prochaines navettes selon les événements
function renderNextShuttleInfo(events) {
  const nextBusTime = document.getElementById('nextBusTime');
  if (!nextBusTime) return;

  const now = new Date();
  let currentEvents = [];
  let upcomingEvents = [];

  // Trier et catégoriser tous les événements valides
  events.forEach(event => {
    const startDate = new Date(event.debut);
    const endDate = new Date(event.fin);
    const announceDate = new Date(event.annonce);

    if (now >= announceDate && now <= endDate) {
      if (now >= startDate && now <= endDate) {
        currentEvents.push({ ...event, startDate, endDate });
      } else if (now < startDate) {
        upcomingEvents.push({ ...event, startDate, endDate });
      }
    }
  });

  // Trier les événements en cours par date de fin (le plus urgent en premier)
  currentEvents.sort((a, b) => a.endDate - b.endDate);
  
  // Trier les événements à venir par date de début (le plus proche en premier)
  upcomingEvents.sort((a, b) => a.startDate - b.startDate);

  if (currentEvents.length > 0) {
    const mainEvent = currentEvents[0];
    const additionalCount = currentEvents.length - 1;
    
    nextBusTime.innerHTML = `
      <div class="card bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-xl">
        <div class="card-body items-center text-center">
          <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <h3 class="card-title text-xl">🔥 Événement en cours</h3>
          <p class="text-sm opacity-90">Navettes actives toutes les 15 minutes</p>
          <p class="text-xs opacity-75 mt-2">${mainEvent.titre}</p>
          ${additionalCount > 0 ? `<p class="text-xs opacity-60 mt-1">+ ${additionalCount} autre${additionalCount > 1 ? 's' : ''} événement${additionalCount > 1 ? 's' : ''}</p>` : ''}
        </div>
      </div>
    `;
  } else if (upcomingEvents.length > 0) {
    const nextEvent = upcomingEvents[0];
    const timeUntilStart = Math.ceil((nextEvent.startDate - now) / (1000 * 60 * 60 * 24));
    const additionalCount = upcomingEvents.length - 1;
    
    nextBusTime.innerHTML = `
      <div class="card bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-xl">
        <div class="card-body items-center text-center">
          <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="card-title text-xl">📅 Événement à venir</h3>
          <p class="text-sm opacity-90">Service navette dans ${timeUntilStart} jour${timeUntilStart > 1 ? 's' : ''}</p>
          <p class="text-xs opacity-75 mt-2">${nextEvent.titre}</p>
          ${additionalCount > 0 ? `<p class="text-xs opacity-60 mt-1">+ ${additionalCount} autre${additionalCount > 1 ? 's' : ''} événement${additionalCount > 1 ? 's' : ''}</p>` : ''}
        </div>
      </div>
    `;
  } else {
    nextBusTime.innerHTML = `
      <div class="card bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-xl">
        <div class="card-body items-center text-center">
          <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="card-title text-xl">Service temporaire</h3>
          <p class="text-sm opacity-90">Navette disponible uniquement lors des événements</p>
          <p class="text-xs opacity-75 mt-2">Consultez la programmation du Zénith</p>
        </div>
      </div>
    `;
  }
}

function updateCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  // Note: pas d'élément current-time dans ligne.html, on peut l'omettre
  const destination = document.getElementById("destination");
  if (destination) {
    destination.innerHTML = `<h2 class="text-4xl text-primary-content dark:text-primary font-bold">Navette Spéciale NS ♿</h2><p class="text-lg text-primary-content/80 dark:text-primary/80 mt-2">Gare SNCF ↔ Zénith d'Auvergne</p>`;
  }
}

// Fonctions pour gérer le spinner de chargement de la page
function showPageSpinner() {
  const existingSpinner = document.getElementById('page-loading-spinner');
  if (existingSpinner) return;
  
  const spinner = document.createElement('div');
  spinner.id = 'page-loading-spinner';
  spinner.innerHTML = `
    <div class="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-4"></div>
        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Chargement de la navette NS</h3>
        <p class="text-gray-600 dark:text-gray-400">Récupération des événements en cours...</p>
      </div>
    </div>
  `;
  document.body.appendChild(spinner);
}

function hidePageSpinner() {
  const spinner = document.getElementById('page-loading-spinner');
  if (spinner) {
    spinner.style.opacity = '0';
    spinner.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => spinner.remove(), 300);
  }
}

// Initialisation de la page navette spéciale
async function initNavetteSpecialePage() {
  console.log("🚀 [NS] Initialisation de la page navette spéciale");
  
  // Afficher le spinner de chargement
  showPageSpinner();
  
  try {
    // Chargement des données de trafic
    const trafficData = await fetchTrafficData();
  renderTrafficInfo(trafficData);
  
  // Chargement des données d'événements
  const eventData = await fetchEventData();
  renderEventInfo(eventData);
  
  // Affichage des prochaines navettes
  renderNextShuttleInfo(eventData);
  
  // Chargement des informations de ligne
  const lineData = await fetchLineDetails();
  renderLineDetails(lineData);
  
  // Mise à jour du temps
  updateCurrentTime();
  
  // Actualisation périodique
  setInterval(updateCurrentTime, 1000);
  setInterval(async () => {
    const trafficData = await fetchTrafficData();
    renderTrafficInfo(trafficData);
    
    const eventData = await fetchEventData();
    renderEventInfo(eventData);
    renderNextShuttleInfo(eventData);
  }, 60000); // Actualisation toutes les minutes
  
  } catch (error) {
    console.error('❌ [NS] Erreur lors de l\'initialisation:', error);
    // Afficher un message d'erreur à l'utilisateur
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div class="text-center p-8">
          <div class="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Erreur de chargement</h1>
          <p class="text-gray-600 dark:text-gray-400 mb-4">Impossible de charger les données de la navette spéciale.</p>
          <button onclick="location.reload()" class="btn btn-primary">Réessayer</button>
        </div>
      </div>
    `;
  } finally {
    // Masquer le spinner dans tous les cas
    setTimeout(() => hidePageSpinner(), 1000);
  }
}

// Lancement de l'initialisation
initNavetteSpecialePage();
