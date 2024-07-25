const nextBusTime = document.getElementById("nextBusTime");
const followingBusTime = document.getElementById("followingBusTime");
const satelliteIcon = document.getElementById("satelliteIcon");
const now = new Date();
const weekday = now.getDay(); // 0 (Dimanche) à 6 (Samedi)
const hour = now.getHours();
const minute = now.getMinutes();
const date = formatDate(now); // Convertir la date en chaîne "YYYY-MM-DD"
const today = new Date();

const badDates = [
    { start: new Date("2024-08-29"), end: new Date("2024-09-02") } 
];

const HandDates = [
    { start: new Date("2024-08-06"), end: new Date("2024-08-11") } 
];

const HandSoirDates = [
    { start: new Date("2024-08-06"), end: new Date("2024-08-07") } 
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

const isBadminton = isDateInVacationRanges(today, badDates);
const isHand = isDateInVacationRanges(today, HandDates);
const isHandSoir = isDateInVacationRanges(today, HandSoirDates);

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function isDateInRange(date, range) {
    return date >= range.start && date <= range.end;
}
const trampolineDates = [
    "2024-07-14"
];
const esttrampoline = trampolineDates.includes(date);

function calculateNextBusTime(weekday, hour, minute) {
    if (esttrampoline) {
        if (hour >= 10 && hour < 12) {
            frequency = 5; // Exemple
        } else if (hour >= 16 && hour < 23) {
            frequency = 5; // Exemple
        } else {
            frequency = -1; // Exemple
        }
    }
    else if (isBadminton) {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 4 && hour < 10) {
                frequency = -1; // Exemple
            } else if (hour >= 10 && hour < 12) {
                frequency = 3; // Exemple
            } else if (hour >= 12 && hour < 16) {
                frequency = -1; // Exemple
            } else if (hour >= 16 && hour < 23) {
                frequency = 3; // Exemple
            } else {
                frequency = -1; // Exemple
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 4 && hour < 10) {
                frequency = -1; // Exemple
            } else if (hour >= 10 && hour < 12) {
                frequency = 3; // Exemple
            } else if (hour >= 12 && hour < 16) {
                frequency = -1; // Exemple
            } else if (hour >= 16 && hour < 23) {
                frequency = 3; // Exemple
            } else {
                frequency = -1; // Exemple
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 10) {
                frequency = -1; // Exemple
            } else if (hour >= 10 && hour < 12) {
                frequency = 3; // Exemple
            } else if (hour >= 12 && hour < 16) {
                frequency = -1; // Exemple
            } else if (hour >= 16 && hour < 23) {
                frequency = 3; // Exemple
            } else {
                frequency = -1; // Exemple
            }
        }
    } else if (isHand) {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 10 && hour < 12) {
                frequency = 3; // Exemple
            } else if (hour >= 16 && hour < 20) {
                frequency = 3; // Exemple
            } else {
                frequency = -1; // Exemple
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 10 && hour < 16) {
                frequency = 3; // Exemple
            } else {
                frequency = -1; // Exemple
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 10) {
                frequency = -1; // Exemple
            } else if (hour >= 10 && hour < 18) {
                frequency = 3; // Exemple
            } else if (isHandSoir && hour >= 18 && hour < 23) {
                frequency = 130; // Soir
            } else {
                frequency = -1; // Pas de service le soir
            }
        }
    } else {
        return -2;
    }
    return frequency - (minute % frequency);
}

function calculateFollowingBusTime(weekday, hour, minute, frequency) {
    let followingFrequency;
    if (esttrampoline) {
        if (hour >= 10 && hour < 12) {
            followingFrequency = 5; // Exemple
        } else if (hour >= 16 && hour < 23) {
            followingFrequency = 5; // Exemple
        } else {
            followingFrequency = -1; // Exemple
        }
    }
    else if (isBadminton) {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 4 && hour < 10) {
                followingFrequency = -1; // Exemple
            } else if (hour >= 10 && hour < 12) {
                followingFrequency = 3; // Exemple
            } else if (hour >= 12 && hour < 16) {
                followingFrequency = -1; // Exemple
            } else if (hour >= 16 && hour < 23) {
                followingFrequency = 3; // Exemple
            } else {
                followingFrequency = -1; // Exemple
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 4 && hour < 10) {
                followingFrequency = -1; // Exemple
            } else if (hour >= 10 && hour < 12) {
                followingFrequency = 3; // Exemple
            } else if (hour >= 12 && hour < 16) {
                followingFrequency = -1; // Exemple
            } else if (hour >= 16 && hour < 23) {
                followingFrequency = 3; // Exemple
            } else {
                followingFrequency = -1; // Exemple
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 10) {
                followingFrequency = -1; // Exemple
            } else if (hour >= 10 && hour < 12) {
                followingFrequency = 3; // Exemple
            } else if (hour >= 12 && hour < 16) {
                followingFrequency = -1; // Exemple
            } else if (hour >= 16 && hour < 23) {
                followingFrequency = 3; // Exemple
            } else {
                followingFrequency = -1; // Exemple
            }
        }
    } else if (isHand) {
        if (weekday === 6) { // Samedi
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Samedi
            if (hour >= 10 && hour < 12) {
                followingFrequency = 3; // Exemple
            } else if (hour >= 16 && hour < 20) {
                followingFrequency = 3; // Exemple
            } else {
                followingFrequency = -1; // Exemple
            }
        } else if (weekday === 0) { // Dimanche
            if ((hour === 1 && minute >= 0) || (hour >= 2 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Dimanche
            if (hour >= 10 && hour < 16) {
                followingFrequency = 3; // Exemple
            } else {
                followingFrequency = -1; // Exemple
            }
        } else { // Semaine (Lundi - Vendredi)
            if ((hour === 0 && minute >= 0) || (hour >= 1 && hour < 4)) {
                return -1; // Créneau fermé
            }
            // Fréquences pour Semaine
            if (hour >= 4 && hour < 10) {
                followingFrequency = -1; // Exemple
            } else if (hour >= 10 && hour < 18) {
                followingFrequency = 3; // Exemple
            } else if (isHandSoir && hour >= 18 && hour < 23) {
                followingFrequency = 130; // Soir
            } else {
                followingFrequency = -1; // Pas de service le soir
            }
        }
    } else {
        return -2;
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

    if (now.getDay() >= 8 && now.getMonth() === 9) { // Les jeux de Clermont 2024 sont terminés, merci a vous de nous avoir fait confiance pour vos déplacements durant cet événement ! Rendez-vous en 2030 pour les jeux d'hiver des massifs Français !
        nextBus = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Les jeux de Clermont 2024 sont terminés, merci a vous de nous avoir fait confiance pour vos déplacements durant cet événement ! Rendez-vous en 2030 pour les jeux d'hiver des massifs Français !</span></div>`;
        document.getElementById("nextBusTime").innerHTML = nextBus
    }
    else if (nextBusFreq === -2){
        nextBus = `<div role="alert" class="alert alert-info"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Aucune épreuve n'est prévue ce jour à la maison des Sports. La navette n'est pas en service.</span></div>`;
        document.getElementById("nextBusTime").innerHTML = nextBus
    }
    else if (nextBusFreq === -1) {
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
            <span>En raison des épruves de voile au lac de Pavin, les fréquences de la ligne 810 sont augmentées.</span>
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
    document.getElementById('destination').innerHTML = `<h2 class="special-font text-4xl text-primary-content dark:text-primary font-bold">Direction la maison des Sports ♿</h2><br>`;

}
setInterval(updateCurrentTime, 1000);
updateCurrentTime(); // Update initially