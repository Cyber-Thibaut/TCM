const nextBusTime = document.getElementById("nextBusTime");
const followingBusTime = document.getElementById("followingBusTime");
const satelliteIcon = document.getElementById("satelliteIcon");
const now = new Date();
const weekday = now.getDay(); // 0 (Dimanche) à 6 (Samedi)
const hour = now.getHours();
const minute = now.getMinutes();
const date = formatDate(now); // Convertir la date en chaîne "YYYY-MM-DD"
const today = new Date();

const vacationDates = [
    { start: new Date("2024-07-28"), end: new Date("2024-08-11") } 
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
                frequency = 43; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 33; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = 43; // Creuse
            } else if (hour >= 16 && hour < 20) {
                frequency = 33; // Pointe
            } else {
                frequency = 43; // Soir
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 4 && hour < 7) {
                frequency = 43; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 33; // Pointe
            } else {
                frequency = 43; // Creuse
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 7) {
                frequency = 65; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 43; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = 65; // Creuse
            } else if (hour >= 16 && hour < 20) {
                frequency = 43; // Pointe
            } else {
                frequency = 130; // Soir
            }
        }
    } else {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 4 && hour < 7) {
                frequency = 43; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 33; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = 43; // Creuse
            } else if (hour >= 16 && hour < 20) {
                frequency = 33; // Pointe
            } else {
                frequency = 43; // Soir
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 4 && hour < 7) {
                frequency = 43; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 33; // Pointe
            } else {
                frequency = 43; // Creuse
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 7) {
                frequency = 65; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 43; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = 65; // Creuse
            } else if (hour >= 16 && hour < 20) {
                frequency = 43; // Pointe
            } else {
                frequency = 130; // Soir
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
                followingFrequency = 43; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 33; // Pointe
            } else if (hour >= 9 && hour < 16) {
                followingFrequency = 43; // Creuse
            } else if (hour >= 16 && hour < 20) {
                followingFrequency = 33; // Pointe
            } else {
                followingFrequency = 43; // Soir
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 4 && hour < 7) {
                followingFrequency = 43; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 33; // Pointe
            } else {
                followingFrequency = 43; // Creuse
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 7) {
                followingFrequency = 65; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 43; // Pointe
            } else if (hour >= 9 && hour < 16) {
                followingFrequency = 65; // Creuse
            } else if (hour >= 16 && hour < 20) {
                followingFrequency = 43; // Pointe
            } else {
                followingFrequency = 130; // Soir
            }
        }
    } else {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 4 && hour < 7) {
                followingFrequency = 43; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 33; // Pointe
            } else if (hour >= 9 && hour < 16) {
                followingFrequency = 43; // Creuse
            } else if (hour >= 16 && hour < 20) {
                followingFrequency = 33; // Pointe
            } else {
                followingFrequency = 43; // Soir
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 4 && hour < 7) {
                followingFrequency = 43; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 33; // Pointe
            } else {
                followingFrequency = 43; // Creuse
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 7) {
                followingFrequency = 65; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 43; // Pointe
            } else if (hour >= 9 && hour < 16) {
                followingFrequency = 65; // Creuse
            } else if (hour >= 16 && hour < 20) {
                followingFrequency = 43; // Pointe
            } else {
                followingFrequency = 130; // Soir
            }
        }
    }
    return frequency + followingFrequency - (minute % followingFrequency);
}

function updateBusTimes() {
    const now = new Date();
    const nextBusFreq = calculateNextBusTime(now.getDay(), now.getHours(), now.getMinutes());
    const followingBusFreq = calculateFollowingBusTime(now.getDay(), now.getHours(), now.getMinutes(), nextBusFreq);

    // Liste des icônes et couleurs correspondantes
    const frequentationIcons = [
        { icon: '/img/icone-complet.png', color: "red" },      // Complet / Plein (Rouge)
        { icon: '/img/icone-moyen.png', color: "yellow" },     // Places disponibles (Jaune)
        { icon: '/img/icone-vide.png', color: "green" }         // Vide (Vert)
    ];

    // Génération d'une valeur aléatoire entre 0 et 2 pour représenter la fréquentation
    const randomFrequentation1 = Math.floor(Math.random() * 3);

    // Sélection de l'icône et de la couleur en fonction de la fréquentation
    const selectedIcon1 = frequentationIcons[randomFrequentation1].icon;

    // Génération d'une valeur aléatoire entre 0 et 2 pour représenter la fréquentation
    const randomFrequentation2 = Math.floor(Math.random() * 3);

    // Sélection de l'icône et de la couleur en fonction de la fréquentation
    const selectedIcon2 = frequentationIcons[randomFrequentation2].icon;


    if (nextBusFreq === -1) {
        if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
            nextBus = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Veuillez noter que le service est actuellement suspendu. Nous reprendrons nos activités à 4h du matin. Merci pour votre compréhension et bonne nuit.</span></div>`;
        } else {
            nextBus = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Pour le moment, aucun bus n'est en service.</span></div>`;
        }


        const followingBus = "";
        document.getElementById("nextBusTime").innerHTML = nextBus + followingBus;
    } else {
        const nextBus = nextBusFreq === 1 ?
            `<div class="grid flex-grow h-32 card bg-base-300 dark:bg-primary-content rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>A quai <img src="${selectedIcon1}" style="width: 50px; height: auto; display: inline-block;"> </div>` :
            nextBusFreq === 2 ?
                `<div class="grid flex-grow h-32 card bg-base-300 dark:bg-primary-content rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>A l’approche   <img src="${selectedIcon1}" style="width: 50px; height: auto; display: inline-block;"></div>` :
                `<div class="grid flex-grow h-32 card bg-base-300 dark:bg-primary-content rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>${nextBusFreq} min  <img src="${selectedIcon1}" style="width: 50px; height: auto; display: inline-block;"></div>`;

        const followingBus = followingBusFreq === 0 ?
            `<div class="grid flex-grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>Arrivé <img src="${selectedIcon2}" style="width: 50px; height: auto; display: inline-block;"></div>` :
            followingBusFreq === 1 ?
                `<div class="grid flex-grow h-32 card bg-base-300 dark:bg-primary-content rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>1 min <img src="${selectedIcon2}" style="width: 50px; height: auto; display: inline-block;"></div>` :
                `<div class="grid flex-grow h-32 card bg-base-300 dark:bg-primary-content rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>${followingBusFreq} min <img src="${selectedIcon2}" style="width: 50px; height: auto; margin-top: -35px"></div>`;

        const divider = `<div class="divider lg:divider-horizontal"></div>`;

        document.getElementById("nextBusTime").innerHTML = nextBus + divider + followingBus;


    }

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
        <div role="alert" class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 shrink-0 stroke-current"><path stroke-linecap="round" stroke-linejoin="round"
      stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path> </svg>
            <span>En raison des épreuves de voile au lac de Pavin, les fréquences de la ligne 810 sont augmentées.</span>
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
    currentTimeElement.textContent = `Mis à jour à : ${hours}:${minutes}`;
    document.getElementById('destination').innerHTML = `<h2 class="special-font text-4xl text-primary-content dark:text-primary font-bold">Direction lac de Pavin ♿</h2><br>`;

}
setInterval(updateCurrentTime, 1000);
updateCurrentTime(); // Update initially