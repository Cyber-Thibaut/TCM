const now = new Date();
const weekday = now.getDay(); // 0 (Dimanche) à 6 (Samedi)
const hour = now.getHours();
const minute = now.getMinutes();
const date = formatDate(now); // Convertir la date en chaîne "YYYY-MM-DD"
const today = new Date();

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

const isHoliday = holidayDates.includes(date);
  const vacationDates = await fetchVacationDates(now);

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
const holidayDates = [
    "2024-11-01", // Toussaint
    "2024-11-11", // Armistice 1918
    "2024-12-25", // Noël
    "2025-01-01", // Jour de l'An
    "2025-04-21", // Lundi de Pâques
    "2025-05-01", // Fête du Travail
    "2025-05-08", // Victoire 1945
    "2025-05-29", // Ascension
    "2025-06-09", // Lundi de Pentecôte
    "2025-07-14", // Fête nationale
    "2025-08-15"  // Assomption
];

// Exemple de dates de jours fériés
const premierMai = new Date(today.getFullYear(), 4, 1);
const estFerie = holidayDates.includes(date);
const estPremierMai = today.getTime() === premierMai.getTime();

function updateBusTimes() {
    const nextBus = `<div role="alert" class="alert alert-warning">
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <span>Rapprochez-vous d'une de nos agences pour réserver votre trajet en TAD</span>
</div>`;
    document.getElementById("nextBusTime").innerHTML = nextBus;

    const alertMessage = document.getElementById("alertMessage");

    if (estFerie) {
        alertMessage.innerHTML = `
        <div role="alert" class="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Remarque : Horaires ajustés aujourd'hui en raison d'un jour férié.</span>
        </div>
    `;
    } else if (isVacation) {
        alertMessage.innerHTML = `
        <div role="alert" class="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Remarque : Horaires modifiés aujourd'hui en raison de période de vacances.</span>
        </div>
    `;
    } else if (estPremierMai) {
        alertMessage.innerHTML = `
        <div role="alert" class="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Remarque : Le réseau est fermé en ce 1er Mai.</span>
        </div>
    `;
    } else {
        alertMessage.textContent = "";
    }

    console.log(nextBusFreq);
}
setInterval(updateBusTimes, 30000); // Mettez 30000 pour actualiser toutes les 30 secondes
updateBusTimes(); // Appel initial pour mettre à jour les données immédiatement

// Update current time every second
function updateCurrentTime() {
    const currentTimeElement = document.getElementById('current-time');
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    currentTimeElement.textContent = `Dernière mise à jour : ${hours}:${minutes}`;
    document.getElementById('destination').innerHTML = `<h2 style='font-size: 40px;'>Direction Observatoire</h2><br>`;

}
setInterval(updateCurrentTime, 1000);
updateCurrentTime(); // Update initially