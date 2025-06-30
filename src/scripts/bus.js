let holidayDates = [];
let lineDetailsData = null;
let lineFrequenciesData = null;

const nextBusTime = document.getElementById("nextBusTime");
const alertMessage = document.getElementById("alertMessage");
const infoMessage = document.getElementById("infoMessage");
const destinationElement = document.getElementById("destination");

const now = new Date();

async function fetchHolidayDates(year) {
  try {
    const response = await fetch(
      `https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`
    );
    const data = await response.json();
    holidayDates = Object.keys(data); // Garde les dates au format YYYY-MM-DD
  } catch (error) {
    console.error("Erreur de récupération des jours fériés:", error);
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function getTimeSlot(hour, weekday, isHoliday) {
  // Service du samedi soir qui se termine à 1h le dimanche
  if (weekday === 0 && hour < 1) return "samedi_soir";

  // Lignes nocturnes (0h-5h)
  if (hour >= 0 && hour < 5) {
    // Coupure le dimanche matin de 2h à 4h
    if (weekday === 0 && hour >= 2 && hour < 4) return "ferme";
    return "nocturne";
  }

  // Dimanche et jours fériés
  if (isHoliday || weekday === 0) {
    if (hour < 7 || hour >= 24) return "ferme"; // Service de 7h à minuit
    if ((hour >= 9 && hour < 13) || (hour >= 17 && hour < 22))
      return "dimanche_pointe";
    return "dimanche_creuse";
  }

  // Samedi
  if (weekday === 6) {
    if (hour < 6) return "ferme"; // Service de 6h à 1h
    if (hour >= 21) return "samedi_soir";
    if ((hour >= 8 && hour < 13) || (hour >= 15 && hour < 19))
      return "samedi_pointe";
    if (
      (hour >= 6 && hour < 8) ||
      (hour >= 13 && hour < 15) ||
      (hour >= 19 && hour < 21)
    )
      return "samedi_creuse";
    return "ferme";
  }

  // Lundi à Vendredi
  if (hour < 5 || hour >= 24) return "ferme"; // Service de 5h à minuit
  if ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 20)) return "pointe";
  if ((hour >= 5 && hour < 7) || (hour >= 9 && hour < 16)) return "creuse";
  if (hour >= 20 && hour < 24) return "soir";

  return "ferme";
}

async function fetchLineDetails(lineNumber) {
  try {
    const response = await fetch("ligne.json");
    const data = await response.json();
    const line =
      lineNumber === "NS"
        ? data.lignes.find((l) => l.id === "NS")
        : data.lignes.find((l) => l.id === parseInt(lineNumber));
    if (!line)
      throw new Error(`Détails non trouvés pour la ligne ${lineNumber}`);
    return line;
  } catch (err) {
    console.error("Erreur chargement détails ligne:", err);
    return null;
  }
}

