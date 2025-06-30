// =======================================================================
// SYSTÈME AVANCÉ DE GÉNÉRATION PDF POUR TCM
// Design moderne, intégration d'images, encodage UTF-8 optimisé
// =======================================================================

// Configuration des couleurs TCM par type de ligne
const TCM_COLORS = {
    primary: [33, 75, 254],      // Bleu TCM principal
    secondary: [108, 117, 125],   // Gris moderne
    success: [40, 167, 69],       // Vert succès
    warning: [255, 193, 7],       // Orange avertissement
    danger: [220, 53, 69],        // Rouge erreur
    info: [23, 162, 184],         // Bleu info
    light: [248, 249, 250],       // Fond clair
    dark: [52, 58, 64],           // Texte sombre
    
    // Couleurs spécifiques par type
    scolaire: [255, 140, 0],      // Orange scolaire
    nocturne: [138, 43, 226],     // Violet nocturne
    navette: [0, 123, 255],       // Bleu navette
    regular: [33, 75, 254]        // Bleu régulier
};

// Configuration avancée pour l'encodage UTF-8
const PDF_CONFIG = {
    font: "helvetica",
    encoding: "utf8",
    formats: {
        date: 'fr-FR',
        time: '24h'
    },
    margins: {
        top: 20,
        left: 20,
        right: 20,
        bottom: 20
    },
    pageSize: 'a4'
};

// Fonction pour afficher/masquer le spinner de chargement avec design moderne
function showLoadingSpinner() {
    if (!document.getElementById('tcm-pdf-spinner')) {
        const spinner = document.createElement('div');
        spinner.id = 'tcm-pdf-spinner';
        spinner.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.7); display: flex; align-items: center; 
                        justify-content: center; z-index: 10000; backdrop-filter: blur(4px);">
                <div style="background: white; padding: 2rem; border-radius: 12px; 
                           box-shadow: 0 20px 40px rgba(0,0,0,0.3); text-align: center; 
                           min-width: 300px; border: 3px solid #214bfe;">
                    <div style="width: 50px; height: 50px; border: 4px solid #214bfe; 
                               border-top: 4px solid transparent; border-radius: 50%; 
                               animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                    <h3 style="margin: 0 0 0.5rem; color: #214bfe; font-family: Arial, sans-serif;">
                        Génération PDF en cours...
                    </h3>
                    <p style="margin: 0; color: #6c757d; font-size: 14px; font-family: Arial, sans-serif;">
                        Intégration des plans et optimisation du contenu
                    </p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(spinner);
    }
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('tcm-pdf-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// Fonction utilitaire pour charger une image en base64
async function loadImageAsBase64(imagePath) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        return new Promise((resolve, reject) => {
            img.onload = function() {
                canvas.width = this.width;
                canvas.height = this.height;
                ctx.drawImage(this, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                resolve({
                    data: dataURL,
                    width: this.width,
                    height: this.height
                });
            };
            img.onerror = reject;
            img.crossOrigin = "anonymous";
            img.src = imagePath;
        });
    } catch (error) {
        console.warn(`Impossible de charger l'image ${imagePath}:`, error);
        return null;
    }
}

// Fonction pour charger dynamiquement l'indice de ligne (badge/icône)
async function loadLineIcon(ligneId) {
    // Construire le chemin vers l'icône de la ligne
    const iconPath = `img/${ligneId}.png`;
    
    try {
        console.info(`🔍 Recherche de l'icône de ligne: ${iconPath}`);
        const iconData = await loadImageAsBase64(iconPath);
        
        if (iconData) {
            console.info(`✅ Icône de ligne ${ligneId} trouvée et chargée`);
            return iconData;
        } else {
            console.info(`⚠️ Icône ${iconPath} non disponible, utilisation du fallback`);
            return null;
        }
    } catch (error) {
        console.warn(`❌ Erreur lors du chargement de l'icône ${iconPath}:`, error);
        return null;
    }
}

// Fonction pour charger le logo TCM principal
async function loadTCMLogo() {
    try {
        const logoPath = 'img/TCM.png';
        console.info(`🔍 Chargement du logo TCM: ${logoPath}`);
        const logoData = await loadImageAsBase64(logoPath);
        
        if (logoData) {
            console.info(`✅ Logo TCM chargé avec succès`);
            return logoData;
        } else {
            console.info(`⚠️ Logo TCM non disponible, utilisation du texte`);
            return null;
        }
    } catch (error) {
        console.warn(`❌ Erreur lors du chargement du logo TCM:`, error);
        return null;
    }
}

// Fonction pour créer un dégradé simulé avec rectangles
function createGradientEffect(doc, x, y, width, height, color1, color2, steps = 5) {
    const stepHeight = height / steps;
    
    for (let i = 0; i < steps; i++) {
        const ratio = i / (steps - 1);
        const r = Math.round(color1[0] + (color2[0] - color1[0]) * ratio);
        const g = Math.round(color1[1] + (color2[1] - color1[1]) * ratio);
        const b = Math.round(color1[2] + (color2[2] - color1[2]) * ratio);
        
        doc.setFillColor(r, g, b);
        doc.rect(x, y + (i * stepHeight), width, stepHeight + 1, 'F');
    }
}

