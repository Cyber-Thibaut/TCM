const nextBusTime = document.getElementById("nextBusTime");
const alertMessage = document.getElementById("alertMessage");
const currentTimeElement = document.getElementById("current-time");
const destinationElement = document.getElementById("destination");

const holidayDates = [
  "2024-11-01",
  "2024-11-11",
  "2024-12-25",
  "2025-01-01",
  "2025-04-21",
  "2025-05-01",
  "2025-05-08",
  "2025-05-29",
  "2025-06-09",
  "2025-07-14",
  "2025-08-15",
];

const now = new Date();
const date = formatDate(now);
const estFerie = holidayDates.includes(date);

async function fetchVacationDates(date) {
  const year = date.getFullYear();
  const schoolYears = [`${year - 1}-${year}`, `${year}-${year + 1}`];
  try {
    const responses = await Promise.all(
      schoolYears.map((schoolYear) =>
        fetch(
          `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records?limit=20&lang=fr&refine=location%3A%22Clermont-Ferrand%22&refine=population%3A%22-%22&refine=population%3A%22%C3%89l%C3%A8ves%22&refine=annee_scolaire%3A%22${schoolYear}%22`
        )
      )
    );

    const data = await Promise.all(
      responses.map((response) => response.json())
    );
    return data
      .flatMap((d) =>
        d.results.map((record) => ({
          start: new Date(record.start_date),
          end: new Date(record.end_date),
          description: record.description,
        }))
      )
      .sort((a, b) => a.start - b.start);
  } catch (error) {
    console.error("Error fetching vacation dates:", error);
    return [];
  }
}

function isDateInVacationRanges(date, ranges) {
  return ranges.some((range) => date >= range.start && date <= range.end);
}

async function updateBusTimes() {
  const now = new Date();
  const date = formatDate(now);
  const estFerie = holidayDates.includes(date);
  const vacationDates = await fetchVacationDates(now);
  const isVacation = isDateInVacationRanges(now, vacationDates);
  const nextBusFreq = calculateNextBusTime(now.getDay(), now.getHours(), now.getMinutes(), isVacation);
  const followingBusFreq = calculateFollowingBusTime(now.getDay(), now.getHours(), now.getMinutes(), isVacation);

  if (nextBusFreq === -1 && followingBusFreq === -1) {
    let nextBus = "";
    const hour = now.getHours();
    const minute = now.getMinutes();
    if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
      nextBus = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Veuillez noter que le service est actuellement suspendu. Nous reprendrons nos activités à 4h du matin. Merci pour votre compréhension et bonne nuit.</span></div>`;
    } else {
      nextBus = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Aucun car scolaire n'est en service en journée, pour accéder au lycée en dehors des horaires de desserte, reportez vous sur notre réseau.</span></div>`;
    }

    if (estFerie || isVacation) {
      nextBus = "";
    }
    const followingBus = "";
    nextBusTime.innerHTML = nextBus + followingBus;
  } else {
    let divider = `<div class="divider lg:divider-horizontal"></div>`;
    let nextBus = "";
    let followingBus = "";

    if (nextBusFreq === 1) {
      nextBus = `<div class="grid grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>A quai</div>`;
    } else if (nextBusFreq === 2) {
      nextBus = `<div class="grid grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>A l’approche</div>`;
    } else if (nextBusFreq === -1) {
      nextBus = "";
      divider = "";
    } else {
      nextBus = `<div class="grid grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px;'><h2 class="text-4xl font-bold text-primary">Premier départ :</h2><br><p class="text-accent">${nextBusFreq} min</p></div>`;
    }

    if (followingBusFreq === 0) {
      followingBus = `<div class="grid grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>Arrivé</div>`;
    } else if (followingBusFreq === 1) {
      followingBus = `<div class="grid grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>1 min</div>`;
    } else if (followingBusFreq === -1) {
      followingBus = "";
      divider = "";
    } else {
      followingBus = `<div class="grid grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px;'><h2 class="text-4xl font-bold text-primary">Second départ :</h2><br><p class="text-accent">${followingBusFreq} min</p></div>`;
    }

    nextBusTime.innerHTML = nextBus + divider + followingBus;
  }

  if (estFerie) {
    alertMessage.innerHTML = `
      <div role="alert" class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Nous sommes un jour férié, le lycée est fermé donc aucun car ne circule !</span>
      </div>
    `;
  } else if (isVacation) {
    alertMessage.innerHTML = `
      <div role="alert" class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Remarque : Aucun car ne circule, on se retrouve a la rentrée ! Passez de bonnes vacances 😁</span>
      </div>
    `;
  } else if (date === "2025-05-01") {
    alertMessage.innerHTML = `
      <div role="alert" class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Nous sommes le 1er mai, le lycée est fermé donc aucun car ne circule !</span>
      </div>
    `;
  } else {
    alertMessage.textContent = "";
  }

  if (estFerie || isVacation) {
    destinationElement.innerHTML = ``;
  } else if (now.getHours() >= 6 && now.getHours() < 9) {
    destinationElement.innerHTML = `<h2 class="text-4xl font-bold text-secondary">Direction Lycée Jeanne d'Arc</h2><br>`;
  } else if (now.getHours() >= 11 && now.getHours() < 19) {
    destinationElement.innerHTML = `<h2 class="text-4xl font-bold">Lezoux Hôtel de ville</h2><br>`;
  }

  if (now < new Date("2024-09-02")) {
    alertMessage.innerHTML = `
      <div role="alert" class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h1 class="font-bold">La ligne n'est pas en service actuellement</h1>
          <p>Nous nous donnons rendez-vous après les vacances, le 2 septembre !</p>
          <br>
          <p>En attendant, les abonnements pour la rentrée de septembre sont disponibles dans nos agences ! 🎒🚌</p>
          <br>
          <p>Rendez-vous dès maintenant dans nos agences pour souscrire à votre abonnement scolaire pour l'année 2024-2025. Nos équipes sont à votre disposition pour vous fournir toutes les informations nécessaires et vous aider à choisir l'abonnement qui convient le mieux à vos besoins.</p>
          <br>
          <p>Pour plus de détails, consultez notre site web : <a href="https://tcm-mobilite.vercel.app/src/agences.html">Consultez la liste de nos agences ici</a>.</p>
          <br>
          <p>Assurez-vous d'être prêt pour la rentrée avec TCM !</p>
        </div>
      </div>
    `;
    destinationElement.innerHTML = ``;
    nextBusTime.innerHTML = ``;
  }
}

