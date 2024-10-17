const nextBusTime = document.getElementById("nextBusTime");
const followingBusTime = document.getElementById("followingBusTime");
const satelliteIcon = document.getElementById("satelliteIcon");
const panneau = document.getElementById("panneau");
const now = new Date();
const weekday = now.getDay(); // 0 (Dimanche) à 6 (Samedi)
const hour = now.getHours();
const minute = now.getMinutes();
const date = formatDate(now); // Convertir la date en chaîne "YYYY-MM-DD"
const today = new Date();

const vacationDates = [
    { start: new Date("2024-07-06"), end: new Date("2024-09-02") }, // Grandes vacances 2024
    { start: new Date("2024-10-19"), end: new Date("2024-11-03") }, // Vacances de la Toussaint 2024
    { start: new Date("2024-12-21"), end: new Date("2025-01-05") }, // Vacances de Noël 2024-2025
    { start: new Date("2025-02-08"), end: new Date("2025-02-23") }, // Vacances d'hiver 2025
    { start: new Date("2025-04-05"), end: new Date("2025-04-21") }, // Vacances de printemps 2025
    { start: new Date("2025-07-05"), end: new Date("2025-09-01") }  // Grandes vacances 2025
];



function isDateInVacationRanges(date, ranges) {
    for (const range of ranges) {
        const startDate = range.start;
        const endDate = range.end;
        if (date >= startDate && date <= endDate) {
            return true;
        }
    }
    return false;
}

const isVacation = isDateInVacationRanges(today, vacationDates);

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

function calculateNextBusTime(weekday, hour, minute) {
    if (estPremierMai) {
        return -1; // Créneau fermé
    }
    if (estFerie) {
        weekday = 0; // Dimanche
    }
    if (isVacation === true) {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 4 && hour < 7) {
                frequency = 8; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 4; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = 8; // Creuse
            } else if (hour >= 16 && hour < 20) {
                frequency = 4; // Pointe
            } else {
                frequency = 12; // Soir
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 4 && hour < 7) {
                frequency = 16; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 10; // Pointe
            } else {
                frequency = 16; // Creuse
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 2 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 7) {
                frequency = 8; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 6; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = 8; // Creuse
            } else if (hour >= 16 && hour < 20) {
                frequency = 6; // Pointe
            } else {
                frequency = 3; // Soir
            }
        }
    } else {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 4 && hour < 7) {
                frequency = 8; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 4; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = 8; // Creuse
            } else if (hour >= 16 && hour < 20) {
                frequency = 4; // Pointe
            } else {
                frequency = 12; // Soir
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 4 && hour < 7) {
                frequency = 16; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 10; // Pointe
            } else {
                frequency = 16; // Creuse
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 7) {
                frequency = 8; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 6; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = 8; // Creuse
            } else if (hour >= 16 && hour < 20) {
                frequency = 6; // Pointe
            } else {
                frequency = 2; // Soir
            }
        }
    }
    return frequency - (minute % frequency);
}

function calculateFollowingBusTime(weekday, hour, minute, frequency) {
    let followingFrequency;
    if (estPremierMai) {
        return -1; // Créneau fermé
    }
    if (estFerie) {
        weekday = 0; // Dimanche
    }
    if (isVacation === true) {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 4 && hour < 7) {
                followingFrequency = 8; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 7; // Pointe
            } else if (hour >= 9 && hour < 16) {
                followingFrequency = 8; // Creuse
            } else if (hour >= 16 && hour < 20) {
                followingFrequency = 7; // Pointe
            } else {
                followingFrequency = 11; // Soir
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 4 && hour < 7) {
                followingFrequency = 16; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 11; // Pointe
            } else {
                followingFrequency = 16; // Creuse
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 1 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 7) {
                followingFrequency = 7; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 6; // Pointe
            } else if (hour >= 9 && hour < 16) {
                followingFrequency = 7; // Creuse
            } else if (hour >= 16 && hour < 20) {
                followingFrequency = 6; // Pointe
            } else {
                followingFrequency = 2; // Soir
            }
        }
    } else {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 4 && hour < 7) {
                followingFrequency = 9; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 7; // Pointe
            } else if (hour >= 9 && hour < 16) {
                followingFrequency = 9; // Creuse
            } else if (hour >= 16 && hour < 20) {
                followingFrequency = 7; // Pointe
            } else {
                followingFrequency = 13; // Soir
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 4 && hour < 7) {
                followingFrequency = 16; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 10; // Pointe
            } else {
                followingFrequency = 16; // Creuse
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 7) {
                followingFrequency = 7; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 5; // Pointe
            } else if (hour >= 9 && hour < 16) {
                followingFrequency = 7; // Creuse
            } else if (hour >= 16 && hour < 20) {
                followingFrequency = 5; // Pointe
            } else {
                followingFrequency = 13; // Soir
            }
        }
    }

    return frequency + followingFrequency - (minute % followingFrequency);
}

function updateBusTimes() {
    const now = new Date();
    let nextBusFreq = calculateNextBusTime(now.getDay(), now.getHours(), now.getMinutes());
    let followingBusFreq = calculateFollowingBusTime(now.getDay(), now.getHours(), now.getMinutes(), nextBusFreq);

    const alertMessage = document.getElementById("alertMessage");
    if (nextBusFreq === 1){
        nextBusFreq = "A l'approche"
    } else if (nextBusFreq === 0){
        nextBusFreq = "A quai"
    } else {
        nextBusFreq = nextBusFreq + " min"
    }
    followingBusFreq = followingBusFreq + " min";
    document.getElementById("nextBusTime").innerHTML = nextBusFreq;
    document.getElementById("followingBusTime").innerHTML = followingBusFreq;
    if (nextBusFreq === -1) {
        if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
            alertMessage.innerHTML = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Veuillez noter que le service est actuellement suspendu. Nous reprendrons nos activités à 4h du matin. Merci pour votre compréhension et bonne nuit.</span></div>`;
            panneau.classList.add('hidden');
        } else {
            alertMessage.innerHTML = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Pour le moment, aucun bus n'est en service.</span></div>`;
            panneau.classList.add('hidden');
        }
    } else if (estFerie) {
        alertMessage.innerHTML = `
        Remarque : Horaires ajustés aujourd'hui en raison d'un jour férié.
    `;
    } else if (isVacation) {
        alertMessage.innerHTML = `
        Remarque : Horaires modifiés aujourd'hui en raison de période de vacances.
    `;
    } else if (estPremierMai) {
        alertMessage.innerHTML = `
        Remarque : Le réseau est fermé en ce 1er Mai.
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
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('current-time').innerHTML = `${hours}:${minutes}`;

}
setInterval(updateCurrentTime, 1000);
updateCurrentTime(); // Update initially