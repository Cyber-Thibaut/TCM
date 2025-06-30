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
    console.log("Données des jours fériés reçues :", data); // Log de débogage
    holidayDates = Object.keys(data).map((dateStr) => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.error("Date invalide :", dateStr); // Log de débogage
        return "NaN-NaN-NaN";
      }
      const formattedDate = formatDate(date);
      console.log("Date formatée :", formattedDate); // Log de débogage
      return formattedDate;
    });
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
  const getSchedulesData = () => {
    // Horaires du 1er car (calculateNextBusTime)
    const firstCarSchedules = {
      3: { morning: "07:15", evening: "12:45" }, // Mercredi
      default: { morning: "07:15", evening: "16:45" },
    };
    
    // Horaires du 2e car (calculateFollowingBusTime) 
    const secondCarSchedules = {
      3: { morning: "08:30", evening: "18:00" }, // Mercredi
      default: { morning: "08:30", evening: "18:30" },
    };
    
    return { firstCarSchedules, secondCarSchedules };
  };
  
  const { firstCarSchedules, secondCarSchedules } = getSchedulesData();
  
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
          <span class="badge badge-primary badge-lg">Car 1: ${firstCarSchedules.default.morning}</span>
          <span class="badge badge-secondary badge-lg">Car 2: ${secondCarSchedules.default.morning}</span>
        </div>
        <div class="text-xs text-base-content/60 mt-1">2 cars disponibles le matin</div>
      </div>
      <div class="bg-base-100 dark:bg-base-200 rounded-lg p-3">
        <div class="text-sm font-medium text-base-content/70 mb-2">Mercredi</div>
        <div class="flex gap-2 flex-wrap">
          <span class="badge badge-primary badge-lg">Car 1: ${firstCarSchedules[3].morning}</span>
          <span class="badge badge-secondary badge-lg">Car 2: ${secondCarSchedules[3].morning}</span>
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
          <span class="badge badge-accent badge-lg">Car 1: ${firstCarSchedules.default.evening}</span>
          <span class="badge badge-info badge-lg">Car 2: ${secondCarSchedules.default.evening}</span>
        </div>
        <div class="text-xs text-base-content/60 mt-1">2 cars disponibles le soir</div>
      </div>
      <div class="bg-base-100 dark:bg-base-200 rounded-lg p-3">
        <div class="text-sm font-medium text-base-content/70 mb-2">Mercredi</div>
        <div class="flex gap-2 flex-wrap">
          <span class="badge badge-accent badge-lg">Car 1: ${firstCarSchedules[3].evening}</span>
          <span class="badge badge-info badge-lg">Car 2: ${secondCarSchedules[3].evening}</span>
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

  // Section des statistiques en cartes
  const statsSection = document.createElement("div");
  statsSection.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8";

  // Badge type de ligne
  const typeCard = document.createElement("div");
  typeCard.className = "card bg-primary/10 dark:bg-primary/20 border border-primary/20";
  typeCard.innerHTML = `
    <div class="card-body p-4 text-center">
      <div class="badge badge-primary badge-lg px-4 py-3 text-sm font-semibold w-full">
        Transport Scolaire
      </div>
    </div>
  `;
  statsSection.appendChild(typeCard);

  // Statistiques de ligne
  if (ligne.stats) {
    const stats = [
      { titre: "Arrêts", valeur: ligne.stats.nombre_arrets || "N/A", icone: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M9 10l-4.553-2.276A1 1 0 013 8.618v6.764a1 1 0 001.447.894L9 14" },
      { titre: "Temps de trajet", valeur: ligne.stats.temps_trajet || "N/A", icone: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
      { titre: "Distance", valeur: ligne.stats.longueur_ligne || "N/A", icone: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" }
    ];

    stats.forEach(stat => {
      const statCard = document.createElement("div");
      statCard.className = "card bg-base-200 dark:bg-base-300 border border-base-300 dark:border-base-content/10";
      statCard.innerHTML = `
        <div class="card-body p-4">
          <div class="flex items-center gap-3 mb-2">
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${stat.icone}"></path>
            </svg>
            <div class="text-sm font-medium text-base-content/70">${stat.titre}</div>
          </div>
          <div class="text-2xl font-bold text-primary">${stat.valeur}</div>
        </div>
      `;
      statsSection.appendChild(statCard);
    });
  }

  container.appendChild(statsSection);

  // Description
  if (ligne.description) {
    const description = document.createElement("div");
    description.className = "prose max-w-none mb-8";
    description.innerHTML = `<p class="text-lg text-base-content/80 leading-relaxed">${ligne.description}</p>`;
    container.appendChild(description);
  }

  // Bouton PDF en bas
  const pdfButton = document.createElement("div");
  pdfButton.className = "text-center";
  pdfButton.innerHTML = `
    <button id="pdf-button" class="btn btn-primary btn-lg gap-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      Télécharger la fiche horaire PDF
    </button>
  `;
  
  const pdfBtn = pdfButton.querySelector('#pdf-button');
  pdfBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof generatePDF === "function") {
      generatePDF(ligne.id);
    } else {
      console.error("generatePDF is not defined. Is pdf.js loaded?");
      alert("La fonction de génération de PDF n'est pas disponible.");
    }
  });
  
  container.appendChild(pdfButton);

  // Mettre à jour l'élément destination si il existe
  if (destinationElement) {
    destinationElement.textContent = ligne.destination || `Ligne ${ligne.id}`;
  }
}

