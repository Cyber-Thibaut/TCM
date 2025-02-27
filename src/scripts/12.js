const nextBusTime = document.getElementById("nextBusTime");
const alertMessage = document.getElementById("alertMessage");
const currentTimeElement = document.getElementById("current-time");
const destinationElement = document.getElementById("destination");
const now = new Date();
const hour = now.getHours();
const minute = now.getMinutes();

let holidayDates = [];

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
    console.error("Error fetching holiday dates:", error);
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

    const data = await Promise.all(
      responses.map((response) => response.json())
    );
    return data
      .flatMap((d) =>
        d.results.map((record) => ({
          start: new Date(record.start_date),
          end: new Date(record.end_date),
          description: record.description, // Ajouter la description ici
        }))
      )
      .sort((a, b) => a.start - b.start); // Trier les périodes de vacances par date de début
  } catch (error) {
    console.error("Error fetching vacation dates:", error);
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

function calculateNextBusTime(weekday, hour, minute, isVacation, isHoliday) {
  const frequencies = {
    weekday: {
      "4-7": 8,
      "7-9": 6,
      "9-16": 8,
      "16-20": 6,
      "20-24": 12,
    },
    saturday: {
      "4-7": 8,
      "7-9": 4,
      "9-16": 8,
      "16-20": 4,
      "20-24": 12,
    },
    sunday: {
      "4-7": 16,
      "7-9": 10,
      "9-24": 16,
    },
    vacationWeekday: {
      "4-7": 12,
      "7-9": 10,
      "9-24": 12,
    },
    vacationSaturday: {
      "4-7": 14,
      "7-9": 12,
      "9-24": 14,
    },
    vacationSunday: {
      "4-7": 20,
      "7-9": 15,
      "9-24": 20,
    },
  };

  let dayFrequencies;
  if (isHoliday) {
    dayFrequencies = frequencies.sunday;
  } else if (isVacation) {
    dayFrequencies =
      weekday === 0
        ? frequencies.vacationSunday
        : weekday === 6
        ? frequencies.vacationSaturday
        : frequencies.vacationWeekday;
  } else {
    dayFrequencies =
      weekday === 0
        ? frequencies.sunday
        : weekday === 6
        ? frequencies.saturday
        : frequencies.weekday;
  }

  for (const [range, freq] of Object.entries(dayFrequencies)) {
    const [startHour, endHour] = range.split("-").map(Number);
    if (hour >= startHour && hour < endHour) {
      return freq - (minute % freq);
    }
  }
  return -1; // Créneau fermé
}

function calculateFollowingBusTime(
  weekday,
  hour,
  minute,
  frequency,
  isVacation,
  isHoliday
) {
  const followingFrequencies = {
    weekday: {
      "4-7": 7,
      "7-9": 6,
      "9-16": 7,
      "16-20": 6,
      "20-24": 16,
    },
    saturday: {
      "4-7": 9,
      "7-9": 7,
      "9-16": 9,
      "16-20": 7,
      "20-24": 13,
    },
    sunday: {
      "4-7": 16,
      "7-9": 10,
      "9-24": 16,
    },
    vacationWeekday: {
      "4-7": 11,
      "7-9": 10,
      "9-24": 11,
    },
    vacationSaturday: {
      "4-7": 13,
      "7-9": 11,
      "9-24": 13,
    },
    vacationSunday: {
      "4-7": 19,
      "7-9": 14,
      "9-24": 19,
    },
  };

  let dayFrequencies;
  if (isHoliday) {
    dayFrequencies = followingFrequencies.sunday;
  } else if (isVacation) {
    dayFrequencies =
      weekday === 0
        ? followingFrequencies.vacationSunday
        : weekday === 6
        ? followingFrequencies.vacationSaturday
        : followingFrequencies.vacationWeekday;
  } else {
    dayFrequencies =
      weekday === 0
        ? followingFrequencies.sunday
        : weekday === 6
        ? followingFrequencies.saturday
        : followingFrequencies.weekday;
  }

  for (const [range, freq] of Object.entries(dayFrequencies)) {
    const [startHour, endHour] = range.split("-").map(Number);
    if (hour >= startHour && hour < endHour) {
      return frequency + freq - (minute % freq);
    }
  }
  return -1; // Créneau fermé
}

async function updateBusTimes() {
  const now = new Date();
  const date = formatDate(now);
  const isHoliday = holidayDates.includes(date);
  const vacationDates = await fetchVacationDates(now);
  const isVacation = isDateInVacationRanges(now, vacationDates);

  const nextBusFreq = calculateNextBusTime(
    now.getDay(),
    now.getHours(),
    now.getMinutes(),
    isVacation,
    isHoliday
  );
  const followingBusFreq = calculateFollowingBusTime(
    now.getDay(),
    now.getHours(),
    now.getMinutes(),
    nextBusFreq,
    isVacation,
    isHoliday
  );

  const frequentationIcons = [
    { icon: "/img/icone-complet.png", color: "red" },
    { icon: "/img/icone-moyen.png", color: "yellow" },
    { icon: "/img/icone-vide.png", color: "green" },
  ];

  const randomFrequentation1 = Math.floor(Math.random() * 3);
  const randomFrequentation2 = Math.floor(Math.random() * 3);

  const selectedIcon1 = frequentationIcons[randomFrequentation1].icon;
  const selectedIcon2 = frequentationIcons[randomFrequentation2].icon;

  let nextBus, followingBus;
  if (nextBusFreq === -1) {
    if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
      infoMessage.innerHTML = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Veuillez noter que le service est actuellement suspendu. Nous reprendrons nos activités à 4h du matin. Merci pour votre compréhension et bonne nuit.</span></div>`;
    } else {
      infoMessage.innerHTML = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Pour le moment, aucun bus n'est en service.</span></div>`;
    }
  } else {
    nextBus = `<div class="grow h-32 card bg-base-300 dark:bg-primary-content rounded-box place-items-center flex items-center" style='font-size: 40px; color: #dc241f;'>
            ${
              nextBusFreq === 1
                ? "A quai"
                : nextBusFreq === 2
                ? "A l’approche"
                : `${nextBusFreq} min`
            }
            <div class="flex items-center justify-center bg-black bg-opacity-20 dark:bg-opacity-0 p-2 rounded-full ml-2">
                <img src="${selectedIcon1}" style="width: 50px; height: auto;">
            </div>
        </div>`;

    followingBus = `<div class="grow h-32 card bg-base-300 dark:bg-primary-content rounded-box place-items-center flex items-center" style='font-size: 40px; color: #dc241f;'>
            ${
              followingBusFreq === 0
                ? "Arrivé"
                : followingBusFreq === 1
                ? "1 min"
                : `${followingBusFreq} min`
            }
            <div class="flex items-center justify-center bg-black bg-opacity-20 dark:bg-opacity-0 p-2 rounded-full ml-2">
                <img src="${selectedIcon2}" style="width: 50px; height: auto;">
            </div>
        </div>`;
    infoMessage.textContent = "";
    const divider = `<div class="divider lg:divider-horizontal"></div>`;
    nextBusTime.innerHTML = nextBus + divider + followingBus;
  }

  if (isHoliday) {
    alertMessage.innerHTML = `
        <div role="alert" class="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Remarque : Horaires ajustés aujourd'hui en raison d'un jour férié.</span>
        </div>`;
  } else if (isVacation) {
    alertMessage.innerHTML = `
        <div role="alert" class="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Remarque : Horaires modifiés aujourd'hui en raison de période de vacances.</span>
        </div>`;
  } else {
    alertMessage.textContent = "";
  }
}

function updateCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  currentTimeElement.textContent = `Mis à jour à : ${hours}:${minutes}`;
  destinationElement.innerHTML = `<h2 class="text-4xl text-base-content font-bold">Direction Campus Cézeaux (Sciences) ♿</h2><br>`;
}

async function initialize() {
  const now = new Date();
  await fetchHolidayDates(now.getFullYear());
  setInterval(updateBusTimes, 30000);
  updateBusTimes();
  setInterval(updateCurrentTime, 1000);
  updateCurrentTime();
}

initialize();
