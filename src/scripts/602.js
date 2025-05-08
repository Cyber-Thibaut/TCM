const nextBusTime = document.getElementById("nextBusTime");
const alertMessage = document.getElementById("alertMessage");
const currentTimeElement = document.getElementById("current-time");
const destinationElement = document.getElementById("destination");

let holidayDates = [];

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
      <h2 class="text-5xl font-semibold text-white">🚸 Direction Collège Victor Hugo</h2>
    </div>
  </div>`;
  } else if (now.getHours() >= 11 && now.getHours() < 19) {
    destinationElement.innerHTML = `<div class="w-full flex justify-center py-8">
    <div class="p-6 w-3/4 lg:w-1/2 bg-gradient-to-r from-primary to-secondary rounded-xl shadow-lg text-center">
      <h2 class="text-5xl font-semibold text-white">🏠 Retour vers LE ROTO Avenue du Parc</h2>
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

async function initialize() {
  const now = new Date();
  await fetchHolidayDates(now.getFullYear());
  updateBusTimes();
  updateCurrentTime();
  setInterval(updateBusTimes, 30000);
  setInterval(updateCurrentTime, 1000);
}

initialize();
