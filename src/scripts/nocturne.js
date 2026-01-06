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
            <h1 class="text-5xl md:text-6xl font-bold text-base-content">La nuit vous appartient</h1>
            <p class="py-6 text-lg max-w-lg text-base-content/80">Le réseau de nuit TCM vous accompagne en toute sécurité. Sélectionnez une ligne pour voir les prochains départs et planifier votre trajet.</p>
            <div>
                <a href="/src/reseau.html" class="btn btn-primary btn-lg shadow-lg">Voir les lignes de nuit</a>
            </div>
        </div>
      </div>
    `;
  };

  const renderLigneScreen = (ligne) => {
    const info = getCirculationInfo(ligne.circulation);
    
    // Détection Tramway (PL3)
    const isTram = ligne.id === 'PL3';
    const typeLabel = isTram ? 'Tramway de Nuit' : 'Bus de Nuit';
    const typeIcon = isTram ? 'fa-train-tram' : 'fa-bus';
    const themeColor = isTram ? 'warning' : 'primary';

    // Texte de circulation
    let circulationText;
    if (info) {
      circulationText = info.circulationText;
    } else {
      const circ = ligne.circulation || {};
      if (circ.default_text) {
        circulationText = `${circ.default_text} (service non actif actuellement)`;
      } else if (Array.isArray(circ.default_days) && circ.default_days.length) {
        const daysMap = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
        const days = circ.default_days.map(d => daysMap[d]).join(', ');
        const start = circ.startHour !== undefined ? `à partir de ${circ.startHour}h` : '';
        circulationText = `Circulation prévue ${days} ${start}. Service non actif actuellement.`;
      } else {
        circulationText = 'Service non actif actuellement. Consultez les horaires pour connaître les prochains départs.';
      }
    }

    mainContainer.innerHTML = `
    <div class="w-full max-w-6xl mx-auto px-4">
        <!-- Header Amélioré -->
        <div class="text-center mb-16 animate-fade-in relative">
            <!-- Badge Ligne -->
            <div class="inline-flex items-center justify-center mb-6 transform hover:scale-105 transition-transform duration-300">
                 <div class="flex items-center gap-4 bg-base-100/10 backdrop-blur-md border border-white/10 rounded-3xl px-8 py-4 shadow-2xl">
                    <div class="w-16 h-16 rounded-2xl bg-${themeColor} flex items-center justify-center shadow-lg shadow-${themeColor}/50">
                        <i class="fa-solid ${typeIcon} text-3xl text-base-content"></i>
                    </div>
                    <h1 class="text-6xl font-black text-base-content tracking-wider" style="text-shadow: 0 0 20px rgba(255,255,255,0.3);">${ligne.id}</h1>
                </div>
            </div>
            
            <!-- Nom et Type -->
            <h2 class="text-3xl md:text-5xl font-bold text-base-content mb-4 leading-tight">${ligne.nom}</h2>
            <div class="flex flex-wrap justify-center gap-3 mb-8">
                <span class="badge badge-lg badge-${themeColor} gap-2 shadow-lg shadow-${themeColor}/20 border-none text-base-content">
                    <i class="fa-solid fa-moon"></i> ${typeLabel}
                </span>
                ${ligne.accessibilite ? '<span class="badge badge-lg badge-ghost gap-2 bg-white/10 border-white/10 text-base-content"><i class="fa-solid fa-wheelchair"></i> Accessible</span>' : ''}
            </div>

            <!-- Bouton PDF -->
            <button onclick="generateNocturnePDF('${ligne.id}')" class="btn btn-lg btn-outline text-base-content border-white/30 hover:bg-white hover:text-black hover:border-white gap-3 shadow-xl backdrop-blur-sm group transition-all duration-300">
                <i class="fa-solid fa-file-pdf text-xl group-hover:scale-110 transition-transform text-error"></i> 
                Télécharger la fiche horaire
            </button>
        </div>

        <!-- Zone des décomptes -->
        <div id="countdown-container" class="flex flex-wrap justify-center items-stretch gap-8 mb-16 animate-fade-in" style="animation-delay: 0.2s;">
            <!-- Les décomptes seront injectés ici -->
        </div>

        <!-- Plan de la ligne -->
        <div class="card glass shadow-2xl overflow-hidden mb-12 animate-fade-in group" style="animation-delay: 0.4s;">
            <div class="card-body p-0 relative">
                <div class="absolute top-4 left-4 z-10">
                    <span class="badge badge-lg badge-neutral gap-2 shadow-lg">
                        <i class="fa-solid fa-map"></i> Plan de ligne
                    </span>
                </div>
                <figure class="bg-white/5 p-4 md:p-8 transition-colors group-hover:bg-white/10">
                    <img src="/img/plans/${ligne.id}.png" 
                         alt="Plan de la ligne ${ligne.id}" 
                         class="w-full h-auto max-h-[500px] object-contain rounded-xl shadow-lg transform transition-transform duration-500 group-hover:scale-[1.02]" 
                         onerror="this.onerror=null;this.src='/img/plans/LNS.png';">
                </figure>
            </div>
        </div>

        <!-- Grille d'informations -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style="animation-delay: 0.6s;">
            
            <!-- À savoir -->
            <div class="card glass shadow-xl hover:bg-white/5 transition-colors duration-300">
                <div class="card-body">
                    <h2 class="card-title text-base-content mb-4">
                        <div class="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center text-info">
                            <i class="fa-solid fa-circle-info text-xl"></i>
                        </div>
                        À savoir
                    </h2>
                    <p class="text-base-content/80 leading-relaxed">${ligne.description}</p>
                </div>
            </div>

            <!-- Jours de circulation -->
            <div id="circulation-container" class="card glass shadow-xl hover:bg-white/5 transition-colors duration-300">
                <div class="card-body">
                    <h2 class="card-title text-base-content mb-4">
                        <div class="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                            <i class="fa-solid fa-calendar-days text-xl"></i>
                        </div>
                        Circulation
                    </h2>
                    <p class="text-base-content/80 mb-4">${circulationText}</p>
                    <div class="divider before:bg-white/10 after:bg-white/10 text-base-content/50 text-sm">Parkings Relais</div>
                    <div id="circulation-parks" class="flex gap-3 flex-wrap"></div>
                </div>
            </div>

            <!-- Stats -->
            <div class="card glass shadow-xl hover:bg-white/5 transition-colors duration-300">
                <div class="card-body">
                    <h2 class="card-title text-base-content mb-6">
                        <div class="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center text-success">
                            <i class="fa-solid fa-chart-simple text-xl"></i>
                        </div>
                        Chiffres clés
                    </h2>
                    
                    <div class="space-y-6">
                        <div class="flex items-center justify-between group">
                            <div class="flex items-center gap-3 text-base-content/70">
                                <i class="fa-solid fa-signs-post w-6 text-center group-hover:text-primary transition-colors"></i>
                                <span>Arrêts desservis</span>
                            </div>
                            <span class="text-xl font-bold text-base-content">${ligne.stats.nombre_arrets}</span>
                        </div>
                        
                        <div class="flex items-center justify-between group">
                            <div class="flex items-center gap-3 text-base-content/70">
                                <i class="fa-solid fa-clock w-6 text-center group-hover:text-secondary transition-colors"></i>
                                <span>Temps de trajet</span>
                            </div>
                            <span class="text-xl font-bold text-base-content">${ligne.stats.temps_trajet}</span>
                        </div>
                        
                        <div class="flex items-center justify-between group">
                            <div class="flex items-center gap-3 text-base-content/70">
                                <i class="fa-solid fa-route w-6 text-center group-hover:text-accent transition-colors"></i>
                                <span>Longueur</span>
                            </div>
                            <span class="text-xl font-bold text-base-content">${ligne.stats.longueur_ligne}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    startCountdown(ligne);
    // Injecter les parkings dans la case 'Jours de circulation' si présents
    if (Array.isArray(ligne.parkings) && ligne.parkings.length) {
      const cirParEl = document.getElementById('circulation-parks');
      if (cirParEl) {
        fetch('/src/parkings.json').then(r => r.ok ? r.json() : null).then(data => {
          const map = {};
          if (Array.isArray(data)) data.forEach(p => { if (p && p.id) map[p.id] = p; });
          ligne.parkings.forEach(pid => {
            const a = document.createElement('a');
            a.href = `/src/parkings.html#${pid}`;
            a.className = 'inline-flex items-center gap-3 p-2 bg-base-100 text-base-content rounded-lg shadow hover:scale-105 transition-transform';

            const img = document.createElement('img');
            const meta = map[pid];
            img.src = meta && meta.image ? meta.image : `/img/${pid}.png`;
            img.alt = meta && meta.name ? meta.name : pid;
            img.className = 'w-8 h-8 rounded';
            img.onerror = function(){ this.src = `/img/parking-${pid}.png`; };

            const span = document.createElement('div');
            span.className = 'text-base-content/80 text-sm';
            span.textContent = meta && meta.name ? meta.name : pid;

            a.appendChild(img);
            a.appendChild(span);
            cirParEl.appendChild(a);
          });
        }).catch(() => {
          // fallback minimal
          ligne.parkings.forEach(pid => {
            const span = document.createElement('span');
            span.className = 'badge badge-info';
            span.textContent = pid;
            const el = document.getElementById('circulation-parks');
            if (el) el.appendChild(span);
          });
        });
      }
    }
    
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
                <div class="absolute text-4xl font-bold text-base-content text-center">Ben est là,<br/>monte !</div>
            </div>
        `;
    }
    // Cas 2: Le bus approche (moins d'une minute)
    else if (secondsToNextPassage <= 60) {
        content = `
            <div class="relative w-48 h-48 flex items-center justify-center my-4">
                <div class="radial-progress text-warning animate-pulse" style="--value:100; --size:12rem; --thickness: 0.5rem;"></div>
                <div class="absolute text-4xl font-bold text-base-content text-center">Ben approche !</div>
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
                <div class="absolute text-5xl font-mono font-bold text-base-content">${String(mins).padStart(2, '0')}:${String(Math.floor(secs)).padStart(2, '0')}</div>
            </div>
        `;
    }

    return `
      <div class="card glass shadow-2xl flex-1 min-w-[300px] max-w-sm">
        <div class="card-body items-center text-center p-4">
          <h2 class="card-title mb-2">${terminus}</h2>
          ${content}
          <p class="text-sm text-base-content/60 mt-2">Toutes les ${Math.round(interval)} minutes</p>
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
                  <h2 class="card-title text-3xl font-bold text-base-content">Service terminé</h2>
                  <p class="text-base-content/70 mt-4">Le service de nuit est en pause. Reprise prochainement !</p>
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
                  <h2 class="card-title text-3xl font-bold text-base-content">Service non disponible</h2>
                  <p class="text-base-content/70 mt-4">La fréquence n'est pas définie pour aujourd'hui.</p>
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
                  <h2 class="card-title text-3xl font-bold text-base-content">Direction inconnue</h2>
                  <p class="text-base-content/70 mt-4">Les informations sur les terminus de cette ligne ne sont pas encore disponibles.</p>
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
            <p class="py-6 text-base-content/80">Impossible de charger les informations pour la ligne <span class="font-bold text-base-content">${ligneId}</span>.</p>
            <p class="text-xs text-base-content/50">Détail de l'erreur: ${error.message}</p>
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