setInterval(updateBusTimes, 30000); // Mettez 30000 pour actualiser toutes les 30 secondes
updateBusTimes(); // Appel initial pour mettre à jour les données immédiatement

// Update current time every second
function updateCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  currentTimeElement.textContent = `Dernière mise à jour : ${hours}:${minutes}`;
}

setInterval(updateCurrentTime, 1000);
updateCurrentTime(); // Update initially

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

function calculateNextBusTime(weekday, hour, minute, isVacation) {
  const busTimes = {
    0: { morning: "07:15", evening: "16:30" }, // Dimanche
    6: { morning: "07:15", evening: "16:30" }, // Samedi
    3: { morning: "07:15", evening: "12:15" }, // Mercredi
    default: { morning: "07:15", evening: "16:45" }, // Lundi, Mardi, Jeudi, Vendredi
  };

  if (estFerie || isVacation) {
    return -1;
  }

  const schedule = busTimes[weekday] || busTimes.default;
  const morningTime = parseTime(schedule.morning);
  const eveningTime = parseTime(schedule.evening);

  const currentTime = hour * 60 + minute;
  const morningBusTime = morningTime.hour * 60 + morningTime.minute;
  const eveningBusTime = eveningTime.hour * 60 + eveningTime.minute;

  if (currentTime < morningBusTime && morningBusTime - currentTime <= 60) {
    return morningBusTime - currentTime;
  } else if (currentTime < eveningBusTime && eveningBusTime - currentTime <= 60) {
    return eveningBusTime - currentTime;
  } else {
    return -1;
  }
}

function calculateFollowingBusTime(weekday, hour, minute, isVacation) {
  const busTimes = {
    0: { morning: "-1", evening: "-1" }, // Dimanche
    6: { morning: "-1", evening: "-1" }, // Samedi
    3: { morning: "08:30", evening: "18:00" }, // Mercredi
    default: { morning: "08:30", evening: "18:00" }, // Lundi, Mardi, Jeudi, Vendredi
  };

  if (estFerie || isVacation) {
    return -1;
  }

  const schedule = busTimes[weekday] || busTimes.default;
  const morningTime = parseTime(schedule.morning);
  const eveningTime = parseTime(schedule.evening);

  const currentTime = hour * 60 + minute;
  const morningBusTime = morningTime.hour * 60 + morningTime.minute;
  const eveningBusTime = eveningTime.hour * 60 + eveningTime.minute;

  if (currentTime < morningBusTime && morningBusTime - currentTime <= 60) {
    return morningBusTime - currentTime;
  } else if (currentTime < eveningBusTime && eveningBusTime - currentTime <= 60) {
    return eveningBusTime - currentTime;
  } else {
    return -1;
  }
}