async function fetchLineFrequencies(lineNumber) {
  try {
    const response = await fetch("/src/scripts/frequences_bus.json");
    const data = await response.json();
    const freqs = data.lignes.find(
      (ligne) => ligne.numero.toString() === lineNumber
    );
    if (!freqs)
      throw new Error(`Fréquences non trouvées pour la ligne ${lineNumber}`);
    return freqs;
  } catch (err) {
    console.error("Erreur chargement fréquences ligne:", err);
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

  if (!lineFrequenciesData || !lineDetailsData) return;

  const timeSlot = getTimeSlot(hour, weekday, isHoliday, isVacation);

  // Vérification spécifique pour le 1er mai
  if (now.getMonth() === 4 && now.getDate() === 1) {
    nextBusTime.innerHTML =
      "<div class='alert alert-info'>Ligne fermée en raison du 1er mai</div>";
    alertMessage.classList.remove("hidden");
    alertMessage.innerHTML = `<div role="alert" class="alert alert-warning"><span>⚠️ Aujourd’hui est le 1er mai. Le réseau TCM est fermé.</span></div>`;
    return;
  }

  let freqString = null;
  if (timeSlot !== "ferme") {
    const schedule = isVacation
      ? lineFrequenciesData.vacances
      : lineFrequenciesData.frequences;
    if (schedule) {
      freqString = schedule[timeSlot];
    }
  }

  const frequency = parseInt(freqString);
  if (isNaN(frequency)) {
    const hour = new Date().getHours();
    let message;

    if (hour >= 0 && hour < 5) {
      message = "Le service de jour n'a pas encore commencé.";
    } else {
      message = "Le service est terminé pour aujourd'hui.";
    }
    // Exception pour la coupure nocturne du dimanche
    if (new Date().getDay() === 0 && hour >= 2 && hour < 4) {
      message = "Le service nocturne est en pause et reprend à 4h.";
    }

    const noServiceHTML = `
    <div class="card bg-black/20 backdrop-blur-lg border border-white/20 shadow-xl w-full h-48 flex flex-col justify-center items-center text-white p-4 text-center">
        <span class="text-2xl font-bold">Pas de service actuellement</span>
        <span class="text-lg font-light mt-2">${message}</span>
    </div>`;
    nextBusTime.innerHTML = noServiceHTML;
    return;
  }

  const minutesUntilNext = frequency - (minute % frequency);
  const minutesUntilFollowing = minutesUntilNext + frequency;

  function getFrequentationIcon(slot) {
    const icons = {
      complet: "/img/icone-complet.png",
      moyen: "/img/icone-moyen.png",
      vide: "/img/icone-vide.png",
    };
    if (!slot || slot === "ferme") return icons.vide;
    if (slot.includes("pointe")) return icons.complet;
    if (slot.includes("soir") || slot.includes("nocturne")) return icons.vide;
    if (slot.includes("creuse")) return icons.moyen;
    return icons.moyen;
  }

  const icon = getFrequentationIcon(timeSlot);

  const nextBusHTML = `<div class="card bg-black/20 backdrop-blur-lg border border-white/20 shadow-xl w-full h-48 flex flex-col justify-center items-center text-white p-4">
    <span class="text-lg font-light uppercase tracking-widest">Prochain bus</span>
    <span class="text-6xl font-bold ${
      minutesUntilNext <= 1 ? "animate-pulse text-accent" : ""
    }">
      ${
        minutesUntilNext <= 1
          ? "À l\'approche"
          : `${minutesUntilNext}<span class="text-4xl font-normal ml-2">min</span>`
      }
    </span>
    <div class="mt-3 flex items-center gap-2">
        <img src="${icon}" alt="fréquentation" class="w-8 h-8">
        <span class="text-sm opacity-80">Affluence</span>
    </div>
  </div>`;

  const followingBusHTML = `<div class="card bg-black/20 backdrop-blur-lg border border-white/20 shadow-xl w-full h-48 flex flex-col justify-center items-center text-white p-4">
    <span class="text-lg font-light uppercase tracking-widest">Bus suivant</span>
    <span class="text-6xl font-bold">
      ${minutesUntilFollowing}<span class="text-4xl font-normal ml-2">min</span>
    </span>
    <div class="mt-3 flex items-center gap-2">
        <img src="${icon}" alt="fréquentation" class="w-8 h-8">
        <span class="text-sm opacity-80">Affluence</span>
    </div>
  </div>`;

  const divider = `<div class="divider lg:divider-horizontal before:bg-white/20 after:bg-white/20"></div>`;
  nextBusTime.innerHTML = nextBusHTML + divider + followingBusHTML;

  if (isHoliday) {
    alertMessage.classList.remove("hidden");
    alertMessage.innerHTML = `<div role="alert" class="alert alert-warning"><span>⚠️ Aujourd’hui est un jour férié. Les horaires peuvent être modifiés.</span></div>`;
  } else if (isVacation) {
    alertMessage.classList.remove("hidden");
    alertMessage.innerHTML = `<div role="alert" class="alert alert-warning"><span>⚠️ Horaires modifiés en raison des vacances scolaires.</span></div>`;
  } else {
    alertMessage.classList.add("hidden");
    alertMessage.innerHTML = "";
  }
}

function renderLineDetails(ligne) {
  const container = document.getElementById("infos-ligne");
  if (!container) return;
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "flex items-center justify-center gap-4 text-center mb-8";
  const logo = document.createElement("img");
  logo.src = `/img/${ligne.id}.png`;
  logo.alt = `Ligne ${ligne.id}`;
  logo.className = "w-20 h-20";
  const title = document.createElement("h2");
  title.className = "text-4xl lg:text-5xl font-bold text-primary";
  title.textContent = ligne.nom;
  header.appendChild(logo);
  header.appendChild(title);
  container.appendChild(header);

  // Plan de ligne en pleine largeur
  const planContainer = document.createElement("div");
  planContainer.className = "mb-8";
  
  const planTitle = document.createElement("h3");
  planTitle.className = "text-2xl font-bold mb-4 text-center text-primary";
  planTitle.textContent = "Plan de la ligne";
  planContainer.appendChild(planTitle);
  
  const plan = document.createElement("img");
  plan.src = `/img/plans/L${ligne.id}.png`;
  plan.alt = `Plan de la ligne ${ligne.id}`;
  plan.className =
    "rounded-xl shadow-lg w-full h-auto border border-base-300 dark:border-base-content/10 transition-transform hover:scale-105";
  plan.style.maxHeight = "400px";
  plan.style.objectFit = "contain";
  planContainer.appendChild(plan);
  container.appendChild(planContainer);

  // Informations de ligne en dessous
  const infoContainer = document.createElement("div");
  infoContainer.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8";

  // Badge type de ligne
  const typeContainer = document.createElement("div");
  typeContainer.className = "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg";
  
  const typeIcon = document.createElement("div");
  typeIcon.className = "text-4xl mb-3";
  typeIcon.textContent = ligne.id === "NS" ? "🚌" : ligne.type === "Spéciale" ? "⭐" : ligne.type === "Volc'Express" ? "🚆" : "🚍";
  
  const type = document.createElement("div");
  type.className = "badge badge-lg badge-outline badge-primary px-4 py-3 text-base font-semibold";
  type.textContent =
    ligne.id === "NS"
      ? "Navette Spéciale"
      : ligne.type === "Spéciale"
      ? "Ligne Spéciale"
      : `Réseau ${ligne.type}`;
      
  typeContainer.appendChild(typeIcon);
  typeContainer.appendChild(type);
  infoContainer.appendChild(typeContainer);

  // Statistiques - Arrêts
  const arretsContainer = document.createElement("div");
  arretsContainer.className = "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg";
  
  const arretsIcon = document.createElement("div");
  arretsIcon.className = "text-4xl mb-3";
  arretsIcon.textContent = "🚏";
  
  const arretsTitle = document.createElement("div");
  arretsTitle.className = "text-sm font-medium text-base-content/70 uppercase tracking-wider";
  arretsTitle.textContent = "Arrêts";
  
  const arretsValue = document.createElement("div");
  arretsValue.className = "text-3xl font-bold text-primary";
  arretsValue.textContent = ligne.stats.nombre_arrets;
  
  arretsContainer.appendChild(arretsIcon);
  arretsContainer.appendChild(arretsTitle);
  arretsContainer.appendChild(arretsValue);
  infoContainer.appendChild(arretsContainer);

  // Statistiques - Temps de trajet
  const tempsContainer = document.createElement("div");
  tempsContainer.className = "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg";
  
  const tempsIcon = document.createElement("div");
  tempsIcon.className = "text-4xl mb-3";
  tempsIcon.textContent = "⏱️";
  
  const tempsTitle = document.createElement("div");
  tempsTitle.className = "text-sm font-medium text-base-content/70 uppercase tracking-wider";
  tempsTitle.textContent = "Temps de trajet";
  
  const tempsValue = document.createElement("div");
  tempsValue.className = "text-3xl font-bold text-primary";
  tempsValue.textContent = ligne.stats.temps_trajet;
  
  tempsContainer.appendChild(tempsIcon);
  tempsContainer.appendChild(tempsTitle);
  tempsContainer.appendChild(tempsValue);
  infoContainer.appendChild(tempsContainer);

  // Si on a 4 stats ou plus, on peut ajouter une ligne supplémentaire
  if (ligne.stats.longueur_ligne) {
    // Statistiques - Longueur (sur une nouvelle ligne ou en extension)
    const longueurContainer = document.createElement("div");
    longueurContainer.className = "flex flex-col items-center justify-center p-6 bg-base-200 dark:bg-base-300 rounded-xl shadow-lg md:col-span-2 lg:col-span-1";
    
    const longueurIcon = document.createElement("div");
    longueurIcon.className = "text-4xl mb-3";
    longueurIcon.textContent = "📏";
    
    const longueurTitle = document.createElement("div");
    longueurTitle.className = "text-sm font-medium text-base-content/70 uppercase tracking-wider";
    longueurTitle.textContent = "Longueur";
    
    const longueurValue = document.createElement("div");
    longueurValue.className = "text-3xl font-bold text-primary";
    longueurValue.textContent = ligne.stats.longueur_ligne;
    
    longueurContainer.appendChild(longueurIcon);
    longueurContainer.appendChild(longueurTitle);
    longueurContainer.appendChild(longueurValue);
    infoContainer.appendChild(longueurContainer);
  }

  container.appendChild(infoContainer);

  // Description
  const description = document.createElement("p");
  description.className =
    "text-lg text-base-content/80 leading-relaxed text-justify mt-8 mb-8";
  description.innerHTML = ligne.description;
  container.appendChild(description);

  // Bouton PDF principal bien mis en évidence
  const pdfSection = document.createElement("div");
  pdfSection.className = "text-center mt-12 mb-8";
  
  const pdfButton = document.createElement("button");
  pdfButton.id = "main-pdf-btn";
  pdfButton.className = "btn btn-primary btn-lg gap-3 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 px-8 py-4";
  pdfButton.innerHTML = `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
    <span class="text-lg font-semibold">Télécharger la fiche horaire PDF</span>
    <div class="badge badge-accent badge-sm">Nouveau</div>
  `;
  
  // Gestionnaire d'événements pour le bouton PDF
  pdfButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof generatePDF === "function") {
      generatePDF(ligne.id);
    } else {
      console.error("generatePDF is not defined. Is pdf.js loaded?");
      // Toast d'erreur moderne
      const toast = document.createElement('div');
      toast.className = 'toast toast-top toast-end z-50';
      toast.innerHTML = `
        <div class="alert alert-error shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Erreur : Générateur PDF non disponible</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    }
  });
  
  pdfSection.appendChild(pdfButton);
  container.appendChild(pdfSection);

  if (destinationElement) {
    destinationElement.textContent = ligne.destination;
  }
}

async function init() {
  const lineNumber = window.location.hash.replace("#", "");

  if (lineNumber.startsWith("BEN")) {
    window.location.href = `/src/nocturne.html#${lineNumber}`;
    return;
  }

  if (!lineNumber) {
    alert("Aucune ligne spécifiée dans l’URL !");
    return;
  }

  await fetchHolidayDates(now.getFullYear());

  lineDetailsData = await fetchLineDetails(lineNumber);

  if (!lineDetailsData) {
    const bloccElement = document.getElementById("blocc");
    if (bloccElement) bloccElement.style.display = "none";
    const alertContainer = document.getElementById("alertMessage");
    if (alertContainer) alertContainer.style.display = "none";
    const infoMsgContainer = document.getElementById("infoMessage");
    if (infoMsgContainer) infoMsgContainer.style.display = "none";
    const trafficContainer = document.getElementById("lignes");
    if (trafficContainer) trafficContainer.style.display = "none";

    const infosContainer = document.getElementById("infos-ligne");
    if (infosContainer) {
      infosContainer.innerHTML = `
        <div class="text-center py-16">
          <h1 class="text-8xl font-bold text-primary animate-pulse">404</h1>
          <p class="text-3xl font-semibold mt-4 tracking-wider">Ligne Introuvable</p>
          <p class="text-lg mt-2 text-base-content/70">
            La ligne <span class="font-bold text-primary">${lineNumber}</span> que vous cherchez n'existe pas.
          </p>
          <div class="mt-8">
            <a href="/index.html" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clip-rule="evenodd" />
              </svg>
              Retour à l'accueil
            </a>
          </div>
        </div>
      `;
    }
    return;
  }

  renderLineDetails(lineDetailsData);

  if (lineNumber === "NS") {
    const bloccElement = document.getElementById("blocc");
    if (bloccElement) {
      bloccElement.style.display = "none";
    }
  }

  lineFrequenciesData = await fetchLineFrequencies(lineNumber);

  if (!lineFrequenciesData) {
    nextBusTime.innerHTML =
      "<div class='alert alert-error'>Fréquences de passage non disponibles pour cette ligne.</div>";
    return;
  }

  updateBusTimes();
  setInterval(updateBusTimes, 30000);
}

window.addEventListener("DOMContentLoaded", init);
