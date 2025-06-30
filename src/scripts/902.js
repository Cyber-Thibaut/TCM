// Script spécialisé pour ligne TAD 901 (Transport À la Demande)
// Ligne: Bellevue <> Haute-Ville

let holidayDates = [];

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchHolidayDates(year) {
  try {
    const response = await fetch(
      `https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`
    );
    const data = await response.json();
    holidayDates = Object.values(data).map((dateStr) =>
      formatDate(new Date(dateStr))
    );
  } catch (error) {
    console.error("Erreur lors du chargement des jours fériés :", error);
  }
}

async function fetchVacationDates(date) {
  const year = date.getFullYear();
  const schoolYears = [`${year - 1}-${year}`, `${year}-${year + 1}`];
  try {
    const responses = await Promise.all(
      schoolYears.map((schoolYear) =>
        fetch(
          `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records?limit=100&lang=fr&refine=location%3A%22Clermont-Ferrand%22&refine=annee_scolaire%3A%22${schoolYear}%22`
        )
      )
    );
    const data = await Promise.all(responses.map((r) => r.json()));
    return data.flatMap((d) =>
      d.results.map((record) => ({
        start: new Date(record.start_date),
        end: new Date(record.end_date),
        description: record.description,
      }))
    );
  } catch (error) {
    console.error("Erreur lors du chargement des vacances scolaires :", error);
    return [];
  }
}

function isDateInVacationRanges(date, ranges) {
  return ranges.some((range) => date >= range.start && date <= range.end);
}

// Récupération des données de trafic
async function fetchTrafficData() {
  try {
    const response = await fetch("https://raw.githubusercontent.com/Cyber-Thibaut/infotrafic/main/info.json");
    //const response = await fetch("test.json");
    const data = await response.json();
    return data.perturbations || [];
  } catch (error) {
    console.error("Erreur lors du chargement des données de trafic:", error);
    return [];
  }
}

