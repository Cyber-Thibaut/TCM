const nextBusTime = document.getElementById("nextBusTime");
const alertMessage = document.getElementById("alertMessage");
const currentTimeElement = document.getElementById("current-time");
const destinationElement = document.getElementById("destination");

let holidayDates = [];
let lineDetailsData = null;

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTime(timeString) {
  const [hour, minute] = timeString.split(":").map(Number);
  return { hour, minute };
}

async function fetchHolidayDates(year) {
  try {
    const response = await fetch(
      `https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`
    );
    const data = await response.json();
    holidayDates = Object.keys(data);
  } catch (error) {
    console.error("Erreur de récupération des jours fériés:", error);
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

async function fetchLineDetails(lineNumber) {
  try {
    const response = await fetch("ligne.json");
    const data = await response.json();
    const line = data.lignes.find((l) => l.id === parseInt(lineNumber));
    if (!line)
      throw new Error(`Détails non trouvés pour la ligne ${lineNumber}`);
    return line;
  } catch (err) {
    console.error("Erreur chargement détails ligne:", err);
    return null;
  }
}

function renderLineDetails(ligne) {
  const container = document.getElementById("infos-ligne");
  if (!container) return;
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "flex items-center justify-center gap-4 text-center mb-8";
  
  // Logo TCM
  const logoTCM = document.createElement("img");
  logoTCM.src = `/img/TCM.png`;
  logoTCM.alt = `Logo TCM`;
  logoTCM.className = "w-16 h-16";
  
  const logo = document.createElement("img");
  logo.src = `/img/${ligne.id}.png`;
  logo.alt = `Ligne ${ligne.id}`;
  logo.className = "w-20 h-20";
  
  const title = document.createElement("h2");
  title.className = "text-4xl lg:text-5xl font-bold text-primary";
  title.textContent = ligne.nom;
  
  header.appendChild(logoTCM);
  header.appendChild(logo);
  header.appendChild(title);
  container.appendChild(header);

  // Plan de ligne en pleine largeur avec titre amélioré
  const planContainer = document.createElement("div");
  planContainer.className = "mb-12";
  
  const planTitle = document.createElement("h3");
  planTitle.className = "text-2xl font-bold mb-6 text-center text-primary flex items-center justify-center gap-3";
  planTitle.innerHTML = `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
    </svg>
    Plan de la ligne
  `;
  planContainer.appendChild(planTitle);
  
  const plan = document.createElement("img");
  plan.src = `/img/plans/L${ligne.id}.png`;
  plan.alt = `Plan de la ligne ${ligne.id}`;
  plan.className =
    "rounded-xl shadow-lg w-full h-auto border border-base-300 dark:border-base-content/10 transition-transform hover:scale-105";
  plan.style.maxHeight = "400px";
  plan.style.objectFit = "contain";
  planContainer.appendChild(plan);
  
  // Section des horaires scolaires - Extraction dynamique depuis les fonctions
  const schedulesSection = document.createElement("div");
  schedulesSection.className = "mb-12";
  
  const schedulesContainer = document.createElement("div");
  schedulesContainer.className = "bg-base-100 dark:bg-base-200 rounded-xl shadow-lg p-6";
  
  const schedulesTitle = document.createElement("h3");
  schedulesTitle.className = "text-2xl font-bold mb-6 text-center text-primary flex items-center justify-center gap-3";
  schedulesTitle.innerHTML = `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    Horaires de passage
  `;
  schedulesContainer.appendChild(schedulesTitle);
  
  // Extraction des horaires depuis les fonctions calculateNextBusTime et calculateFollowingBusTime
  const schedulesBusData = {
    // Horaires du 1er car (calculateNextBusTime)
    firstCar: {
      3: { morning: "07:15", evening: "12:45" }, // Mercredi
      default: { morning: "07:15", evening: "16:45" },
    },
    // Horaires du 2e car (calculateFollowingBusTime) 
    secondCar: {
      3: { morning: "08:30", evening: "18:00" }, // Mercredi
      default: { morning: "08:30", evening: "18:30" },
    }
  };
  
  const scheduleGrid = document.createElement("div");
  scheduleGrid.className = "grid grid-cols-1 lg:grid-cols-2 gap-6";
  
  // Direction Aller
  const directionAller = document.createElement("div");
  directionAller.className = "bg-base-200 dark:bg-base-300 rounded-lg p-4";
  directionAller.innerHTML = `
    <h4 class="text-lg font-semibold mb-4 text-primary flex items-center gap-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
      </svg>
      Direction Aller
    </h4>
    <div class="space-y-3">
      <div class="bg-base-100 dark:bg-base-200 rounded-lg p-3">
        <div class="text-sm font-medium text-base-content/70 mb-2">Lundi - Mardi - Jeudi - Vendredi</div>
        <div class="flex gap-2 flex-wrap">
          <span class="badge badge-primary badge-lg">Car 1: ${schedulesBusData.firstCar.default.morning}</span>
          <span class="badge badge-secondary badge-lg">Car 2: ${schedulesBusData.secondCar.default.morning}</span>
        </div>
        <div class="text-xs text-base-content/60 mt-1">2 cars disponibles le matin</div>
      </div>
      <div class="bg-base-100 dark:bg-base-200 rounded-lg p-3">
        <div class="text-sm font-medium text-base-content/70 mb-2">Mercredi</div>
        <div class="flex gap-2 flex-wrap">
          <span class="badge badge-primary badge-lg">Car 1: ${schedulesBusData.firstCar[3].morning}</span>
          <span class="badge badge-secondary badge-lg">Car 2: ${schedulesBusData.secondCar[3].morning}</span>
        </div>
        <div class="text-xs text-base-content/60 mt-1">2 cars disponibles le matin</div>
      </div>
    </div>
  `;
  
  // Direction Retour
  const directionRetour = document.createElement("div");
  directionRetour.className = "bg-base-200 dark:bg-base-300 rounded-lg p-4";
  directionRetour.innerHTML = `
    <h4 class="text-lg font-semibold mb-4 text-primary flex items-center gap-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"></path>
      </svg>
      Direction Retour
    </h4>
    <div class="space-y-3">
      <div class="bg-base-100 dark:bg-base-200 rounded-lg p-3">
        <div class="text-sm font-medium text-base-content/70 mb-2">Lundi - Mardi - Jeudi - Vendredi</div>
        <div class="flex gap-2 flex-wrap">
          <span class="badge badge-accent badge-lg">Car 1: ${schedulesBusData.firstCar.default.evening}</span>
          <span class="badge badge-info badge-lg">Car 2: ${schedulesBusData.secondCar.default.evening}</span>
        </div>
        <div class="text-xs text-base-content/60 mt-1">2 cars disponibles le soir</div>
      </div>
      <div class="bg-base-100 dark:bg-base-200 rounded-lg p-3">
        <div class="text-sm font-medium text-base-content/70 mb-2">Mercredi</div>
        <div class="flex gap-2 flex-wrap">
          <span class="badge badge-accent badge-lg">Car 1: ${schedulesBusData.firstCar[3].evening}</span>
          <span class="badge badge-info badge-lg">Car 2: ${schedulesBusData.secondCar[3].evening}</span>
        </div>
        <div class="text-xs text-base-content/60 mt-1">2 cars disponibles le soir</div>
      </div>
    </div>
  `;
  
  scheduleGrid.appendChild(directionAller);
  scheduleGrid.appendChild(directionRetour);
  schedulesContainer.appendChild(scheduleGrid);
  
  // Notice importante
  const scheduleNotice = document.createElement("div");
  scheduleNotice.className = "mt-4 p-3 bg-warning/20 text-warning-content rounded-lg text-center";
  scheduleNotice.innerHTML = `
    <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    Horaires valides uniquement en periode scolaire - 4 cars quotidiens
  `;
  schedulesContainer.appendChild(scheduleNotice);
  
  schedulesSection.appendChild(schedulesContainer);
  planContainer.appendChild(schedulesSection);
  container.appendChild(planContainer);

  // Informations de ligne en dessous
  const infoContainer = document.createElement("div");
  infoContainer.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8";

  // Badge type de ligne
  const typeContainer = document.createElement("div");
  typeContainer.className = "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg";
  
  const typeIcon = document.createElement("div");
  typeIcon.className = "text-4xl mb-3";
  typeIcon.innerHTML = `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
  </svg>`;
  
  const type = document.createElement("div");
  type.className = "badge badge-lg badge-outline badge-primary px-4 py-3 text-base font-semibold";
  type.textContent = "Transport Scolaire";
      
  typeContainer.appendChild(typeIcon);
  typeContainer.appendChild(type);
  infoContainer.appendChild(typeContainer);

  // Statistiques avec vérification de l'existence des données
  if (ligne.stats) {
    // Statistiques - Arrêts
    const arretsContainer = document.createElement("div");
    arretsContainer.className = "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg";
    
    const arretsIcon = document.createElement("div");
    arretsIcon.className = "text-4xl mb-3";
    arretsIcon.innerHTML = `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
    </svg>`;
    
    const arretsTitle = document.createElement("div");
    arretsTitle.className = "text-sm font-medium text-base-content/70 uppercase tracking-wider";
    arretsTitle.textContent = "Arrêts";
    
    const arretsValue = document.createElement("div");
    arretsValue.className = "text-3xl font-bold text-primary";
    arretsValue.textContent = ligne.stats.nombre_arrets || "N/A";
    
    arretsContainer.appendChild(arretsIcon);
    arretsContainer.appendChild(arretsTitle);
    arretsContainer.appendChild(arretsValue);
    infoContainer.appendChild(arretsContainer);

    // Statistiques - Temps de trajet
    const tempsContainer = document.createElement("div");
    tempsContainer.className = "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg";
    
    const tempsIcon = document.createElement("div");
    tempsIcon.className = "text-4xl mb-3";
    tempsIcon.innerHTML = `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>`;
    
    const tempsTitle = document.createElement("div");
    tempsTitle.className = "text-sm font-medium text-base-content/70 uppercase tracking-wider";
    tempsTitle.textContent = "Temps de trajet";
    
    const tempsValue = document.createElement("div");
    tempsValue.className = "text-3xl font-bold text-primary";
    tempsValue.textContent = ligne.stats.temps_trajet || "N/A";
    
    tempsContainer.appendChild(tempsIcon);
    tempsContainer.appendChild(tempsTitle);
    tempsContainer.appendChild(tempsValue);
    infoContainer.appendChild(tempsContainer);

    // Statistiques - Longueur
    const longueurContainer = document.createElement("div");
    longueurContainer.className = "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg";
    
    const longueurIcon = document.createElement("div");
    longueurIcon.className = "text-4xl mb-3";
    longueurIcon.innerHTML = `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
    </svg>`;
    
    const longueurTitle = document.createElement("div");
    longueurTitle.className = "text-sm font-medium text-base-content/70 uppercase tracking-wider";
    longueurTitle.textContent = "Longueur";
    
    const longueurValue = document.createElement("div");
    longueurValue.className = "text-3xl font-bold text-primary";
    longueurValue.textContent = ligne.stats.longueur_ligne || "N/A";
    
    longueurContainer.appendChild(longueurIcon);
    longueurContainer.appendChild(longueurTitle);
    longueurContainer.appendChild(longueurValue);
    infoContainer.appendChild(longueurContainer);
  }

  container.appendChild(infoContainer);

  // Description
  if (ligne.description) {
    const description = document.createElement("p");
    description.className =
      "text-lg text-base-content/80 leading-relaxed text-justify mt-8 mb-8";
    description.innerHTML = ligne.description;
    container.appendChild(description);
  }

  if (destinationElement) {
    destinationElement.textContent = ligne.destination || "Ligne 652";
  }
}

function calculateNextBusTime(weekday, hour, minute, isVacation) {
  if (isVacation || estFerie) return -1;

  const schedules = {
    3: { morning: "07:15", evening: "12:45" }, // Mercredi
    default: { morning: "07:15", evening: "16:45" },
  };

  const { morning, evening } = schedules[weekday] || schedules.default;
  const morningMinutes =
    parseTime(morning).hour * 60 + parseTime(morning).minute;
  const eveningMinutes =
    parseTime(evening).hour * 60 + parseTime(evening).minute;
  const current = hour * 60 + minute;

  if (current < morningMinutes && morningMinutes - current <= 60)
    return morningMinutes - current;
  if (current < eveningMinutes && eveningMinutes - current <= 60)
    return eveningMinutes - current;

  return -1;
}

function calculateFollowingBusTime(weekday, hour, minute, isVacation) {
  if (isVacation || estFerie) return -1;

  const schedules = {
    3: { morning: "08:30", evening: "18:00" }, // Mercredi
    default: { morning: "08:30", evening: "18:30" },
  };

  const { morning, evening } = schedules[weekday] || schedules.default;
  const morningMinutes =
    parseTime(morning).hour * 60 + parseTime(morning).minute;
  const eveningMinutes =
    parseTime(evening).hour * 60 + parseTime(evening).minute;
  const current = hour * 60 + minute;

  if (current < morningMinutes && morningMinutes - current <= 60)
    return morningMinutes - current;
  if (current < eveningMinutes && eveningMinutes - current <= 60)
    return eveningMinutes - current;

  return -1;
}

let estFerie = false;

function isInLastWeekBeforeVacation(now, vacationRanges) {
  return vacationRanges.some(({ start }) => {
    const oneWeekBefore = new Date(start);
    oneWeekBefore.setDate(start.getDate() - 7);
    return now >= oneWeekBefore && now < start;
  });
}

async function updateBusTimes() {
  const now = new Date();
  const date = formatDate(now);
  estFerie = holidayDates.includes(date);
  const vacationDates = await fetchVacationDates(now);
  const isVacation = isDateInVacationRanges(now, vacationDates);
  const isLastWeek = isInLastWeekBeforeVacation(now, vacationDates);

  const isDay = now.getHours() >= 6 && now.getHours() < 18;

  const nextBusFreq = calculateNextBusTime(
    now.getDay(),
    now.getHours(),
    now.getMinutes(),
    isVacation
  );
  const followingBusFreq = calculateFollowingBusTime(
    now.getDay(),
    now.getHours(),
    now.getMinutes(),
    isVacation
  );

  // Messages spéciaux
  alertMessage.classList.remove("hidden");
  if (estFerie) {
    alertMessage.innerHTML = `
      <div class="alert alert-warning shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L12.732 4.5c-.77-.833-2.186-.833-2.956 0L2.858 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>Jour férié : Aucun car aujourd'hui. Profitez de votre repos</span>
      </div>`;
    destinationElement.innerHTML = "";
    nextBusTime.innerHTML = "";
    return;
  }

  if (isVacation) {
    alertMessage.innerHTML = `
      <div class="alert alert-info shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>C'est les vacances ! Aucun car scolaire en circulation. Bonnes vacances</span>
      </div>`;
    destinationElement.innerHTML = "";
    nextBusTime.innerHTML = "";
    return;
  }

  if (isLastWeek) {
    alertMessage.innerHTML = `
      <div class="alert alert-success shadow-lg text-lg flex flex-col">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Dernière semaine avant les vacances !</span>
        <span>Allez, encore quelques trajets et tu pourras chiller !</span>
      </div>`;
  } else {
    alertMessage.innerHTML = "";
  }

  // Destination
  if (now.getHours() >= 6 && now.getHours() < 9) {
    destinationElement.innerHTML = `<div class="w-full flex justify-center py-8">
    <div class="p-6 w-3/4 lg:w-1/2 bg-gradient-to-r from-primary to-secondary rounded-xl shadow-lg text-center">
      <h2 class="text-5xl font-semibold text-white">Direction Collège Victor Hugo</h2>
    </div>
  </div>`;
  } else if (now.getHours() >= 11 && now.getHours() < 19) {
    destinationElement.innerHTML = `<div class="w-full flex justify-center py-8">
    <div class="p-6 w-3/4 lg:w-1/2 bg-gradient-to-r from-primary to-secondary rounded-xl shadow-lg text-center">
      <h2 class="text-5xl font-semibold text-white">Retour vers LE ROTO Avenue du Parc</h2>
    </div>
  </div>`;
  } else {
    destinationElement.innerHTML = "";
  }

  // Affichage stylé des bus
  const cards = [];

  const makeCard = (label, delay, theme = "primary") => `
    <div class="card glass bg-gradient-to-br from-${theme}-200 to-${theme}-400 shadow-xl text-center px-6 py-4 max-w-xs">
      <div class="card-body items-center">
        <h3 class="card-title text-2xl font-bold">${label}</h3>
        <p class="text-5xl font-extrabold text-${theme}-800">${
    delay === 1 ? "1 min" : delay + " min"
  }</p>
        <div class="badge badge-outline badge-lg mt-2 animate-bounce">${
          delay <= 2 ? "Monte vite !" : "T'as encore le temps"
        }</div>
      </div>
    </div>`;

  if (nextBusFreq === 1) {
    cards.push(makeCard("À quai", nextBusFreq, "success"));
  } else if (nextBusFreq === 2) {
    cards.push(makeCard("À l'approche", nextBusFreq, "warning"));
  } else if (nextBusFreq > 0) {
    cards.push(makeCard("Prochain départ", nextBusFreq, "info"));
  }

  if (followingBusFreq > 0) {
    cards.push(makeCard("Suivant", followingBusFreq, "secondary"));
  }

  if (cards.length === 0) {
    nextBusTime.innerHTML = `
      <div class="alert alert-info shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Aucun car dans l'heure à venir. Pense à checker les horaires</span>
      </div>`;
  } else {
    nextBusTime.innerHTML = `
      <div class="flex flex-col lg:flex-row justify-center items-stretch gap-6">${cards.join(
        ""
      )}</div>`;
  }

  if (cards.length === 0 && !isVacation && !estFerie) {
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    nextBusTime.innerHTML = `
        <div class="alert alert-info shadow-lg text-lg">
          ${
            isWeekend
              ? "C'est le week-end ! Aucun bus scolaire ne circule. Détends-toi et profite"
              : isDay
              ? "Aucun car scolaire ne circule. Regarde tes cours plutôt que le prochain bus on sera là à l'heure"
              : "Les bus scolaires ne circulent plus pour aujourd'hui. Repose-toi bien, on t'attend demain frais et dispo !"
          }
        </div>`;
  }
}

async function init() {
  const lineNumber = window.location.hash.replace("#", "");

  if (!lineNumber || lineNumber !== "652") {
    const infosContainer = document.getElementById("infos-ligne");
    if (infosContainer) {
      infosContainer.innerHTML = `
        <div class="text-center py-16">
          <h1 class="text-8xl font-bold text-primary animate-pulse">404</h1>
          <p class="text-3xl font-semibold mt-4 tracking-wider">Ligne Introuvable</p>
          <p class="text-lg mt-2 text-base-content/70">
            La ligne <span class="font-bold text-primary">${lineNumber}</span> que vous cherchez n'existe pas.
          </p>
          <div class="mt-8">
            <a href="/index.html" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clip-rule="evenodd" />
              </svg>
              Retour à l'accueil
            </a>
          </div>
        </div>
      `;
    }
    return;
  }

  const now = new Date();
  await fetchHolidayDates(now.getFullYear());

  lineDetailsData = await fetchLineDetails(lineNumber);

  if (lineDetailsData) {
    renderLineDetails(lineDetailsData);
  } else {
    // Créer une ligne par défaut pour 652
    const defaultLine = {
      id: 652,
      nom: "Ligne 652",
      destination: "Collège Victor Hugo <> LE ROTO Avenue du Parc",
      type: "Scolaire",
      description:
        "Transport scolaire reliant LE ROTO Avenue du Parc au Collège Victor Hugo à Clermont-Ferrand.",
      stats: {
        nombre_arrets: "7",
        temps_trajet: "30 min",
        longueur_ligne: "18 km",
      },
    };
    renderLineDetails(defaultLine);
  }

  updateBusTimes();
  setInterval(updateBusTimes, 30000);
}

window.addEventListener("DOMContentLoaded", init);
