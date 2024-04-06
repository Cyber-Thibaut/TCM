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
    { start: new Date("2023-07-01"), end: new Date("2023-09-03") }, // Période de vacances en juillet-septembre 2023
    { start: new Date("2023-10-21"), end: new Date("2023-11-05") }, // Période de vacances en octobre-novembre 2023
    { start: new Date("2023-12-23"), end: new Date("2024-01-07") }, // Période de vacances en décembre-janvier 2024
    { start: new Date("2024-02-17"), end: new Date("2024-03-03") }, // Période de vacances en février-mars 2024
    { start: new Date("2024-04-13"), end: new Date("2024-04-28") }, // Période de vacances en avril 2024
    { start: new Date("2024-07-06"), end: new Date("2024-09-01") }  // Période de vacances en juillet-septembre 2024
    // Ajouter d'autres périodes de vacances si nécessaire
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
    "2023-11-01",
    "2023-11-11",
    "2023-12-25",
    "2024-01-01",
    "2024-04-01",
    "2024-05-08",
    "2024-05-09",
    "2024-05-20",
    "2024-07-14",
    "2024-08-15"
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
                frequency = 7; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = 8; // Creuse
            } else if (hour >= 16 && hour < 20) {
                frequency = 7; // Pointe
            } else {
                frequency = 11; // Soir
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 4 && hour < 7) {
                frequency = 16; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 11; // Pointe
            } else {
                frequency = 16; // Creuse
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 7) {
                frequency = 7; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = 6; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = 7; // Creuse
            } else if (hour >= 16 && hour < 20) {
                frequency = 6; // Pointe
            } else {
                frequency = 16; // Soir
            }
        }
    } else {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 4 && hour < 7) {
                frequency = -1; // Créneau fermé
            } else if (hour >= 7 && hour < 9) {
                frequency = 32; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = -1; // Créneau fermé
            } else if (hour >= 16 && hour < 20) {
                frequency = 32; // Pointe
            } else {
                frequency = -1; // Créneau fermé
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            frequency = -1; // Créneau fermé
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 7) {
                frequency = 32; // Creuse
            } else if (hour >= 7 && hour < 9) {
                frequency = -1; // Pointe
            } else if (hour >= 9 && hour < 16) {
                frequency = 32; // Creuse
            } else if (hour >= 16 && hour < 20) {
                frequency = -1; // Pointe
            } else {
                frequency = -1; // Pas de bus le soir
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
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
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
                followingFrequency = 16; // Soir
            }
        }
    } else {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 4 && hour < 7) {
                followingFrequency = -1; // Créneau fermé
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = 32; // Pointe
            } else if (hour >= 9 && hour < 16) {
                followingFrequency = -1; // Créneau fermé
            } else if (hour >= 16 && hour < 20) {
                followingFrequency = 32; // Pointe
            } else {
                followingFrequency = -1; // Créneau fermé
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            followingFrequency = -1; // Créneau fermé
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 7) {
                followingFrequency = 32; // Creuse
            } else if (hour >= 7 && hour < 9) {
                followingFrequency = -1; // Pointe
            } else if (hour >= 9 && hour < 16) {
                followingFrequency = 32; // Creuse
            } else if (hour >= 16 && hour < 20) {
                followingFrequency = -1; // Pointe
            } else {
                followingFrequency = -1; // Pas de bus le soir
            }
        }
    }

    return frequency + followingFrequency - (minute % followingFrequency);
}

function shouldBlink(nextBusFreq) {
    return nextBusFreq === 1;
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

    // Affichage de l'icône et de la couleur
    const frequentation2 = `<img src="${selectedIcon2}" style="width: 50px; height: auto; margin-top: 25px">`;

    if (nextBusFreq === -1) {
        if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
            nextBus = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Le réseau est temporairement fermé. Le prochain départ est prévu à 4h du matin.</span></div>`;
        } else {
            nextBus = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Aucun bus n'est actuellement en circulation.</span></div>`;
        }


        const followingBus = "";
        document.getElementById("nextBusTime").innerHTML = nextBus + followingBus;
    } else {
        const nextBus = nextBusFreq === 1 ?
            `<div class="grid flex-grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>A quai <img src="${selectedIcon1}" style="width: 50px; height: auto; display: inline-block;"> </div>` :
            nextBusFreq === 2 ?
                `<div class="grid flex-grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>A l’approche <img src="${selectedIcon1}" style="width: 50px; height: auto; margin-top: -35px"></div>` :
                `<div class="grid flex-grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>${nextBusFreq} min  <img src="${selectedIcon1}" style="width: 50px; height: auto; margin-top: -35px"></div>`;

        const followingBus = followingBusFreq === 0 ?
            `<div class="grid flex-grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>Arrivé</div>` :
            followingBusFreq === 1 ?
                `<div class="grid flex-grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>1 min</div>` :
                `<div class="grid flex-grow h-32 card bg-base-300 rounded-box place-items-center" style='font-size: 40px; color: #dc241f;'>${followingBusFreq} min <img src="${selectedIcon2}" style="width: 50px; height: auto; margin-top: -35px"></div>`;

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
    currentTimeElement.textContent = `Mis à jour à : ${hours}:${minutes}`;
    document.getElementById('destination').innerHTML = `<h2 style='font-size: 40px; color: #dc241f;'>Direction Campus Cézeaux (Sciences) ♿</h2><br>`;

}
setInterval(updateCurrentTime, 1000);
updateCurrentTime(); // Update initially