// Affichage de l'encart trafic harmonisé
function renderTrafficInfo(perturbations) {
  const trafficContainer = document.getElementById("lignes");
  if (!trafficContainer) return;

  const now = new Date();
  const activeIncidents = perturbations.filter((p) => {
    const startDate = new Date(p.date_debut);
    const endDate = new Date(p.date_fin);
    return (
      now >= startDate &&
      now <= endDate &&
      (p.lignes_impactees.includes(901) || p.lignes_impactees.includes("901"))
    );
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
              <h3 class="font-semibold text-green-800 dark:text-green-200">Trafic normal</h3>
              <p class="text-green-600 dark:text-green-300 text-sm">Aucune perturbation signalée sur cette ligne TAD</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    const incidentText =
      activeIncidents.length === 1
        ? "1 incident en cours"
        : `${activeIncidents.length} incidents en cours`;

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
                <p class="text-orange-600 dark:text-orange-300 text-sm">${incidentText} sur cette ligne TAD</p>
              </div>
            </div>
            <a href="../details.html#901" class="btn btn-sm btn-outline btn-primary">Voir détails</a>
          </div>
        </div>
      </div>
    `;
  }
}

// Récupération des informations de ligne
async function fetchLineDetails() {
  try {
    const response = await fetch("../ligne.json");
    const data = await response.json();
    const line = data.lignes.find((l) => l.id === 901);
    return (
      line || {
        id: 902,
        nom: "Parc de l'Étang <> Observatoire",
        type: "Volca'Demande",
        description:
          "Service de transport à la demande reliant le Parc de l'Étang à l'Observatoire, idéal pour les déplacements vers les sites naturels et scientifiques.",
        stats: {
          nombre_arrets: 17,
          temps_trajet: "20 minutes",
          longueur_ligne: "5 km",
        },
      }
    );
  } catch (error) {
    console.error("Erreur lors du chargement des détails de ligne:", error);
    return {
      id: 902,
      nom: "Parc de l'Étang <> Observatoire",
      type: "Volca'Demande",
      description:
        "Service de transport à la demande reliant le Parc de l'Étang à l'Observatoire, idéal pour les déplacements vers les sites naturels et scientifiques.",
      stats: {
        nombre_arrets: 17,
        temps_trajet: "20 minutes",
        longueur_ligne: "5 km",
      },
    };
  }
}

// Affichage des informations de ligne harmonisé
function renderLineDetails(lineData) {
  const lineContainer = document.getElementById("infos-ligne");
  if (!lineContainer) return;

  // Header avec logo et titre
  const header = document.createElement("div");
  header.className = "flex items-center justify-center gap-4 text-center mb-8";
  const logo = document.createElement("img");
  logo.src = `/img/901.png`;
  logo.alt = `Ligne 901`;
  logo.className = "w-20 h-20";
  const title = document.createElement("h2");
  title.className = "text-4xl lg:text-5xl font-bold text-primary";
  title.textContent = lineData.nom || "Ligne TAD 901";
  header.appendChild(logo);
  header.appendChild(title);
  lineContainer.appendChild(header);

  // Plan de ligne en pleine largeur
  const planContainer = document.createElement("div");
  planContainer.className = "mb-8";

  const planTitle = document.createElement("h3");
  planTitle.className = "text-2xl font-bold mb-4 text-center text-primary";
  planTitle.textContent = "Plan de la ligne";
  planContainer.appendChild(planTitle);

  const plan = document.createElement("img");
  plan.src = `/img/plans/L902.png`;
  plan.alt = `Plan de la ligne 901`;
  plan.className =
    "rounded-xl shadow-lg w-full h-auto border border-base-300 dark:border-base-content/10 transition-transform hover:scale-105";
  plan.style.maxHeight = "400px";
  plan.style.objectFit = "contain";

  // Fallback si l'image n'existe pas
  plan.onerror = function () {
    this.style.display = "none";
    const fallback = document.createElement("div");
    fallback.className =
      "bg-base-200 dark:bg-base-300 rounded-xl p-8 text-center";
    fallback.innerHTML = `
      <svg class="w-16 h-16 mx-auto mb-2 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
      </svg>
      <p class="text-base-content/60">Plan de ligne disponible sur tcm-mobilite.fr</p>
    `;
    this.parentNode.appendChild(fallback);
  };

  planContainer.appendChild(plan);
  lineContainer.appendChild(planContainer);

  // Informations de ligne en dessous
  const infoContainer = document.createElement("div");
  infoContainer.className =
    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8";

  // Badge type de ligne TAD
  const typeContainer = document.createElement("div");
  typeContainer.className =
    "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg";

  const typeIcon = document.createElement("div");
  typeIcon.className = "text-4xl mb-3";
  typeIcon.textContent = "📞";

  const type = document.createElement("div");
  type.className =
    "badge badge-lg badge-outline badge-warning px-4 py-3 text-base font-semibold";
  type.textContent = "Transport à la Demande";

  typeContainer.appendChild(typeIcon);
  typeContainer.appendChild(type);
  infoContainer.appendChild(typeContainer);

  // Statistiques - Arrêts
  const arretsContainer = document.createElement("div");
  arretsContainer.className =
    "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg";

  const arretsIcon = document.createElement("div");
  arretsIcon.className = "text-4xl mb-3";
  arretsIcon.textContent = "🚏";

  const arretsTitle = document.createElement("div");
  arretsTitle.className =
    "text-sm font-medium text-base-content/70 uppercase tracking-wider";
  arretsTitle.textContent = "Arrêts";

  const arretsValue = document.createElement("div");
  arretsValue.className = "text-3xl font-bold text-primary";
  arretsValue.textContent = lineData.stats.nombre_arrets || "Variable";

  arretsContainer.appendChild(arretsIcon);
  arretsContainer.appendChild(arretsTitle);
  arretsContainer.appendChild(arretsValue);
  infoContainer.appendChild(arretsContainer);

  // Statistiques - Temps de trajet
  const tempsContainer = document.createElement("div");
  tempsContainer.className =
    "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg";

  const tempsIcon = document.createElement("div");
  tempsIcon.className = "text-4xl mb-3";
  tempsIcon.textContent = "⏱️";

  const tempsTitle = document.createElement("div");
  tempsTitle.className =
    "text-sm font-medium text-base-content/70 uppercase tracking-wider";
  tempsTitle.textContent = "Temps de trajet";

  const tempsValue = document.createElement("div");
  tempsValue.className = "text-3xl font-bold text-primary";
  tempsValue.textContent = lineData.stats.temps_trajet || "Variable";

  tempsContainer.appendChild(tempsIcon);
  tempsContainer.appendChild(tempsTitle);
  tempsContainer.appendChild(tempsValue);
  infoContainer.appendChild(tempsContainer);

  // Statistiques - Distance
  const distanceContainer = document.createElement("div");
  distanceContainer.className =
    "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg";

  const distanceIcon = document.createElement("div");
  distanceIcon.className = "text-4xl mb-3";
  distanceIcon.textContent = "📏";

  const distanceTitle = document.createElement("div");
  distanceTitle.className =
    "text-sm font-medium text-base-content/70 uppercase tracking-wider";
  distanceTitle.textContent = "Distance";

  const distanceValue = document.createElement("div");
  distanceValue.className = "text-3xl font-bold text-primary";
  distanceValue.textContent = lineData.stats.longueur_ligne || "Variable";

  distanceContainer.appendChild(distanceIcon);
  distanceContainer.appendChild(distanceTitle);
  distanceContainer.appendChild(distanceValue);
  infoContainer.appendChild(distanceContainer);

  lineContainer.appendChild(infoContainer);

  // Informations spécifiques TAD
  const tadInfoContainer = document.createElement("div");
  tadInfoContainer.className =
    "bg-orange-50 dark:bg-orange-900/20 rounded-xl p-6 mb-6";

  tadInfoContainer.innerHTML = `
    <h4 class="text-xl font-bold mb-4 text-orange-800 dark:text-orange-200">📞 Service Transport à la Demande</h4>
    <div class="grid md:grid-cols-2 gap-4 mb-4">
      <div>
        <h5 class="font-semibold mb-2 text-orange-700 dark:text-orange-300">Comment ça marche ?</h5>
        <ul class="text-sm space-y-1 text-orange-600 dark:text-orange-400">
          <li>• Réservation obligatoire 24h à l'avance</li>
          <li>• Service de porte à porte dans la zone</li>
          <li>• Horaires flexibles selon vos besoins</li>
          <li>• Tarification identique au réseau TCM</li>
        </ul>
      </div>
      <div>
        <h5 class="font-semibold mb-2 text-orange-700 dark:text-orange-300">Réservation</h5>
        <p class="text-sm text-orange-600 dark:text-orange-400 mb-2">
          Contactez nos agences pour réserver votre trajet
        </p>
        <div class="flex flex-wrap gap-2">
          <a href="../agences.html" class="btn btn-sm btn-warning">Nos agences</a>
          <a href="../tarifs.html" class="btn btn-sm btn-outline btn-warning">Tarifs</a>
        </div>
      </div>
    </div>
  `;

  lineContainer.appendChild(tadInfoContainer);

  // Description si disponible
  if (lineData.description) {
    const description = document.createElement("p");
    description.className =
      "text-lg text-base-content/80 leading-relaxed text-justify mb-6";
    description.innerHTML = lineData.description;
    lineContainer.appendChild(description);
  }
}

function buildAlert(icon, message) {
  return `
    <div role="alert" class="alert alert-warning">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${icon}" />
      </svg>
      <span>${message}</span>
    </div>
  `;
}

async function updateBusTimes() {
  const now = new Date();
  const todayStr = formatDate(now);
  const currentYear = now.getFullYear();
  const premierMai = new Date(currentYear, 4, 1);

  await fetchHolidayDates(currentYear);
  const vacationRanges = await fetchVacationDates(now);

  const isHoliday = holidayDates.includes(todayStr);
  const isVacation = isDateInVacationRanges(now, vacationRanges);
  const isPremierMai = now.toDateString() === premierMai.toDateString();

  const alertMessage = document.getElementById("alertMessage");
  const nextBusTime = document.getElementById("nextBusTime");

  // Message TAD spécialisé
  if (nextBusTime) {
    nextBusTime.innerHTML = `
      <div class="card bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl">
        <div class="card-body items-center text-center">
          <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
          </svg>
          <h3 class="card-title text-xl">Service sur réservation</h3>
          <p class="text-sm opacity-90">Contactez nos agences pour planifier votre trajet TAD</p>
        </div>
      </div>
    `;
  }

  // Messages contextuels
  if (alertMessage) {
    if (isPremierMai) {
      alertMessage.innerHTML = buildAlert(
        "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
        "Service TAD fermé le 1er Mai - Réouverture dès demain"
      );
    } else if (isHoliday) {
      alertMessage.innerHTML = buildAlert(
        "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
        "Service TAD adapté aujourd'hui - Horaires spéciaux jour férié"
      );
    } else if (isVacation) {
      alertMessage.innerHTML = buildAlert(
        "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
        "Service TAD maintenu pendant les vacances - Réservation recommandée"
      );
    } else {
      alertMessage.innerHTML = "";
    }
  }
}

function updateCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  // Note: pas d'élément current-time dans ligne.html, on peut l'omettre
  const destination = document.getElementById("destination");
  if (destination) {
    destination.innerHTML = `<h2 class="text-4xl text-primary-content dark:text-primary font-bold">Volca'Demande 902 ♿</h2><p class="text-lg text-primary-content/80 dark:text-primary/80 mt-2">Parc de l'Étang <> Observatoire</p>`;
  }
}

// Initialisation de la page TAD
async function initTADPage() {
  // Chargement des données de trafic
  const trafficData = await fetchTrafficData();
  renderTrafficInfo(trafficData);

  // Chargement des informations de ligne
  const lineData = await fetchLineDetails();
  renderLineDetails(lineData);

  // Mise à jour des horaires TAD
  updateBusTimes();
  updateCurrentTime();

  // Actualisation périodique
  setInterval(updateBusTimes, 30000);
  setInterval(updateCurrentTime, 1000);
  setInterval(async () => {
    const trafficData = await fetchTrafficData();
    renderTrafficInfo(trafficData);
  }, 60000); // Trafic toutes les minutes
}

// Lancement de l'initialisation
initTADPage();
