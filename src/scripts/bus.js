let holidayDates = [];
let busData = null;
let selectedLine = null;

const nextBusTime = document.getElementById("nextBusTime");
const alertMessage = document.getElementById("alertMessage");
const infoMessage = document.getElementById("infoMessage");
const destinationElement = document.getElementById("destination");

const now = new Date();
const hour = now.getHours();
const minute = now.getMinutes();

async function fetchHolidayDates(year) {
  try {
    const response = await fetch(
      `https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`
    );
    const data = await response.json();
    holidayDates = Object.values(data).map((date) =>
      formatDate(new Date(date))
    );
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
          `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records?limit=20&lang=fr&refine=location%3A%22Clermont-Ferrand%22&refine=population%3A%22-%22&refine=population%3A%22%C3%89l%C3%A8ves%22&refine=annee_scolaire%3A%22${schoolYear}%22`
        )
      )
    );

    const data = await Promise.all(responses.map((r) => r.json()));
    return data
      .flatMap((d) =>
        d.results.map((record) => ({
          start: new Date(record.start_date),
          end: new Date(record.end_date),
        }))
      )
      .sort((a, b) => a.start - b.start);
  } catch (error) {
    console.error("Erreur de récupération des vacances scolaires:", error);
    return [];
  }
}

function isDateInVacationRanges(date, ranges) {
  return ranges.some((range) => date >= range.start && date <= range.end);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTimeSlot(hour) {
  if (hour < 7) return "creuse";
  if (hour < 9) return "pointe";
  if (hour < 16) return "creuse";
  if (hour < 20) return "pointe";
  return "soir";
}

async function fetchLineData(lineNumber) {
  try {
    const response = await fetch("/src/scripts/frequences_bus.json");
    const data = await response.json();
    return data.lignes.find((ligne) => ligne.numero.toString() === lineNumber);
  } catch (err) {
    console.error("Erreur lors du chargement des données de ligne :", err);
    return null;
  }
}

async function updateBusTimes() {
  const now = new Date();
  const dateStr = formatDate(now);
  const weekday = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const isHoliday = holidayDates.includes(dateStr);
  const vacationDates = await fetchVacationDates(now);
  const isVacation = isDateInVacationRanges(now, vacationDates);

  const timeSlot = getTimeSlot(hour);
  let freqString;

  if (!selectedLine) return;

  if (isHoliday || weekday === 0) {
    freqString = isVacation
      ? selectedLine.vacances[`dimanche_${timeSlot}`]
      : selectedLine.frequences[`dimanche_${timeSlot}`];
  } else if (weekday === 6) {
    freqString = isVacation
      ? selectedLine.vacances[`samedi_${timeSlot}`]
      : selectedLine.frequences[`samedi_${timeSlot}`];
  } else {
    freqString = isVacation
      ? selectedLine.vacances[timeSlot]
      : selectedLine.frequences[timeSlot];
  }

  const frequency = parseInt(freqString); // en minutes
  if (isNaN(frequency)) {
    nextBusTime.innerHTML =
      "<div class='alert alert-info'>Pas de service actuellement</div>";
    return;
  }

  const minutesUntilNext = frequency - (minute % frequency);
  const minutesUntilFollowing = minutesUntilNext + frequency;

  const frequentationIcons = [
    { icon: "/img/icone-complet.png", color: "red" },
    { icon: "/img/icone-moyen.png", color: "yellow" },
    { icon: "/img/icone-vide.png", color: "green" },
  ];

  const icon1 = frequentationIcons[Math.floor(Math.random() * 3)].icon;
  const icon2 = frequentationIcons[Math.floor(Math.random() * 3)].icon;

  const nextBusHTML = `<div class="card bg-base-300 shadow-md w-full h-36 flex flex-col justify-center items-center text-3xl font-semibold text-primary">
  <span class="${minutesUntilNext <= 1 ? "animate-pulse text-accent" : ""}">
  ${minutesUntilNext <= 1 ? "A l’approche" : `${minutesUntilNext} min`}
</span>

  <div class="mt-2 p-2 bg-base-100 rounded-full">
      <img src="${icon1}" alt="fréquentation" class="w-10 h-10">
  </div>
</div>`;

  const followingBusHTML = `<div class="card bg-base-300 shadow-md w-full h-36 flex flex-col justify-center items-center text-3xl font-semibold text-primary">
  <span>${minutesUntilFollowing} min</span>
  <div class="mt-2 p-2 bg-base-100 rounded-full">
      <img src="${icon2}" alt="fréquentation" class="w-10 h-10">
  </div>
</div>`;

  destinationElement.innerHTML = `
  <div class="w-full flex justify-center py-8">
    <div class="p-6 w-3/4 lg:w-1/2 bg-gradient-to-r from-primary to-secondary rounded-xl shadow-lg text-center">
      <h2 class="text-5xl font-semibold text-white">${selectedLine.destination}</h2>
    </div>
  </div>
`;

  const divider = `<div class="divider lg:divider-horizontal"></div>`;
  nextBusTime.innerHTML = nextBusHTML + divider + followingBusHTML;

  if (isHoliday) {
    alertMessage.innerHTML = `
        <div role="alert" class="alert alert-warning">
            <span>⚠️ Aujourd’hui est un jour férié.</span>
        </div>`;
  } else {
    alertMessage.innerHTML = "";
  }
}

async function init() {
  const lineNumber = window.location.hash.replace("#", "");
  console.log("📦 Fragment capté dans bus.js :", window.location.hash);
  console.log("🧵 lineNumber :", lineNumber);

  if (!lineNumber) {
    alert("Aucune ligne spécifiée dans l’URL !");
    return;
  }

  await fetchHolidayDates(now.getFullYear());
  selectedLine = await fetchLineData(lineNumber);

  if (!selectedLine) {
    nextBusTime.innerHTML =
      "<div class='alert alert-error'>Ligne non trouvée !</div>";
    return;
  }

  updateBusTimes();
}

window.addEventListener("DOMContentLoaded", init);