// Fonction moderne pour créer un en-tête avec icône dynamique
async function createModernHeader(doc, ligneId, lineType, accentColor, title, subtitle) {
    console.info(`🎨 Création de l'en-tête moderne pour ligne ${ligneId}`);
    
    // Fond dégradé en-tête
    createGradientEffect(doc, 0, 0, 210, 55, 
        accentColor, [accentColor[0] + 30, accentColor[1] + 30, accentColor[2] + 30], 8);
    
    // Charger le logo TCM et l'icône de ligne
    const [tcmLogo, lineIcon] = await Promise.all([
        loadTCMLogo(),
        loadLineIcon(ligneId)
    ]);
    
    // Position de départ
    let xPos = 15;
    
    // === LOGO TCM ===
    if (tcmLogo) {
        // Afficher le vrai logo TCM
        const logoSize = 25;
        const logoRatio = Math.min(logoSize / tcmLogo.width, logoSize / tcmLogo.height);
        const logoWidth = tcmLogo.width * logoRatio;
        const logoHeight = tcmLogo.height * logoRatio;
        
        doc.addImage(tcmLogo.data, 'PNG', xPos, 8, logoWidth, logoHeight);
        xPos += logoWidth + 10;
        console.info(`✅ Logo TCM ajouté à l'en-tête`);
    } else {
        // Fallback texte TCM
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text('TCM', xPos, 25);
        xPos += 35;
    }
    
    // === ICÔNE DE LIGNE ===
    if (lineIcon) {
        // Afficher l'icône spécifique à la ligne
        const iconSize = 30;
        const iconRatio = Math.min(iconSize / lineIcon.width, iconSize / lineIcon.height);
        const iconWidth = lineIcon.width * iconRatio;
        const iconHeight = lineIcon.height * iconRatio;
        
        // Fond blanc pour contraste
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(xPos - 2, 10, iconWidth + 4, iconHeight + 4, 5, 5, 'F');
        
        doc.addImage(lineIcon.data, 'PNG', xPos, 12, iconWidth, iconHeight);
        xPos += iconWidth + 15;
        console.info(`✅ Icône de ligne ${ligneId} ajoutée à l'en-tête`);
    } else {
        // Fallback cercle avec numéro
        doc.setFillColor(255, 255, 255);
        doc.circle(xPos + 15, 20, 18, 'F');
        doc.setTextColor(...accentColor);
        doc.setFontSize(24);
        doc.setFont(PDF_CONFIG.font, "bold");
        
        // Centrer le texte dans le cercle
        const textWidth = doc.getTextWidth(ligneId);
        doc.text(ligneId, xPos + 15 - (textWidth / 2), 26);
        xPos += 45;
    }
    
    // === TITRE PRINCIPAL ===
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text(title, xPos, 20);
    
    if (subtitle) {
        doc.setFontSize(11);
        doc.setFont(PDF_CONFIG.font, "normal");
        doc.text(subtitle, xPos, 30);
    }
    
    // === BADGES ET INFOS ===
    // Badge type de ligne
    const badgeWidth = 40;
    const badgeX = 155;
    
    doc.setFillColor(...accentColor);
    doc.roundedRect(badgeX, 35, badgeWidth, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont(PDF_CONFIG.font, "bold");
    
    const badgeText = lineType.toUpperCase();
    const badgeTextWidth = doc.getTextWidth(badgeText);
    doc.text(badgeText, badgeX + (badgeWidth - badgeTextWidth) / 2, 40);
    
    // Date de génération
    doc.setFont(PDF_CONFIG.font, "normal");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`Généré le ${new Date().toLocaleDateString(PDF_CONFIG.formats.date)}`, badgeX, 50);
    
    console.info(`✅ En-tête moderne créé avec succès`);
}

// Fonction principale de génération PDF avec router intelligent
async function generatePDF(ligneId = null) {
    // Vérifier la disponibilité de jsPDF
    if (typeof window.jspdf === 'undefined') {
        console.info('jsPDF non disponible ou non requis pour cette page.');
        return;
    }
    
    console.info('🎯 Démarrage génération PDF avancée TCM');
    showLoadingSpinner();
    
    try {
        // Délai pour l'affichage du spinner
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Déterminer le type de ligne
        const currentHash = ligneId ? ligneId.toString() : window.location.hash.substring(1);
        console.info(`📋 Génération PDF pour ligne: ${currentHash}`);
        
        // Router vers la fonction appropriée
        if (currentHash === 'NS') {
            await generateAdvancedNavettePDF();
        } else if (['1', '2'].includes(currentHash)) {
            await generateAdvancedNocturnePDF(currentHash);
        } else if (['601', '602', '651', '652'].includes(currentHash)) {
            await generateAdvancedScolairePDF(currentHash);
        } else {
            await generateAdvancedRegularPDF(currentHash);
        }
        
        console.info('✅ PDF généré avec succès');
        
    } catch (error) {
        console.error('❌ Erreur génération PDF:', error);
        alert('Erreur lors de la génération du PDF. Détails en console.');
    } finally {
        hideLoadingSpinner();
    }
}

