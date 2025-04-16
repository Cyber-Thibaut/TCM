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
  const premierMai = new Date(currentYear, 4, 1); // Mois 4 = Mai (0-index)

  // Charger jours fériés & vacances
  await fetchHolidayDates(currentYear);
  const vacationRanges = await fetchVacationDates(now);

  const isHoliday = holidayDates.includes(todayStr);
  const isVacation = isDateInVacationRanges(now, vacationRanges);
  const isPremierMai = now.toDateString() === premierMai.toDateString();

  const alertMessage = document.getElementById("alertMessage");
  const nextBusTime = document.getElementById("nextBusTime");

  // Message TAD générique
  nextBusTime.innerHTML = buildAlert(
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    "Rapprochez-vous d'une de nos agences pour réserver votre trajet en TAD"
  );

  // Affichage conditionnel selon contexte
  if (isPremierMai) {
    alertMessage.innerHTML = buildAlert(
      "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      "Remarque : Le réseau est fermé en ce 1er Mai."
    );
  } else if (isHoliday) {
    alertMessage.innerHTML = buildAlert(
      "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      "Remarque : Horaires ajustés aujourd'hui en raison d'un jour férié."
    );
  } else if (isVacation) {
    alertMessage.innerHTML = buildAlert(
      "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      "Remarque : Horaires modifiés aujourd'hui en raison des vacances scolaires."
    );
  } else {
    alertMessage.innerHTML = ""; // Aucun message si jour normal
  }
}

function updateCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  const currentTimeElement = document.getElementById("current-time");
  if (currentTimeElement) {
    currentTimeElement.textContent = `Mis à jour à : ${hours}:${minutes}`;
  }

  const destination = document.getElementById("destination");
  if (destination) {
    destination.innerHTML = `<h2 class="text-4xl text-primary-content dark:text-primary font-bold">Direction Haute-ville ♿</h2><br>`;
  }
}

// Init
updateBusTimes();
setInterval(updateBusTimes, 30000); // Toutes les 30 sec
updateCurrentTime();
setInterval(updateCurrentTime, 1000); // Toutes les secondes