async function updateBusTimes() {
  const now = new Date();
  const date = formatDate(now);
  estFerie = holidayDates.includes(date);
  const vacationDates = await fetchVacationDates(now);
  const isVacation = isDateInVacationRanges(now, vacationDates);
  const isLastWeek = isInLastWeekBeforeVacation(now, vacationDates);

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

  // ✨ Messages spéciaux
  alertMessage.classList.remove("hidden");
  if (estFerie) {
    alertMessage.innerHTML = `
      <div class="alert alert-warning shadow-lg">
        <span>🎌 Jour férié : Aucun car aujourd’hui. Profitez de votre repos 😴</span>
      </div>`;
    destinationElement.innerHTML = "";
    nextBusTime.innerHTML = "";
    return;
  }

  if (isVacation) {
    alertMessage.innerHTML = `
      <div class="alert alert-info shadow-lg">
        <span>🏖️ C’est les vacances ! Aucun car scolaire en circulation. Bonnes vacances 😎</span>
      </div>`;
    destinationElement.innerHTML = "";
    nextBusTime.innerHTML = "";
    return;
  }

  if (isLastWeek) {
    alertMessage.innerHTML = `
      <div class="alert alert-success shadow-lg text-lg flex flex-col">
        <span>🔥 Dernière semaine avant les vacances ! 💪</span>
        <span>Allez, encore quelques trajets et tu pourras chiller ! 🌴</span>
      </div>`;
  } else {
    alertMessage.innerHTML = "";
  }

  // 🧭 Destination
  if (now.getHours() >= 6 && now.getHours() < 9) {
    destinationElement.innerHTML = `<div class="w-full flex justify-center py-8">
    <div class="p-6 w-3/4 lg:w-1/2 bg-gradient-to-r from-primary to-secondary rounded-xl shadow-lg text-center">
      <h2 class="text-5xl font-semibold text-white">🚸 Direction Lycée Karl Marx</h2>
    </div>
  </div>`;
  } else if (now.getHours() >= 11 && now.getHours() < 19) {
    destinationElement.innerHTML = `<div class="w-full flex justify-center py-8">
    <div class="p-6 w-3/4 lg:w-1/2 bg-gradient-to-r from-primary to-secondary rounded-xl shadow-lg text-center">
      <h2 class="text-5xl font-semibold text-white">🏠 Retour vers Naubourg Grand-Place</h2>
    </div>
  </div>`;
  } else {
    destinationElement.innerHTML = "";
  }

  // 🎨 Affichage stylé des bus
  const cards = [];

  const makeCard = (label, delay, theme = "primary") => `
    <div class="card glass bg-gradient-to-br from-${theme}-200 to-${theme}-400 shadow-xl text-center px-6 py-4 max-w-xs">
      <div class="card-body items-center">
        <h3 class="card-title text-2xl font-bold">${label}</h3>
        <p class="text-5xl font-extrabold text-${theme}-800">${
    delay === 1 ? "1 min" : delay + " min"
  }</p>
        <div class="badge badge-outline badge-lg mt-2 animate-bounce">${
          delay <= 2 ? "🟢 Monte vite !" : "⏳ T'as encore le temps"
        }</div>
      </div>
    </div>`;

  if (nextBusFreq === 1) {
    cards.push(makeCard("🚌 À quai", nextBusFreq, "success"));
  } else if (nextBusFreq === 2) {
    cards.push(makeCard("🚦 À l’approche", nextBusFreq, "warning"));
  } else if (nextBusFreq > 0) {
    cards.push(makeCard("🚍 Prochain départ", nextBusFreq, "info"));
  }

  if (followingBusFreq > 0) {
    cards.push(makeCard("🔁 Suivant", followingBusFreq, "secondary"));
  }

  if (cards.length === 0) {
    nextBusTime.innerHTML = `
      <div class="alert alert-info shadow-lg">
        <span>⏰ Aucun car dans l’heure à venir. Pense à checker les horaires 🕒</span>
      </div>`;
  } else {
    nextBusTime.innerHTML = `
      <div class="flex flex-col lg:flex-row justify-center items-stretch gap-6">${cards.join(
        ""
      )}</div>`;
  }
  // 👉 Aucun bus trouvé mais pas vacances/férié = fin de service ?
  if (cards.length === 0 && !isVacation && !estFerie) {
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    nextBusTime.innerHTML = `
        <div class="alert alert-info shadow-lg text-lg">
          ${
            isWeekend
              ? "📆 C'est le week-end ! Aucun bus scolaire ne circule. Détends-toi et profite 🎉🎮"
              : isDay
              ? "⏰ Aucun car scolaire ne circule. Regarde tes cours plutôt que le prochain bus 😝 on sera là à l'heure 🕒"
              : "🌙 Les bus scolaires ne circulent plus pour aujourd'hui. Repose-toi bien, on t'attend demain frais et dispo ! 😴"
          }
        </div>`;
  }
}

function updateCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  currentTimeElement.textContent = `Dernière mise à jour : ${hours}:${minutes}`;
}

async function fetchTrafficData() {
  try {
    const response = await fetch("https://raw.githubusercontent.com/Cyber-Thibaut/infotrafic/main/info.json");
    //const response = await fetch("test.json");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur de récupération des informations de trafic:", error);
    return null;
  }
}

function renderTrafficInfo(trafficData) {
  let container = document.getElementById("traffic-info");
  if (!container) {
    // Créer le conteneur s'il n'existe pas
    container = document.createElement("div");
    container.id = "traffic-info";
    container.className = "mb-8";

    // L'insérer après l'élément infos-ligne
    const infosLigne = document.getElementById("infos-ligne");
    if (infosLigne && infosLigne.parentNode) {
      infosLigne.parentNode.insertBefore(container, infosLigne.nextSibling);
    } else {
      // Fallback : l'ajouter au body
      document.body.appendChild(container);
    }
  } else {
    container.innerHTML = "";
  }

  // Utiliser la même logique que trafic.html
  if (trafficData && trafficData.lignes) {
    const now = new Date();
    let infosActivesCount = 0;

    // Filtrer les lignes 651
    const lignes651 = trafficData.lignes.filter((ligne) => ligne.ligne === "651");

    lignes651.forEach((ligne) => {
      if (ligne.infos_trafic) {
        const infosActives = ligne.infos_trafic.filter(
          (info) => now >= new Date(info.annonce) && now <= new Date(info.fin)
        );
        infosActivesCount += infosActives.length;
      }
    });

    // Créer l'encart d'info trafic
    const trafficCard = document.createElement("div");
    trafficCard.className = "mb-4";

    if (infosActivesCount > 0) {
      const incidentText =
        infosActivesCount === 1
          ? `${infosActivesCount} incident impacte la ligne`
          : `${infosActivesCount} incidents impactent la ligne`;

      trafficCard.innerHTML =
        '<div role="alert" class="alert alert-error shadow-lg">' +
        '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />' +
        "</svg>" +
        "<div>" +
        '<h3 class="font-bold">Perturbation sur la ligne 651</h3>' +
        '<div class="text-xs">' + incidentText + "</div>" +
        "</div>" +
        '<div>' +
        '<a href="details.html#651" class="btn btn-sm btn-error">' +
        "Plus d'infos" +
        '</a>' +
        "</div>" +
        "</div>";
    } else {
      trafficCard.innerHTML =
        '<div role="alert" class="alert alert-success shadow-lg">' +
        '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />' +
        "</svg>" +
        "<div>" +
        '<h3 class="font-bold">Trafic normal sur la ligne 651</h3>' +
        '<div class="text-xs">Aucune perturbation signalée pour cette ligne</div>' +
        "</div>" +
        "</div>";
    }

    container.appendChild(trafficCard);
  }
}

async function initialize() {
  const now = new Date();
  await fetchHolidayDates(now.getFullYear());
  
  // Charger les détails de la ligne 651
  const lineNumber = "651";
  lineDetailsData = await fetchLineDetails(lineNumber);
  if (lineDetailsData) {
    renderLineDetails(lineDetailsData);
  } else {
    // Fallback avec données par défaut
    const defaultLine = {
      id: 651,
      nom: "Lycée Blaise Pascal <> NAUBOURG Grand-Place",
      type: "Édu'Volcan",
      stats: {
        nombre_arrets: 8,
        temps_trajet: "60 minutes",
        longueur_ligne: "37 km"
      }
    };
    renderLineDetails(defaultLine);
  }
  
  updateBusTimes();
  updateCurrentTime();
  
  // Charger et afficher les informations de trafic
  const trafficData = await fetchTrafficData();
  if (trafficData) {
    renderTrafficInfo(trafficData);
  }
  
  setInterval(updateBusTimes, 30000);
  setInterval(updateCurrentTime, 1000);
}

initialize();