// =======================================================================
// GÉNÉRATION PDF AVANCÉE POUR LIGNES SCOLAIRES
// =======================================================================
async function generateAdvancedScolairePDF(ligneNum) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // Configuration et métadonnées
    doc.setFont(PDF_CONFIG.font);
    doc.setProperties({
        title: `TCM - Ligne Scolaire ${ligneNum}`,
        subject: 'Fiche horaire transport scolaire détaillée',
        author: 'Transport Clermont Métropole',
        keywords: `transport, scolaire, ligne ${ligneNum}, horaires, TCM, Clermont-Ferrand`,
        creator: 'TCM - Système d\'Information Voyageurs v2.0'
    });
    
    // Charger les données
    let ligneData = null;
    try {
        const response = await fetch('./ligne.json');
        const data = await response.json();
        ligneData = data.lignes.find(l => l.id === parseInt(ligneNum));
    } catch (error) {
        console.warn('Données ligne non disponibles:', error);
    }
    
    // === PAGE 1: EN-TÊTE DESIGN MODERNE ===
    
    // Utiliser le nouvel en-tête avec icône dynamique
    await createModernHeader(
        doc, 
        ligneNum, 
        'Scolaire', 
        TCM_COLORS.scolaire,
        `LIGNE SCOLAIRE ${ligneNum}`,
        'TRANSPORT DÉDIÉ ÉTABLISSEMENTS SCOLAIRES'
    );
    
    // Badge spécial période scolaire
    doc.setFillColor(220, 53, 69);
    doc.roundedRect(20, 57, 170, 8, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('CIRCULATION PÉRIODE SCOLAIRE UNIQUEMENT - HORS VACANCES SCOLAIRES', 25, 62);
    
    // === SECTION DESTINATION AVANCÉE ===
    let yPos = 75;
    
    // Titre section
    doc.setTextColor(...TCM_COLORS.dark);
    doc.setFontSize(18);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('ITINÉRAIRE ET DESTINATION', 20, yPos);
    
    yPos += 8;
    
    // Carte destination
    doc.setFillColor(...TCM_COLORS.light);
    doc.roundedRect(20, yPos, 170, 25, 5, 5, 'F');
    doc.setDrawColor(...TCM_COLORS.scolaire);
    doc.setLineWidth(2);
    doc.roundedRect(20, yPos, 170, 25, 5, 5);
    
    // Contenu destination
    yPos += 10;
    doc.setTextColor(...TCM_COLORS.dark);
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.font, "bold");
    const destination = ligneData?.destination || `Ligne scolaire ${ligneNum}`;
    doc.text('DESSERTE:', 25, yPos);
    
    doc.setFont(PDF_CONFIG.font, "normal");
    doc.setFontSize(12);
    const destLines = doc.splitTextToSize(destination, 120);
    destLines.forEach((line, index) => {
        doc.text(line, 65, yPos + (index * 6));
    });
    
    // === SECTION HORAIRES DÉTAILLÉS MODERNE ===
    yPos = 115;
    
    doc.setFontSize(18);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.setTextColor(...TCM_COLORS.scolaire);
    doc.text('HORAIRES DÉTAILLÉS', 20, yPos);
    
    yPos += 10;
    
    // Extraction horaires
    const horairesScolaires = {
        aller: {
            normal: { car1: "07:15", car2: "08:30" },
            mercredi: { car1: "07:15", car2: "08:30" }
        },
        retour: {
            normal: { car1: "16:45", car2: "18:30" },
            mercredi: { car1: "12:45", car2: "18:00" }
        }
    };
    
    // DIRECTION ALLER avec design moderne
    doc.setFillColor(...TCM_COLORS.success);
    doc.roundedRect(20, yPos, 170, 20, 8, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('DIRECTION ALLER (vers établissement)', 30, yPos + 13);
    
    yPos += 30;
    
    // Tableau moderne horaires aller
    createModernTable(doc, 20, yPos, 170, [
        ['PÉRIODE', 'PREMIER CAR', 'SECOND CAR', 'FRÉQUENCE'],
        ['Lundi - Mardi - Jeudi - Vendredi', horairesScolaires.aller.normal.car1, horairesScolaires.aller.normal.car2, '2 cars/matin'],
        ['Mercredi', horairesScolaires.aller.mercredi.car1, horairesScolaires.aller.mercredi.car2, '2 cars/matin']
    ], TCM_COLORS.success);
    
    yPos += 45;
    
    // DIRECTION RETOUR
    doc.setFillColor(...TCM_COLORS.danger);
    doc.roundedRect(20, yPos, 170, 20, 8, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('DIRECTION RETOUR (depuis établissement)', 30, yPos + 13);
    
    yPos += 30;
    
    // Tableau horaires retour
    createModernTable(doc, 20, yPos, 170, [
        ['PÉRIODE', 'PREMIER CAR', 'SECOND CAR', 'FRÉQUENCE'],
        ['Lundi - Mardi - Jeudi - Vendredi', horairesScolaires.retour.normal.car1, horairesScolaires.retour.normal.car2, '2 cars/soir'],
        ['Mercredi', horairesScolaires.retour.mercredi.car1, horairesScolaires.retour.mercredi.car2, '2 cars/après-midi']
    ], TCM_COLORS.danger);
    
    yPos += 60;
    
    // === STATISTIQUES VISUELLES ===
    doc.setFontSize(18);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.setTextColor(...TCM_COLORS.scolaire);
    doc.text('INFORMATIONS DE LA LIGNE', 20, yPos);
    
    yPos += 15;
    
    if (ligneData?.stats) {
        createStatsCards(doc, 20, yPos, [
            ['Nombre d\'arrêts', ligneData.stats.nombre_arrets || 'N/A', '🚏'],
            ['Temps de trajet', ligneData.stats.temps_trajet || 'N/A', '⏱️'],
            ['Distance totale', ligneData.stats.longueur_ligne || 'N/A', '📏'],
            ['Cars quotidiens', '4 services/jour', '🚌']
        ]);
    }
    
    // === PAGE 2: PLAN INTÉGRÉ ===
    doc.addPage();
    
    await createPlanPage(doc, ligneNum, 'SCOLAIRE', TCM_COLORS.scolaire);
    
    // === PAGE 3: INFORMATIONS COMPLÉMENTAIRES ===
    doc.addPage();
    
    createInfoPage(doc, ligneNum, 'scolaire', ligneData);
    
    // Sauvegarde
    doc.save(`TCM_Ligne_Scolaire_${ligneNum}_Complete.pdf`);
    console.info(`✅ PDF scolaire avancé ligne ${ligneNum} généré`);
}

// =======================================================================
// FONCTIONS UTILITAIRES POUR DESIGN MODERNE
// =======================================================================

// Créer un tableau moderne avec style
function createModernTable(doc, x, y, width, data, accentColor) {
    const cellHeight = 12;
    const headerHeight = 15;
    
    // En-tête
    doc.setFillColor(...accentColor);
    doc.roundedRect(x, y, width, headerHeight, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(PDF_CONFIG.font, "bold");
    
    const colWidth = width / data[0].length;
    data[0].forEach((header, index) => {
        doc.text(header, x + 5 + (index * colWidth), y + 10);
    });
    
    // Lignes du tableau
    let currentY = y + headerHeight;
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Alternance des couleurs
        if (i % 2 === 0) {
            doc.setFillColor(...TCM_COLORS.light);
            doc.rect(x, currentY, width, cellHeight, 'F');
        }
        
        // Bordures
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(x, currentY, width, cellHeight);
        
        // Contenu
        doc.setTextColor(...TCM_COLORS.dark);
        doc.setFontSize(9);
        doc.setFont(PDF_CONFIG.font, "normal");
        
        row.forEach((cell, index) => {
            doc.text(cell, x + 5 + (index * colWidth), currentY + 8);
        });
        
        currentY += cellHeight;
    }
}

// Créer des cartes de statistiques
function createStatsCards(doc, x, y, stats) {
    const cardWidth = 40;
    const cardHeight = 30;
    const gap = 5;
    
    stats.forEach((stat, index) => {
        const cardX = x + (index % 2) * (cardWidth + gap);
        const cardY = y + Math.floor(index / 2) * (cardHeight + gap);
        
        // Fond carte avec ombre
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(cardX + 1, cardY + 1, cardWidth, cardHeight, 5, 5, 'F');
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 5, 5, 'F');
        
        // Bordure
        doc.setDrawColor(...TCM_COLORS.primary);
        doc.setLineWidth(1);
        doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 5, 5);
        
        // Icône (simulée)
        doc.setFontSize(16);
        doc.text(stat[2], cardX + 5, cardY + 12);
        
        // Titre
        doc.setTextColor(...TCM_COLORS.secondary);
        doc.setFontSize(8);
        doc.setFont(PDF_CONFIG.font, "normal");
        doc.text(stat[0], cardX + 5, cardY + 20);
        
        // Valeur
        doc.setTextColor(...TCM_COLORS.primary);
        doc.setFontSize(11);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text(stat[1], cardX + 5, cardY + 27);
    });
}

