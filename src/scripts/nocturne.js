document.addEventListener("DOMContentLoaded", async () => {
  const mainContainer = document.getElementById('main-container');
  let countdownInterval = null; // To clear interval on hash change
  let holidayDates = [];

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchHolidayDates = async (year) => {
    try {
      const response = await fetch(`https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`);
      if (!response.ok) return [];
      const data = await response.json();
      return Object.keys(data);
    } catch (error) {
      console.error(`Erreur de récupération des jours fériés pour ${year}:`, error);
      return [];
    }
  };

  const initHolidays = async () => {
    const currentYear = new Date().getFullYear();
    const [holidays1, holidays2] = await Promise.all([
      fetchHolidayDates(currentYear),
      fetchHolidayDates(currentYear + 1)
    ]);
    holidayDates = [...holidays1, ...holidays2];
  };

  const getLigneId = () => window.location.hash.substring(1);

  const getCirculationInfo = (circulation) => {
    const now = new Date();
    const nowHour = now.getHours();
    const nowDay = now.getDay();
    const yesterdayDay = (nowDay + 6) % 7;

    let activePeriod = null;

    // Check special periods first
    if (circulation.special_periods) {
        activePeriod = circulation.special_periods.find(period => {
            const startPeriod = new Date(period.start);
            startPeriod.setHours(0, 0, 0, 0);
            
            const endPeriod = new Date(period.end);
            endPeriod.setHours(23, 59, 59, 999);

            const startHour = period.startHour || 21;
            const endHour = period.endHour || 5;

            // Check if we are in the morning part of a service from the previous day
            if (nowHour < endHour) {
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                if (yesterday >= startPeriod && yesterday <= endPeriod && period.days.includes(yesterdayDay)) {
                    return true;
                }
            }
            
            // Check if we are in the evening part of a service for the current day
            if (nowHour >= startHour) {
                if (now >= startPeriod && now <= endPeriod && period.days.includes(nowDay)) {
                    return true;
                }
            }
            
            return false;
        });
    }

    // If an active special period is found, return its config
    if (activePeriod) {
        return {
            circulationText: activePeriod.text,
            serviceDays: activePeriod.days,
            frequency: activePeriod.frequency,
            startHour: activePeriod.startHour || 21,
            endHour: activePeriod.endHour || 5
        };
    }

    // Otherwise, check default circulation
    const startHour = circulation.startHour || 21;
    const endHour = circulation.endHour || 5;
    const serviceDays = circulation.default_days || [];

    const isEveningService = serviceDays.includes(nowDay) && nowHour >= startHour;
    const isMorningService = serviceDays.includes(yesterdayDay) && nowHour < endHour;

    if (isEveningService || isMorningService) {
        return {
            circulationText: circulation.default_text,
            serviceDays: serviceDays,
            frequency: circulation.frequency,
            startHour: startHour,
            endHour: endHour
        };
    }

    // If no service is active
    return null;
  };

  const renderWelcomeScreen = () => {
    mainContainer.innerHTML = `
      <div class="hero min-h-[60vh] text-center animate-fade-in">
        <div class="hero-content flex-col">
            <i class="fa-solid fa-moon text-primary text-8xl mb-6 animate-pulse"></i>
            <h1 class="text-5xl md:text-6xl font-bold text-white">La nuit vous appartient</h1>
            <p class="py-6 text-lg max-w-lg text-white/80">Le réseau de nuit TCM vous accompagne en toute sécurité. Sélectionnez une ligne pour voir les prochains départs et planifier votre trajet.</p>
            <div>
                <a href="/src/reseau.html" class="btn btn-primary btn-lg shadow-lg">Voir les lignes de nuit</a>
            </div>
        </div>
      </div>
    `;
  };

  const renderLigneScreen = (ligne) => {
    const info = getCirculationInfo(ligne.circulation);
    // Si le service est terminé, on ne peut pas extraire le texte.
    const circulationText = info ? info.circulationText : "Service terminé pour aujourd'hui.";

    mainContainer.innerHTML = `
    <div class="w-full max-w-6xl mx-auto">
        <!-- Titre -->
        <div class="text-center mb-12 animate-fade-in">
            <div class="inline-block bg-primary/20 rounded-full px-6 py-2 mb-4 shadow-lg">
                <h1 class="text-5xl font-bold text-white tracking-widest">${ligne.id}</h1>
            </div>
            <p class="text-3xl font-light text-white/90">${ligne.nom}</p>
        </div>

        <!-- Zone des décomptes -->
        <div id="countdown-container" class="flex flex-wrap justify-center items-stretch gap-8 mb-12 animate-fade-in" style="animation-delay: 0.2s;">
            <!-- Les décomptes seront injectés ici -->
        </div>

        <!-- Plan de la ligne -->
        <div class="card glass shadow-xl p-4 transition-transform hover:scale-105 mb-8 animate-fade-in" style="animation-delay: 0.4s;">
            <h2 class="text-2xl font-bold mb-4 text-center text-white">Plan de la ligne</h2>
            <figure><img src="/img/plans/${ligne.id}.png" alt="Plan de la ligne ${ligne.id}" class="w-full h-full object-contain rounded-lg shadow-lg" onerror="this.onerror=null;this.src='/img/plans/LNS.png';"></figure>
        </div>

        <!-- Grille d'informations -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in" style="animation-delay: 0.6s;">
            
            <!-- À savoir -->
            <div class="card glass shadow-xl transition-transform hover:scale-105 h-full">
                <div class="card-body">
                    <h2 class="card-title text-white"><i class="fa-solid fa-circle-info mr-3 text-info"></i> À savoir</h2>
                    <p class="text-white/80">${ligne.description}</p>
                </div>
            </div>

            <!-- Jours de circulation -->
            <div id="circulation-container" class="card glass shadow-xl transition-transform hover:scale-105 h-full">
                <div class="card-body">
                    <h2 class="card-title text-white"><i class="fa-solid fa-calendar-days mr-3 text-accent"></i> Jours de circulation</h2>
                    <p class="text-white/80">${circulationText}</p>
                </div>
            </div>

            <!-- Stats -->
            <div class="stats stats-vertical shadow w-full glass transition-transform hover:scale-105">
                <div class="stat">
                    <div class="stat-figure text-primary"><i class="fa-solid fa-signs-post text-3xl"></i></div>
                    <div class="stat-title text-white/80">Arrêts</div>
                    <div class="stat-value text-white">${ligne.stats.nombre_arrets}</div>
                </div>
                <div class="stat">
                    <div class="stat-figure text-secondary"><i class="fa-solid fa-clock text-3xl"></i></div>
                    <div class="stat-title text-white/80">Trajet</div>
                    <div class="stat-value text-white">${ligne.stats.temps_trajet}</div>
                </div>
                <div class="stat">
                    <div class="stat-figure text-accent"><i class="fa-solid fa-route text-3xl"></i></div>
                    <div class="stat-title text-white/80">Longueur</div>
                    <div class="stat-value text-white">${ligne.stats.longueur_ligne}</div>
                </div>
            </div>
        </div>
    </div>
    `;
    startCountdown(ligne);
    
    // Ajouter le gestionnaire d'événements pour le bouton PDF principal
    setTimeout(() => {
      const mainPdfBtn = document.getElementById('main-pdf-btn');
      if (mainPdfBtn && typeof handleNightPdfGeneration === 'function') {
        mainPdfBtn.addEventListener('click', handleNightPdfGeneration);
      }
    }, 100);
  };

  const generateCountdownHTML = (secondsToNextPassage, secondsSinceLastPassage, interval, terminus) => {
    const intervalInSeconds = interval * 60;
    let content;

    // Cas 1: Le bus est au départ ou vient de passer (pendant 60s)
    if (secondsSinceLastPassage < 60) {
        content = `
            <div class="relative w-48 h-48 flex items-center justify-center my-4">
                <div class="radial-progress text-success" style="--value:100; --size:12rem; --thickness: 0.5rem;"></div>
                <div class="absolute text-4xl font-bold text-white text-center">Ben est là,<br/>monte !</div>
            </div>
        `;
    }
    // Cas 2: Le bus approche (moins d'une minute)
    else if (secondsToNextPassage <= 60) {
        content = `
            <div class="relative w-48 h-48 flex items-center justify-center my-4">
                <div class="radial-progress text-warning animate-pulse" style="--value:100; --size:12rem; --thickness: 0.5rem;"></div>
                <div class="absolute text-4xl font-bold text-white text-center">Ben approche !</div>
            </div>
        `;
    }
    // Cas 3: Décompte normal
    else {
        const mins = Math.floor(secondsToNextPassage / 60);
        const secs = secondsToNextPassage % 60;
        const progress = (secondsSinceLastPassage / intervalInSeconds) * 100;
        content = `
            <div class="relative w-48 h-48 flex items-center justify-center my-4">
                <div class="radial-progress text-primary" style="--value:${progress}; --size:12rem; --thickness: 0.5rem;"></div>
                <div class="absolute text-5xl font-mono font-bold text-white">${String(mins).padStart(2, '0')}:${String(Math.floor(secs)).padStart(2, '0')}</div>
            </div>
        `;
    }

    return `
      <div class="card glass shadow-2xl flex-1 min-w-[300px] max-w-sm">
        <div class="card-body items-center text-center p-4">
          <h2 class="card-title mb-2">${terminus}</h2>
          ${content}
          <p class="text-sm text-white/60 mt-2">Toutes les ${Math.round(interval)} minutes</p>
        </div>
      </div>
    `;
  }

  const startCountdown = (ligne) => {
    const countdownContainer = document.getElementById('countdown-container');
    if (!countdownContainer) return;

    if (countdownInterval) clearInterval(countdownInterval);

    const update = () => {
        const circulationInfo = getCirculationInfo(ligne.circulation);

        if (!circulationInfo) {
            countdownContainer.innerHTML = `
              <div class="card glass w-full">
                <div class="card-body items-center justify-center text-center h-full p-8">
                  <i class="fa-solid fa-bed text-8xl text-info/70 mb-6"></i>
                  <h2 class="card-title text-3xl font-bold text-white">Service terminé</h2>
                  <p class="text-white/70 mt-4">Le service de nuit est en pause. Reprise prochainement !</p>
                </div>
              </div>
            `;
            if (countdownInterval) clearInterval(countdownInterval);
            return;
        }

        const now = new Date();
        const { frequency, startHour, endHour } = circulationInfo;

        let interval;
        if (typeof frequency === 'object' && frequency !== null) {
            const effectiveDate = new Date(now);
            // If it's early morning, the service day is yesterday
            if (now.getHours() < endHour) {
                effectiveDate.setDate(effectiveDate.getDate() - 1);
            }
            
            const dayOfWeek = effectiveDate.getDay(); // 0 for Sunday
            const dateStr = formatDate(effectiveDate);
            const isHoliday = holidayDates.includes(dateStr);

            if (isHoliday || dayOfWeek === 0) {
                interval = frequency.sunday_holiday;
            } else if (dayOfWeek === 6) {
                interval = frequency.saturday;
            } else {
                interval = frequency.weekday;
            }
        } else {
            interval = frequency;
        }

        if (!interval) {
            countdownContainer.innerHTML = `
              <div class="card glass w-full">
                <div class="card-body items-center justify-center text-center h-full p-8">
                  <i class="fa-solid fa-calendar-xmark text-8xl text-warning/70 mb-6"></i>
                  <h2 class="card-title text-3xl font-bold text-white">Service non disponible</h2>
                  <p class="text-white/70 mt-4">La fréquence n'est pas définie pour aujourd'hui.</p>
                </div>
              </div>
            `;
            if (countdownInterval) clearInterval(countdownInterval);
            return;
        }
        
        const intervalInSeconds = interval * 60;
        
        let serviceStartTime = new Date(now);
        if (now.getHours() < endHour) {
            serviceStartTime.setDate(serviceStartTime.getDate() - 1);
        }
        serviceStartTime.setHours(startHour, 0, 0, 0);

        const secondsSinceServiceStart = Math.floor((now - serviceStartTime) / 1000);

        let html = '';
        const terminusList = ligne.terminus || [];

        if (terminusList.length === 0) {
            countdownContainer.innerHTML = `
             <div class="card glass w-full">
                <div class="card-body items-center justify-center text-center h-full p-8">
                  <i class="fa-solid fa-compass-drafting text-8xl text-warning/70 mb-6"></i>
                  <h2 class="card-title text-3xl font-bold text-white">Direction inconnue</h2>
                  <p class="text-white/70 mt-4">Les informations sur les terminus de cette ligne ne sont pas encore disponibles.</p>
                </div>
              </div>
            `;
            return;
        }

        terminusList.forEach((terminus, index) => {
            const offset = terminusList.length > 1 && index > 0 ? (interval * 60) / 2 : 0;
            const effectiveSeconds = secondsSinceServiceStart + offset;
            
            const secondsSinceLastPassage = effectiveSeconds % (interval * 60);
            const secondsToNextPassage = (interval * 60) - secondsSinceLastPassage;

            html += generateCountdownHTML(secondsToNextPassage, secondsSinceLastPassage, interval, terminus);
        });

        countdownContainer.innerHTML = html;
    };
    
    update();
    countdownInterval = setInterval(update, 1000);
  };

  const loadLigneData = async () => {
    if (countdownInterval) clearInterval(countdownInterval);
    const ligneId = getLigneId();

    if (!ligneId) {
      renderWelcomeScreen();
      return;
    }

    try {
      const response = await fetch("./ligne.json");
      const data = await response.json();
      const ligne = data.lignes.find((l) => l.id === ligneId);

      if (!ligne) {
        throw new Error("Ligne non trouvée.");
      }
      renderLigneScreen(ligne);

    } catch (error) {
      console.error("Erreur de chargement des données:", error);
      mainContainer.innerHTML = `<div class="hero min-h-[60vh] glass rounded-box animate-fade-in">
        <div class="hero-content text-center">
          <div class="max-w-md">
            <i class="fa-solid fa-triangle-exclamation text-error text-7xl mb-6"></i>
            <h1 class="text-5xl font-bold text-error">Oups !</h1>
            <p class="py-6 text-white/80">Impossible de charger les informations pour la ligne <span class="font-bold text-white">${ligneId}</span>.</p>
            <p class="text-xs text-white/50">Détail de l'erreur: ${error.message}</p>
            <div class="mt-6">
                <a href="/src/reseau.html" class="btn btn-outline btn-error">Retour aux lignes</a>
            </div>
          </div>
        </div>
      </div>`;
    }
  };

  await initHolidays();
  window.addEventListener('hashchange', loadLigneData);
  loadLigneData();
});