// Créer une page de plan intégrée avec en-tête moderne
async function createPlanPage(doc, ligneNum, type, accentColor) {
    // En-tête plan avec icône dynamique
    await createModernHeader(
        doc, 
        ligneNum, 
        type.toLowerCase(), 
        accentColor,
        `PLAN DÉTAILLÉ - LIGNE ${ligneNum}`,
        `CARTOGRAPHIE ${type}`
    );
    
    // Essayer de charger le vrai plan
    let planPath;
    if (typeof ligneNum === 'string' && (ligneNum.startsWith('BEN'))) {
        planPath = `img/plans/${ligneNum}.png`;
    } else {
        planPath = `img/plans/L${ligneNum}.png`;
    }
    const planImage = await loadImageAsBase64(planPath);
    
    if (planImage) {
        // Calculer les dimensions pour ajustement
        const maxWidth = 170;
        const maxHeight = 120;
        const ratio = Math.min(maxWidth / planImage.width, maxHeight / planImage.height);
        const imgWidth = planImage.width * ratio;
        const imgHeight = planImage.height * ratio;
        
        // Centrer l'image
        const imgX = 20 + (maxWidth - imgWidth) / 2;
        const imgY = 75;
        
        // Cadre pour l'image
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, 70, 180, 130, 8, 8, 'F');
        doc.setDrawColor(...accentColor);
        doc.setLineWidth(3);
        doc.roundedRect(15, 70, 180, 130, 8, 8);
        
        // Insérer l'image
        doc.addImage(planImage.data, 'PNG', imgX, imgY, imgWidth, imgHeight);
        
        console.info(`✅ Plan L${ligneNum}.png intégré dans le PDF`);
        
        // Légende
        doc.setTextColor(...TCM_COLORS.secondary);
        doc.setFontSize(10);
        doc.text(`Plan officiel de la ligne ${ligneNum} - TCM`, 105, 195);
        
    } else {
        // Plan non disponible - créer un placeholder design
        doc.setFillColor(...TCM_COLORS.light);
        doc.roundedRect(20, 60, 170, 120, 8, 8, 'F');
        doc.setDrawColor(...accentColor);
        doc.setLineWidth(2);
        doc.roundedRect(20, 60, 170, 120, 8, 8);
        
        // Icône plan manquant
        doc.setTextColor(...accentColor);
        doc.setFontSize(48);
        doc.text('🗺️', 105, 110);
        
        doc.setFontSize(16);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text(`PLAN LIGNE ${ligneNum}`, 105, 130);
        
        doc.setTextColor(...TCM_COLORS.secondary);
        doc.setFontSize(12);
        doc.setFont(PDF_CONFIG.font, "normal");
        doc.text('Plan détaillé disponible :', 105, 145);
        doc.text('• Site web TCM', 105, 155);
        doc.text('• Application mobile', 105, 165);
        doc.text('• Aux arrêts de la ligne', 105, 175);
        
        console.warn(`⚠️ Plan L${ligneNum}.png non trouvé`);
    }
    
    // QR Code simulé pour accès digital
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 200, 40, 40, 5, 5, 'F');
    doc.setDrawColor(...TCM_COLORS.dark);
    doc.rect(15, 200, 40, 40);
    
    // Pattern QR code simulé
    doc.setFillColor(...TCM_COLORS.dark);
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if ((i + j) % 2 === 0) {
                doc.rect(18 + (i * 4), 203 + (j * 4), 3, 3, 'F');
            }
        }
    }
    
    doc.setTextColor(...TCM_COLORS.secondary);
    doc.setFontSize(10);
    doc.text('Scannez pour accéder', 60, 215);
    doc.text('au plan interactif', 60, 225);
}

// Créer une page d'informations complémentaires
function createInfoPage(doc, ligneNum, type, ligneData) {
    // En-tête
    const headerColor = type === 'scolaire' ? TCM_COLORS.scolaire : 
                       type === 'nocturne' ? TCM_COLORS.nocturne : TCM_COLORS.primary;
    
    createGradientEffect(doc, 0, 0, 210, 40, headerColor, [headerColor[0] + 20, headerColor[1] + 20, headerColor[2] + 20], 5);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text(`INFORMATIONS COMPLÉMENTAIRES`, 20, 25);
    
    let yPos = 60;
    
    // Description détaillée
    if (ligneData?.description) {
        doc.setFontSize(16);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.setTextColor(...headerColor);
        doc.text('DESCRIPTION DU SERVICE', 20, yPos);
        
        yPos += 15;
        
        doc.setFillColor(...TCM_COLORS.light);
        doc.roundedRect(20, yPos, 170, 40, 5, 5, 'F');
        doc.setDrawColor(...headerColor);
        doc.roundedRect(20, yPos, 170, 40, 5, 5);
        
        doc.setTextColor(...TCM_COLORS.dark);
        doc.setFontSize(11);
        doc.setFont(PDF_CONFIG.font, "normal");
        const description = ligneData.description.replace(/<[^>]*>/g, '');
        const descLines = doc.splitTextToSize(description, 160);
        
        let descY = yPos + 10;
        descLines.slice(0, 5).forEach(line => {
            doc.text(line, 25, descY);
            descY += 6;
        });
        
        yPos += 55;
    }
    
    // Informations pratiques selon le type
    const practicalInfos = {
        scolaire: [
            ['Public concerné', 'Élèves des établissements scolaires'],
            ['Période de service', 'Période scolaire uniquement'],
            ['Hors service', 'Vacances, week-ends, jours fériés'],
            ['Ponctualité', 'Départs garantis aux heures indiquées']
        ],
        nocturne: [
            ['Service étendu', 'Jusqu\'à 2h00 du matin'],
            ['Public cible', 'Étudiants, travailleurs nocturnes'],
            ['Correspondances', 'Avec réseau tramway'],
            ['Info temps réel', 'Application TCM disponible']
        ],
        regular: [
            ['Service continu', '7 jours sur 7'],
            ['Accessibilité', 'Véhicules adaptés PMR'],
            ['Billettique', 'Tous titres TCM acceptés'],
            ['Temps réel', 'Horaires actualisés']
        ]
    };
    
    const infos = practicalInfos[type] || practicalInfos.regular;
    
    doc.setFontSize(16);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.setTextColor(...headerColor);
    doc.text('INFORMATIONS PRATIQUES', 20, yPos);
    
    yPos += 15;
    
    // Grille d'informations
    const cardWidth = 82;
    const cardHeight = 25;
    let xPos = 20;
    let infoY = yPos;
    
    infos.forEach((info, index) => {
        if (index === 2) {
            xPos = 20;
            infoY += cardHeight + 8;
        }
        
        // Carte info
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(xPos, infoY, cardWidth, cardHeight, 5, 5, 'F');
        doc.setDrawColor(...headerColor);
        doc.setLineWidth(1);
        doc.roundedRect(xPos, infoY, cardWidth, cardHeight, 5, 5);
        
        // Titre
        doc.setTextColor(...headerColor);
        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text(info[0], xPos + 5, infoY + 10);
        
        // Description
        doc.setTextColor(...TCM_COLORS.dark);
        doc.setFontSize(9);
        doc.setFont(PDF_CONFIG.font, "normal");
        const descLines = doc.splitTextToSize(info[1], cardWidth - 10);
        descLines.slice(0, 2).forEach((line, lineIndex) => {
            doc.text(line, xPos + 5, infoY + 17 + (lineIndex * 5));
        });
        
        xPos += cardWidth + 6;
    });
    
    // Contact et assistance
    yPos = 200;
    
    doc.setFillColor(...TCM_COLORS.info);
    doc.roundedRect(20, yPos, 170, 35, 8, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('📞 CONTACT ET ASSISTANCE', 30, yPos + 12);
    
    doc.setFontSize(11);
    doc.setFont(PDF_CONFIG.font, "normal");
    doc.text('• Site web: www.tcm.fr', 30, yPos + 22);
    doc.text('• Application: TCM Mobile', 30, yPos + 29);
    doc.text('• Tél. voyageurs: 04 73 28 56 56', 115, yPos + 22);
    doc.text('• Email: contact@tcm.fr', 115, yPos + 29);
    
    // Pied de page premium
    createPremiumFooter(doc, ligneNum, type);
}

// Créer un pied de page premium
function createPremiumFooter(doc, ligneNum, type) {
    // Bande de pied de page
    doc.setFillColor(52, 58, 64);
    doc.rect(0, 280, 210, 17, 'F');
    
    // Séparateur décoratif
    doc.setDrawColor(...TCM_COLORS.primary);
    doc.setLineWidth(2);
    doc.line(0, 280, 210, 280);
    
    // Contenu pied de page
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('TCM', 20, 290);
    
    doc.setFont(PDF_CONFIG.font, "normal");
    doc.setFontSize(8);
    doc.text(`Ligne ${type} ${ligneNum}`, 105, 287);
    doc.text(`Généré le ${new Date().toLocaleDateString(PDF_CONFIG.formats.date)} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 105, 293);
    doc.text(`Transport Clermont Métropole © ${new Date().getFullYear()}`, 170, 290);
}

// =======================================================================
// GÉNÉRATION PDF AVANCÉE POUR LIGNES NOCTURNES
// =======================================================================
async function generateAdvancedNocturnePDF(ligneNum) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // Configuration
    doc.setFont(PDF_CONFIG.font);
    doc.setProperties({
        title: `TCM - Ligne Nocturne ${ligneNum}`,
        subject: 'Fiche horaire ligne nocturne',
        author: 'Transport Clermont Métropole',
        keywords: `transport, nocturne, ligne ${ligneNum}, horaires, TCM`,
        creator: 'TCM - Service Nocturne v2.0'
    });
    
    // Charger les données de fréquence
    let frequenceData = null;
    try {
        const response = await fetch('../src/scripts/frequences_bus.json');
        const data = await response.json();
        frequenceData = data.lignes.find(l => l.numero === ligneNum);
    } catch (error) {
        console.warn('Données fréquences non disponibles:', error);
    }
    
    // === EN-TÊTE NOCTURNE DESIGN ===
    
    // Utiliser le nouvel en-tête avec icône dynamique pour les nocturnes
    await createModernHeader(
        doc, 
        ligneNum, 
        'Nocturne', 
        TCM_COLORS.nocturne,
        `LIGNE NOCTURNE ${ligneNum}`,
        'SERVICE DE NUIT - WEEKEND ET ÉVÉNEMENTS'
    );
    
    // Étoiles décoratives pour l'ambiance nocturne
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('✦', 25, 45);
    doc.text('✧', 45, 47);
    doc.text('✦', 35, 42);
    doc.text('✧', 165, 45);
    doc.text('✦', 185, 47);
    
    // Badge spécial service nocturne
    doc.setFillColor(138, 43, 226);
    doc.roundedRect(20, 57, 170, 8, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('SERVICE NOCTURNE - VENDREDI ET SAMEDI SOIR / ÉVÉNEMENTS SPÉCIAUX', 25, 62);
    
    // === SECTION DESTINATION ===
    let yPos = 75;
    
    doc.setTextColor(...TCM_COLORS.dark);
    doc.setFontSize(18);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('DESSERTE NOCTURNE', 20, yPos);
    
    yPos += 10;
    
    // Carte destination avec effet nocturne
    doc.setFillColor(25, 25, 35);
    doc.roundedRect(20, yPos, 170, 30, 8, 8, 'F');
    doc.setDrawColor(...TCM_COLORS.nocturne);
    doc.setLineWidth(2);
    doc.roundedRect(20, yPos, 170, 30, 8, 8);
    
    yPos += 12;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.font, "bold");
    const destination = frequenceData?.destination || (ligneNum === '1' ? 'Campus des Cézeaux' : 'Aéroport');
    doc.text('DESTINATION:', 25, yPos);
    
    doc.setFont(PDF_CONFIG.font, "normal");
    doc.setFontSize(12);
    doc.text(destination, 85, yPos);
    
    doc.setFontSize(10);
    doc.text('Service prioritaire zones étudiantes et résidentielles', 25, yPos + 10);
    
    // === SECTION FRÉQUENCES NOCTURNES ===
    yPos = 130;
    
    if (frequenceData) {
        doc.setFontSize(18);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.setTextColor(...TCM_COLORS.nocturne);
        doc.text('🕒 FRÉQUENCES NOCTURNES', 20, yPos);
        
        yPos += 15;
        
        // Tableau moderne des fréquences
        const frequences = frequenceData.frequences;
        const periodesNocturnes = [
            ['Soirée (19h-22h)', frequences.soir || '-', 'Fréquence normale'],
            ['Nocturne (22h-2h)', frequences.nocturne || '30 min', 'Service étendu'],
            ['Vendredi/Samedi', frequences.weekend_nocturne || '20 min', 'Fréquence renforcée'],
            ['Dimanche soir', frequences.dimanche_soir || '45 min', 'Service réduit']
        ];
        
        createAdvancedFrequencyTable(doc, 20, yPos, 170, periodesNocturnes, TCM_COLORS.nocturne);
        
        yPos += 80;
    }
    
    // === INFORMATIONS NOCTURNES SPÉCIALES ===
    doc.setFontSize(18);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.setTextColor(...TCM_COLORS.nocturne);
    doc.text('🌃 SPÉCIFICITÉS NOCTURNES', 20, yPos);
    
    yPos += 15;
    
    const specificites = [
        ['Sécurité renforcée', 'Vidéosurveillance active'],
        ['Éclairage adapté', 'Arrêts illuminés'],
        ['Contrôles fréquents', 'Présence sécurité'],
        ['Géolocalisation', 'Suivi temps réel']
    ];
    
    createStatsCards(doc, 20, yPos, specificites);
    
    // === PAGE 2: PLAN NOCTURNE ===
    doc.addPage();
    await createPlanPage(doc, ligneNum, 'NOCTURNE', TCM_COLORS.nocturne);
    
    // === PAGE 3: INFORMATIONS NOCTURNES ===
    doc.addPage();
    createInfoPage(doc, ligneNum, 'nocturne', { description: `Service nocturne étendu jusqu'à 2h00 pour la ligne ${ligneNum}. Desserte prioritaire des zones étudiantes et résidentielles avec sécurité renforcée.` });
    
    // Sauvegarde
    doc.save(`TCM_Ligne_Nocturne_${ligneNum}_Complete.pdf`);
    console.info(`✅ PDF nocturne avancé ligne ${ligneNum} généré`);
}

// =======================================================================
// GÉNÉRATION PDF AVANCÉE POUR LIGNES RÉGULIÈRES
// =======================================================================
async function generateAdvancedRegularPDF(ligneNum) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // Configuration
    doc.setFont(PDF_CONFIG.font);
    doc.setProperties({
        title: `TCM - Ligne ${ligneNum}`,
        subject: 'Fiche horaire ligne régulière',
        author: 'Transport Clermont Métropole',
        keywords: `transport, urbain, ligne ${ligneNum}, horaires, TCM`,
        creator: 'TCM - Réseau Urbain v2.0'
    });
    
    // Charger les données
    let frequenceData = null;
    try {
        const response = await fetch('../src/scripts/frequences_bus.json');
        const data = await response.json();
        frequenceData = data.lignes.find(l => l.numero === ligneNum);
    } catch (error) {
        console.warn('Données fréquences non disponibles:', error);
    }
    
    // === EN-TÊTE MODERNE LIGNE RÉGULIÈRE ===
    
    // Utiliser le nouvel en-tête avec icône dynamique pour les lignes régulières
    await createModernHeader(
        doc, 
        ligneNum, 
        'Urbain', 
        TCM_COLORS.primary,
        `LIGNE ${ligneNum}`,
        'RÉSEAU URBAIN TCM'
    );
    
    // Badge service continu
    doc.setFillColor(...TCM_COLORS.success);
    doc.roundedRect(20, 57, 170, 8, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('SERVICE CONTINU - 7 JOURS SUR 7', 25, 62);
    
    // === SECTION DESTINATION ===
    let yPos = 75;
    
    doc.setTextColor(...TCM_COLORS.dark);
    doc.setFontSize(18);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('ITINÉRAIRE', 20, yPos);
    
    yPos += 10;
    
    // Carte destination moderne
    doc.setFillColor(...TCM_COLORS.light);
    doc.roundedRect(20, yPos, 170, 25, 6, 6, 'F');
    doc.setDrawColor(...TCM_COLORS.primary);
    doc.setLineWidth(2);
    doc.roundedRect(20, yPos, 170, 25, 6, 6);
    
    yPos += 12;
    doc.setTextColor(...TCM_COLORS.dark);
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.font, "bold");
    const destination = frequenceData?.destination || `Ligne régulière ${ligneNum}`;
    doc.text('DESSERTE:', 25, yPos);
    
    doc.setFont(PDF_CONFIG.font, "normal");
    doc.setFontSize(12);
    const destLines = doc.splitTextToSize(destination, 120);
    destLines.slice(0, 2).forEach((line, index) => {
        doc.text(line, 70, yPos + (index * 6));
    });
    
    // === SECTION FRÉQUENCES DÉTAILLÉES ===
    yPos = 120;
    
    if (frequenceData) {
        doc.setFontSize(18);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.setTextColor(...TCM_COLORS.primary);
        doc.text('FRÉQUENCES DÉTAILLÉES', 20, yPos);
        
        yPos += 15;
        
        // Période scolaire
        doc.setFillColor(...TCM_COLORS.success);
        doc.roundedRect(20, yPos, 170, 18, 6, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text('PÉRIODE SCOLAIRE', 30, yPos + 12);
        
        yPos += 25;
        
        // Tableau fréquences scolaires
        const frequencesScolaires = [
            ['Heures creuses (9h-16h)', frequenceData.frequences.creuse || '-'],
            ['Heures de pointe (7h-9h, 16h-19h)', frequenceData.frequences.pointe || '-'],
            ['Soirée (19h-22h)', frequenceData.frequences.soir || '-'],
            ['Samedi', frequenceData.frequences.samedi_creuse || '-'],
            ['Dimanche', frequenceData.frequences.dimanche_creuse || '-']
        ];
        
        createAdvancedFrequencyTable(doc, 20, yPos, 170, frequencesScolaires, TCM_COLORS.success);
        yPos += 70;
        
        // Période vacances si différente
        if (frequenceData.vacances) {
            doc.setFillColor(...TCM_COLORS.warning);
            doc.roundedRect(20, yPos, 170, 18, 6, 6, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont(PDF_CONFIG.font, "bold");
            doc.text('PÉRIODE VACANCES', 30, yPos + 12);
            
            yPos += 25;
            
            const frequencesVacances = [
                ['Heures creuses', frequenceData.vacances.creuse || '-'],
                ['Heures de pointe', frequenceData.vacances.pointe || '-'],
                ['Soirée', frequenceData.vacances.soir || '-'],
                ['Week-end', frequenceData.vacances.samedi_creuse || '-']
            ];
            
            createAdvancedFrequencyTable(doc, 20, yPos, 170, frequencesVacances, TCM_COLORS.warning);
        }
    }
    
    // === PAGE 2: PLAN INTÉGRÉ ===
    doc.addPage();
    await createPlanPage(doc, ligneNum, 'RÉGULIÈRE', TCM_COLORS.primary);
    
    // === PAGE 3: INFORMATIONS COMPLÉMENTAIRES ===
    doc.addPage();
    createInfoPage(doc, ligneNum, 'regular', { description: `Ligne régulière ${ligneNum} du réseau TCM. Service continu 7 jours sur 7 avec fréquences adaptées selon les périodes.` });
    
    // Sauvegarde
    doc.save(`TCM_Ligne_${ligneNum}_Complete.pdf`);
    console.info(`✅ PDF régulier avancé ligne ${ligneNum} généré`);
}

// =======================================================================
// GÉNÉRATION PDF AVANCÉE POUR NAVETTE SPÉCIALE
// =======================================================================
async function generateAdvancedNavettePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // Configuration
    doc.setFont(PDF_CONFIG.font);
    doc.setProperties({
        title: 'TCM - Navette Spéciale NS',
        subject: 'Fiche navette événementielle',
        author: 'Transport Clermont Métropole',
        keywords: 'transport, navette, événements, Zénith, TCM',
        creator: 'TCM - Services Événementiels v2.0'
    });
    
    // === EN-TÊTE NAVETTE SPÉCIALE ===
    
    // Utiliser le nouvel en-tête avec icône dynamique pour la navette
    await createModernHeader(
        doc, 
        'NS', 
        'Événementiel', 
        TCM_COLORS.navette,
        'NAVETTE SPÉCIALE',
        'SERVICE ÉVÉNEMENTIEL'
    );
    
    // Étoiles et décorations événementielles
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('🎪', 25, 45);
    doc.text('🎵', 45, 47);
    doc.text('🎤', 165, 45);
    doc.text('🎭', 185, 47);
    
    // Badge événements
    doc.setFillColor(255, 140, 0);
    doc.roundedRect(20, 57, 170, 8, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('SERVICE ADAPTATIF - ÉVÉNEMENTS ZÉNITH ET AUTRES LIEUX', 25, 62);
    
    // === CONTENU NAVETTE ===
    let yPos = 75;
    
    // Description du service
    doc.setTextColor(...TCM_COLORS.dark);
    doc.setFontSize(18);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('SERVICE ÉVÉNEMENTIEL', 20, yPos);
    
    yPos += 15;
    
    // Carte information
    doc.setFillColor(...TCM_COLORS.light);
    doc.roundedRect(20, yPos, 170, 40, 8, 8, 'F');
    doc.setDrawColor(...TCM_COLORS.navette);
    doc.setLineWidth(2);
    doc.roundedRect(20, yPos, 170, 40, 8, 8);
    
    doc.setTextColor(...TCM_COLORS.dark);
    doc.setFontSize(12);
    doc.setFont(PDF_CONFIG.font, "normal");
    doc.text('Service adaptatif fonctionnant uniquement lors d\'événements', 25, yPos + 12);
    doc.text('au Zénith d\'Auvergne et autres lieux événementiels.', 25, yPos + 20);
    
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('• Départs toutes les 15 minutes environ', 25, yPos + 30);
    
    yPos += 55;
    
    // Fonctionnement détaillé
    createEventServiceDetails(doc, 20, yPos);
    
    // === PAGE 2: PLAN NAVETTE ===
    doc.addPage();
    await createPlanPage(doc, 'NS', 'NAVETTE', TCM_COLORS.navette);
    
    // === PAGE 3: ÉVÉNEMENTS ET INFOS ===
    doc.addPage();
    await createEventPage(doc);
    
    // Sauvegarde
    doc.save('TCM_Navette_Speciale_NS_Complete.pdf');
    console.info('✅ PDF navette spéciale avancé généré');
}

// Fonction pour créer les détails du service événementiel
function createEventServiceDetails(doc, x, y) {
    let yPos = y;
    
    // Titre
    doc.setFontSize(16);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.setTextColor(...TCM_COLORS.navette);
    doc.text('⏰ FONCTIONNEMENT', x, yPos);
    
    yPos += 15;
    
    // Cartes de fonctionnement
    const services = [
        {
            title: '🚌 AVANT L\'ÉVÉNEMENT',
            content: ['30 min avant ouverture', 'Jusqu\'à 10 min avant début', 'Fréquence: 15 min'],
            color: TCM_COLORS.success
        },
        {
            title: '🎪 PENDANT L\'ÉVÉNEMENT',
            content: ['Service adaptatif', 'Selon affluence', 'Navettes à la demande'],
            color: TCM_COLORS.warning
        },
        {
            title: '🏁 APRÈS L\'ÉVÉNEMENT',
            content: ['Dès la fin du spectacle', 'Jusqu\'à 2h après', 'Navettes pleines'],
            color: TCM_COLORS.danger
        }
    ];
    
    services.forEach((service, index) => {
        const cardY = yPos + (index * 35);
        
        // Carte service
        doc.setFillColor(...service.color);
        doc.roundedRect(x, cardY, 170, 25, 6, 6, 'F');
        
        // Titre
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text(service.title, x + 10, cardY + 8);
        
        // Contenu
        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.font, "normal");
        service.content.forEach((line, lineIndex) => {
            doc.text(`• ${line}`, x + 10, cardY + 15 + (lineIndex * 4));
        });
    });
}

// Créer une page dédiée aux événements
async function createEventPage(doc) {
    // En-tête événements
    createGradientEffect(doc, 0, 0, 210, 45, TCM_COLORS.navette, [80, 180, 255], 6);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('🎪 ÉVÉNEMENTS ET INFORMATIONS', 20, 25);
    
    let yPos = 65;
    
    // Essayer de récupérer les événements
    try {
        const response = await fetch('src/test.json');
        const data = await response.json();
        const ligneNS = data.lignes.find(l => l.ligne === "NS");
        
        if (ligneNS && ligneNS.infos_trafic) {
            const events = ligneNS.infos_trafic.filter(info => 
                info.type === 'information'
            );
            
            // Filtrer les événements dont la date de fin n'est pas passée
            const now = new Date();
            const upcomingEvents = events.filter(event => {
                if (!event.fin) return true; // Si pas de date de fin, on garde
                const endDate = new Date(event.fin);
                return endDate >= now;
            });

            if (upcomingEvents.length > 0) {
                doc.setFontSize(16);
                doc.setFont(PDF_CONFIG.font, "bold");
                doc.setTextColor(...TCM_COLORS.navette);
                doc.text('📅 ÉVÉNEMENTS PROGRAMMÉS', 20, yPos);

                yPos += 15;

                upcomingEvents.forEach((event, index) => {
                    if (yPos > 250) return; // Éviter débordement

                    // Carte événement
                    doc.setFillColor(...TCM_COLORS.light);
                    doc.roundedRect(20, yPos, 170, 20, 5, 5, 'F');
                    doc.setDrawColor(...TCM_COLORS.navette);
                    doc.roundedRect(20, yPos, 170, 20, 5, 5);

                    // Contenu événement
                    doc.setTextColor(...TCM_COLORS.dark);
                    doc.setFontSize(11);
                    doc.setFont(PDF_CONFIG.font, "bold");
                    doc.text(event.titre, 25, yPos + 8);

                    doc.setFont(PDF_CONFIG.font, "normal");
                    doc.setFontSize(9);
                    const startDate = event.debut ? new Date(event.debut).toLocaleDateString(PDF_CONFIG.formats.date) : '';
                    const endDate = event.fin ? new Date(event.fin).toLocaleDateString(PDF_CONFIG.formats.date) : '';
                    if (startDate && endDate) {
                        doc.text(`Du ${startDate} au ${endDate}`, 25, yPos + 15);
                    } else if (startDate) {
                        doc.text(`Le ${startDate}`, 25, yPos + 15);
                    }
                    yPos += 25;
                });
            }
        }
    } catch (error) {
        console.warn('Événements non disponibles:', error);
        
        // Informations génériques
        doc.setTextColor(...TCM_COLORS.secondary);
        doc.setFontSize(12);
        doc.text('Événements consultables sur :', yPos);
        doc.text('• Site web TCM', 25, yPos + 10);
        doc.text('• Application mobile', 25, yPos + 18);
        doc.text('• Réseaux sociaux TCM', 25, yPos + 26);
    }
    
    // Informations pratiques navette
    yPos = 180;
    
    doc.setFillColor(...TCM_COLORS.info);
    doc.roundedRect(20, yPos, 170, 50, 8, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('ℹ️ INFORMATIONS NAVETTE', 30, yPos + 15);
    
    doc.setFontSize(11);
    doc.setFont(PDF_CONFIG.font, "normal");
    doc.text('• Véhicules climatisés et accessibles PMR', 30, yPos + 25);
    doc.text('• Service gratuit avec billet événement', 30, yPos + 33);
    doc.text('• Départ depuis centre-ville et parkings relais', 30, yPos + 41);
    
    // Pied de page navette
    createPremiumFooter(doc, 'NS', 'navette');
}

// Créer un tableau avancé pour les fréquences
function createAdvancedFrequencyTable(doc, x, y, width, data, accentColor) {
    const rowHeight = 12;
    const headerHeight = 15;
    
    // En-tête avec style
    doc.setFillColor(...accentColor);
    doc.roundedRect(x, y, width, headerHeight, 5, 5, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text('PÉRIODE', x + 10, y + 10);
    doc.text('FRÉQUENCE', x + 100, y + 10);
    doc.text('STATUT', x + 140, y + 10);
    
    let currentY = y + headerHeight;
    
    // Lignes de données
    data.forEach((row, index) => {
        // Alternance couleurs
        if (index % 2 === 0) {
            doc.setFillColor(...TCM_COLORS.light);
            doc.rect(x, currentY, width, rowHeight, 'F');
        }
        
        // Bordures subtiles
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.rect(x, currentY, width, rowHeight);
        
        // Contenu
        doc.setTextColor(...TCM_COLORS.dark);
        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.font, "normal");
        doc.text(row[0], x + 10, currentY + 8);
        
        // Fréquence avec couleur
        if (row[1] !== '-') {
            doc.setTextColor(...TCM_COLORS.success);
            doc.text(`Toutes les ${row[1]}`, x + 100, currentY + 8);
            doc.setTextColor(...TCM_COLORS.success);
            doc.text('✓ Assuré', x + 140, currentY + 8);
        } else {
            doc.setTextColor(...TCM_COLORS.danger);
            doc.text('Non assuré', x + 100, currentY + 8);
            doc.text('✗ Supprimé', x + 140, currentY + 8);
        }
        
        currentY += rowHeight;
    });
}

// =======================================================================
// FONCTIONS UTILITAIRES ET INITIALISATION
// =======================================================================

// Fonction de création PDF simple (pour compatibilité)
function createSimplePDF(title, content) {
    if (typeof window.jspdf === 'undefined') {
        console.error('jsPDF non disponible');
        return;
    }
    
    showLoadingSpinner();
    
    setTimeout(() => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // En-tête simple avec style TCM
        doc.setFillColor(...TCM_COLORS.primary);
        doc.rect(0, 0, 210, 30, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text(title, 20, 20);
        
        // Contenu
        doc.setTextColor(...TCM_COLORS.dark);
        doc.setFontSize(12);
        doc.setFont(PDF_CONFIG.font, "normal");
        
        const lines = content.split('\n');
        let yPos = 50;
        
        lines.forEach((line, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 30;
            }
            doc.text(line, 20, yPos);
            yPos += 8;
        });
        
        // Pied de page simple
        createPremiumFooter(doc, '', 'document');
        
        doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
        hideLoadingSpinner();
        console.info(`✅ PDF simple "${title}" généré`);
    }, 1000);
}

// Fonction de nettoyage et optimisation UTF-8
function cleanTextForPDF(text) {
    if (!text) return '';
    
    return text
        .replace(/[^\x00-\x7F]/g, function(char) {
            // Remplacements spécifiques pour les caractères français
            const replacements = {
                'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
                'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
                'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
                'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
                'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
                'ç': 'c', 'ñ': 'n',
                '€': 'EUR', '£': 'GBP', '$': 'USD'
            };
            return replacements[char] || char;
        })
        .replace(/[\u2018\u2019]/g, "'")  // Guillemets simples
        .replace(/[\u201C\u201D]/g, '"') // Guillemets doubles
        .replace(/\u2026/g, '...')       // Points de suspension
        .replace(/[\u2013\u2014]/g, '-') // Tirets
        .replace(/\s+/g, ' ')           // Espaces multiples
        .trim();
}

// Gestionnaire d'erreurs PDF
function handlePDFError(error, context = 'Génération PDF') {
    console.error(`❌ Erreur ${context}:`, error);
    
    hideLoadingSpinner();
    
    // Interface utilisateur d'erreur
    if (!document.getElementById('tcm-pdf-error')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'tcm-pdf-error';
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #dc3545; 
                        color: white; padding: 1rem; border-radius: 8px; z-index: 10001;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 400px;">
                <strong>❌ Erreur PDF</strong><br>
                ${error.message || 'Erreur inconnue'}<br>
                <small>Vérifiez la console pour plus de détails</small>
                <button onclick="this.parentElement.remove()" 
                        style="float: right; background: none; border: none; color: white; 
                               font-size: 18px; cursor: pointer; margin-top: -5px;">×</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
        
        // Auto-suppression après 5 secondes
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

// Initialisation avancée du système PDF
document.addEventListener('DOMContentLoaded', () => {
    console.info('🎯 Système PDF TCM v2.0 initialisé');
    console.info('📋 Fonctions disponibles:');
    console.info('   - generatePDF() : Génération intelligente selon la ligne');
    console.info('   - createSimplePDF() : Génération PDF basique');
    console.info('   - generateAdvancedScolairePDF() : PDF scolaires avancés');
    console.info('   - generateAdvancedNocturnePDF() : PDF nocturnes avancés');
    console.info('   - generateAdvancedRegularPDF() : PDF lignes régulières');
    console.info('   - generateAdvancedNavettePDF() : PDF navette spéciale');
    
    // Détecter et connecter les boutons PDF
    const pdfButtons = document.querySelectorAll(
        '[data-action="generate-pdf"], .btn-pdf, #pdf-btn, .generate-pdf'
    );
    
    pdfButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const ligneId = button.dataset.ligne || button.dataset.ligneId;
            generatePDF(ligneId);
        });
    });
    
    if (pdfButtons.length > 0) {
        console.info(`✅ ${pdfButtons.length} bouton(s) PDF connecté(s)`);
    }
    
    // Vérifier la disponibilité de jsPDF
    if (typeof window.jspdf !== 'undefined') {
        console.info('✅ jsPDF disponible - Système PDF prêt');
    } else {
        console.warn('⚠️ jsPDF non détecté - Certaines fonctionnalités indisponibles');
    }
    
    // Ajouter un raccourci clavier pour les développeurs
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            console.info('🔧 Test génération PDF depuis raccourci');
            generatePDF();
        }
    });
    
    // Notifier la disponibilité du système
    window.tcmPDFSystem = {
        version: '2.0',
        ready: true,
        generate: generatePDF,
        createSimple: createSimplePDF,
        colors: TCM_COLORS,
        config: PDF_CONFIG
    };
    
    console.info('🚀 Système PDF TCM v2.0 opérationnel');
});

// =======================================================================
// FONCTIONS DE COMPATIBILITÉ (anciennes versions)
// =======================================================================

// Wrapper pour compatibilité avec anciens scripts
window.generateScolairePDF = generateAdvancedScolairePDF;
window.generateRegularLinePDF = generateAdvancedRegularPDF;
window.generateNocturnePDF = generateAdvancedNocturnePDF;
window.generateNavetteSpecialePDF = generateAdvancedNavettePDF;

// Export pour modules ES6 si nécessaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generatePDF,
        createSimplePDF,
        generateAdvancedScolairePDF,
        generateAdvancedNocturnePDF,
        generateAdvancedRegularPDF,
        generateAdvancedNavettePDF,
        TCM_COLORS,
        PDF_CONFIG
    };
}

console.info('📄 TCM PDF System v2.0 - Loaded Successfully');
console.info('🎨 Features: Modern Design, Image Integration, UTF-8 Optimized');
console.info('🚀 Ready for: Scolaire, Nocturne, Regular, Navette lines');