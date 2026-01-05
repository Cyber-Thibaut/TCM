// =======================================================================
// SYSTÈME AVANCÉ DE GÉNÉRATION PDF POUR TCM
// Design moderne, intégration de données dynamiques, encodage UTF-8
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
    regular: [33, 75, 254],       // Bleu régulier
    volcexpress: [220, 53, 69]    // Rouge Volc'Express
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

// --- FONCTIONS UTILITAIRES ---

function showLoadingSpinner() {
    let spinner = document.getElementById('tcm-pdf-spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'tcm-pdf-spinner';
        spinner.innerHTML = `
            <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.9);z-index:9999;display:flex;flex-direction:column;justify-content:center;align-items:center;">
                <div style="width:50px;height:50px;border:5px solid #f3f3f3;border-top:5px solid #204BFE;border-radius:50%;animation:spin 1s linear infinite;"></div>
                <p style="margin-top:20px;font-family:sans-serif;color:#204BFE;font-weight:bold;">Génération de la fiche horaire...</p>
            </div>
            <style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style>
        `;
        document.body.appendChild(spinner);
    }
    spinner.style.display = 'flex';
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('tcm-pdf-spinner');
    if (spinner) spinner.style.display = 'none';
}

async function loadImageAsBase64(imagePath) {
    const pathsToTry = [
        `../img/${imagePath.replace('img/', '')}`, // Priorité 1: Remonter d'un cran (src/ -> root/img/)
        imagePath,
        `../${imagePath}`,
        `/${imagePath}`,
        `src/${imagePath}`,
        `../../${imagePath}`
    ];

    for (const path of pathsToTry) {
        try {
            const result = await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = () => resolve(null);
                img.src = path;
            });
            if (result) return result;
        } catch (e) {
            continue;
        }
    }
    console.warn(`Image non trouvée après plusieurs tentatives: ${imagePath}`);
    return null;
}

// Extraction des données scolaires depuis le script JS
async function extractScolaireData(lineId) {
    try {
        const response = await fetch(`scripts/${lineId}.js`);
        if (!response.ok) return null;
        const text = await response.text();

        // Regex pour extraire les objets schedules
        // On cherche "const firstCarSchedules = {" jusqu'à la fermeture "};"
        const firstCarMatch = text.match(/const firstCarSchedules = ({[\s\S]*?});/);
        const secondCarMatch = text.match(/const secondCarSchedules = ({[\s\S]*?});/);

        if (firstCarMatch && secondCarMatch) {
            try {
                // Utilisation de new Function pour évaluer l'objet JS directement
                // C'est plus robuste que le parsing JSON via regex pour des objets JS avec commentaires/clés sans quotes
                const firstCar = new Function("return " + firstCarMatch[1])();
                const secondCar = new Function("return " + secondCarMatch[1])();
                return { firstCar, secondCar };
            } catch (e) {
                console.error("Erreur évaluation JS scolaire", e);
                return null;
            }
        }
        return null;
    } catch (error) {
        console.error("Erreur extraction scolaire", error);
        return null;
    }
}

// Chargement des données JSON
async function loadLineData(lineId) {
    try {
        console.log(`Chargement des données pour la ligne ${lineId}...`);
        const [ligneRes, freqRes, parkingsRes] = await Promise.all([
            fetch('ligne.json'),
            fetch('scripts/frequences_bus.json'),
            fetch('parkings.json')
        ]);

        if (!ligneRes.ok || !freqRes.ok) throw new Error('Erreur réseau lors du chargement des données');

        const ligneJson = await ligneRes.json();
        const freqJson = await freqRes.json();
        let parkingsJson = [];
        try {
            parkingsJson = await parkingsRes.json();
        } catch (e) {
            console.warn("Impossible de charger parkings.json");
        }

        // Comparaison souple (string vs number)
        const info = ligneJson.lignes.find(l => l.id == lineId);
        
        // Pour les scolaires, on ne trouve pas forcément dans frequences_bus.json
        const freq = freqJson.lignes.find(l => l.numero == lineId);
        
        let scolaireData = null;
        if (!freq && (lineId.toString().startsWith('6') || lineId.toString().startsWith('9'))) {
            scolaireData = await extractScolaireData(lineId);
        }

        if (!info) throw new Error(`Ligne ${lineId} introuvable dans ligne.json`);

        // Enrichir les infos parkings
        let parkingsDetails = [];
        if (info.parkings && Array.isArray(info.parkings)) {
            parkingsDetails = info.parkings.map(pid => parkingsJson.find(p => p.id === pid)).filter(Boolean);
        }

        return {
            info: info,
            frequences: freq ? freq.frequences : null,
            vacances: freq ? freq.vacances : null,
            scolaire: scolaireData,
            destination: freq ? freq.destination : info.nom,
            parkings: parkingsDetails
        };
    } catch (error) {
        console.error('Erreur chargement données:', error);
        alert("Impossible de charger les données de la ligne. Veuillez réessayer.");
        return null;
    }
}

// --- FONCTIONS GRAPHIQUES ---

function createGradientEffect(doc, x, y, width, height, color1, color2, steps = 10) {
    const stepHeight = height / steps;
    for (let i = 0; i < steps; i++) {
        const ratio = i / steps;
        const r = Math.round(color1[0] * (1 - ratio) + color2[0] * ratio);
        const g = Math.round(color1[1] * (1 - ratio) + color2[1] * ratio);
        const b = Math.round(color1[2] * (1 - ratio) + color2[2] * ratio);
        doc.setFillColor(r, g, b);
        doc.rect(x, y + (i * stepHeight), width, stepHeight + 0.5, 'F'); // +0.5 pour éviter les lignes blanches
    }
}

async function createModernHeader(doc, lineId, lineType, accentColor, title, subtitle, operation = null) {
    // Fond dégradé
    createGradientEffect(doc, 0, 0, 210, 60, accentColor, [accentColor[0]+40, accentColor[1]+40, accentColor[2]+40]);

    // Logo TCM (simulé ou chargé)
    const logoPath = 'img/TCM-Clair.png'; // Assurez-vous que ce chemin est correct
    const logoBase64 = await loadImageAsBase64(logoPath);
    if (logoBase64) {
        // Ratio original : 426x263 (~1.62)
        // On essaie de le faire rentrer dans une boite de 40x25 à la position 15,10
        const imgProps = doc.getImageProperties(logoBase64);
        const maxWidth = 40;
        const maxHeight = 25;
        const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
        const w = imgProps.width * ratio;
        const h = imgProps.height * ratio;
        
        // Centrage vertical dans la zone du header (qui fait 60 de haut, on vise le haut gauche)
        // On le place à x=15, et on centre y autour de 20 (milieu de la zone haute ?) ou juste padding 10
        doc.addImage(logoBase64, 'PNG', 15, 10, w, h); 
    } else {
        // Fallback texte
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text("TCM", 15, 30);
    }

    // Icône de ligne
    const iconPath = `img/${lineId}.png`;
    const iconBase64 = await loadImageAsBase64(iconPath);
    
    let titleX = 60;
    if (iconBase64) {
        // Gestion du ratio pour l'icône de ligne aussi
        const imgProps = doc.getImageProperties(iconBase64);
        const maxWidth = 35;
        const maxHeight = 35;
        const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
        const w = imgProps.width * ratio;
        const h = imgProps.height * ratio;
        
        // On la place à droite (x=160), centrée dans sa boite 35x35
        const x = 160 + (maxWidth - w) / 2;
        const y = 10 + (maxHeight - h) / 2;
        
        doc.addImage(iconBase64, 'PNG', x, y, w, h);
    } else {
        // Fallback cercle ligne
        doc.setFillColor(255, 255, 255);
        doc.circle(177, 27, 15, 'F');
        doc.setTextColor(...accentColor);
        doc.setFontSize(20);
        doc.text(String(lineId), 177, 35, { align: 'center' });
    }

    // Titre et Sous-titre
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(PDF_CONFIG.font, "bold");
    
    // Gestion des titres longs
    const splitTitle = doc.splitTextToSize(title, 100);
    doc.text(splitTitle, titleX, 25);

    if (subtitle) {
        doc.setFontSize(12);
        doc.setFont(PDF_CONFIG.font, "normal");
        doc.text(subtitle, titleX, 25 + (splitTitle.length * 10));
    }

    // Badge Type
    doc.setFillColor(255, 255, 255, 0.2);
    doc.roundedRect(15, 45, 40, 8, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(lineType.toUpperCase(), 35, 50, { align: 'center' });

    // Amplitude Horaire (si dispo)
    if (operation && operation.start && operation.end) {
        doc.setFillColor(255, 255, 255, 0.2);
        doc.roundedRect(60, 45, 50, 8, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        // Icône horloge unicode ou juste texte
        doc.text(`Circule de ${operation.start.replace(':', 'h')} à ${operation.end.replace(':', 'h')}`, 85, 50, { align: 'center' });
    }

    // Date génération
    doc.setFontSize(8);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 195, 58, { align: 'right' });
}

async function createTarifsSection(doc, x, y, width, accentColor, lineId) {
    const height = 35;
    
    // Fond
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(x, y, width, height, 3, 3, 'FD');
    
    // Titre
    doc.setFillColor(...accentColor);
    doc.roundedRect(x, y, width, 8, 3, 3, 'F');
    // Hack pour coins carrés en bas du header
    doc.rect(x, y+5, width, 3, 'F'); 
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text("INFOS TARIFS", x + (width/2), y + 5.5, { align: 'center' });

    // Contenu
    doc.setTextColor(...TCM_COLORS.dark);
    doc.setFontSize(9);
    doc.setFont(PDF_CONFIG.font, "normal");
    
    const col1X = x + 10;
    const col2X = x + (width/2) + 10;
    const row1Y = y + 18;
    const row2Y = y + 28;

    // Ticket 1h
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text("Ticket 1h", col1X, row1Y);
    doc.setFont(PDF_CONFIG.font, "normal");
    doc.text("1,70 €", col1X + 30, row1Y);

    // Ticket 24h
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text("Ticket 24h", col1X, row2Y);
    doc.setFont(PDF_CONFIG.font, "normal");
    doc.text("5,00 €", col1X + 30, row2Y);

    // Infos
    doc.setFontSize(8);
    doc.setTextColor(...TCM_COLORS.secondary);
    doc.text("SMS au 93000", col2X, row1Y);
    doc.text("Appli TCM", col2X, row2Y);
    
    doc.setFontSize(7);
    doc.text("Plus d'infos sur tcm-mobilite.fr", x + (width/2), y + 32, { align: 'center' });

    // QR Code Temps Réel (via API)
    try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://tcm-mobilite.fr/lignes/${lineId}`;
        const qrBase64 = await loadImageAsBase64(qrUrl);
        if (qrBase64) {
            // On le place à droite du bloc
            doc.addImage(qrBase64, 'PNG', x + width - 30, y + 10, 20, 20);
            doc.setFontSize(6);
            doc.text("Infos trafic Temps réel", x + width - 20, y + 32, { align: 'center' });
        }
    } catch (e) {
        console.warn("Impossible de générer le QR Code");
    }

    return y + height + 10;
}

function createModernTable(doc, x, y, width, headers, rows, accentColor) {
    const colWidth = width / headers.length;
    const rowHeight = 10;
    const headerHeight = 12;

    // Header
    doc.setFillColor(...accentColor);
    doc.roundedRect(x, y, width, headerHeight, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); // Réduit de 10 à 9 pour éviter le débordement
    doc.setFont(PDF_CONFIG.font, "bold");

    headers.forEach((header, i) => {
        doc.text(header, x + (i * colWidth) + (colWidth / 2), y + 8, { align: 'center' });
    });

    // Rows
    let currentY = y + headerHeight;
    doc.setFont(PDF_CONFIG.font, "normal");
    doc.setTextColor(...TCM_COLORS.dark);

    rows.forEach((row, i) => {
        if (i % 2 === 0) {
            doc.setFillColor(...TCM_COLORS.light);
            doc.rect(x, currentY, width, rowHeight, 'F');
        }
        
        row.forEach((cell, j) => {
            // Gestion basique du texte trop long
            let cellText = String(cell);
            if (doc.getTextWidth(cellText) > colWidth - 2) {
                doc.setFontSize(8); // Réduire encore si ça dépasse
            } else {
                doc.setFontSize(9);
            }
            doc.text(cellText, x + (j * colWidth) + (colWidth / 2), currentY + 7, { align: 'center' });
        });
        currentY += rowHeight;
    });

    // Bordure extérieure
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, width, currentY - y, 2, 2);

    return currentY;
}

function createStatsSection(doc, x, y, stats, accentColor) {
    const cardWidth = 50;
    const cardHeight = 25;
    const gap = 10;

    const items = [
        { label: "Arrêts", value: stats.nombre_arrets, icon: "🚏" },
        { label: "Temps", value: stats.temps_trajet, icon: "⏱️" },
        { label: "Distance", value: stats.longueur_ligne, icon: "📏" }
    ];

    items.forEach((item, i) => {
        const xPos = x + (i * (cardWidth + gap));
        
        // Card bg
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(230, 230, 230);
        doc.roundedRect(xPos, y, cardWidth, cardHeight, 3, 3, 'FD');

        // Border left accent
        doc.setFillColor(...accentColor);
        doc.rect(xPos, y, 2, cardHeight, 'F');

        // Value
        doc.setTextColor(...TCM_COLORS.dark);
        doc.setFontSize(12);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text(String(item.value), xPos + 25, y + 10, { align: 'center' });

        // Label
        doc.setTextColor(...TCM_COLORS.secondary);
        doc.setFontSize(8);
        doc.setFont(PDF_CONFIG.font, "normal");
        doc.text(item.label.toUpperCase(), xPos + 25, y + 18, { align: 'center' });
    });

    return y + cardHeight + 10;
}



// --- GÉNÉRATEURS SPÉCIFIQUES ---

async function generatePDF(lineId) {
    if (typeof window.jspdf === 'undefined') {
        alert("Erreur: La librairie jsPDF n'est pas chargée.");
        return;
    }

    showLoadingSpinner();

    try {
        const data = await loadLineData(lineId);
        if (!data) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Déterminer le type et la couleur
        let type = data.info.type || "Régulier";
        let color = TCM_COLORS.regular;
        
        if (type.toLowerCase().includes('scolaire')) color = TCM_COLORS.scolaire;
        else if (type.toLowerCase().includes('nocturne')) color = TCM_COLORS.nocturne;
        else if (type.toLowerCase().includes('navette') || lineId === 'NS') color = TCM_COLORS.navette;
        else if (type.toLowerCase().includes('volc')) color = TCM_COLORS.volcexpress;

        // --- PAGE 1 ---
        // On ne passe plus data.destination en sous-titre pour éviter "Campus Cezeaux" redondant
        await createModernHeader(doc, lineId, type, color, data.info.nom, "", data.info.operation);

        let yPos = 70;

        // Description
        doc.setFontSize(14);
        doc.setTextColor(...TCM_COLORS.dark);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text("PRÉSENTATION DE LA LIGNE", 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.font, "normal");
        
        // Adaptation dynamique du vocabulaire (Bus vs Tram)
        let description = data.info.description;
        if (data.info.mode === 'tram') {
            description = description.replace(/\bbus\b/gi, 'tram')
                                   .replace(/\bbuses\b/gi, 'trams')
                                   .replace(/monter à bord d'un tram/gi, "monter à bord d'une rame");
        }

        const descLines = doc.splitTextToSize(description, 170);
        doc.text(descLines, 20, yPos);
        yPos += (descLines.length * 5) + 5; // Réduit de +10 à +5

        // Stats
        if (data.info.stats) {
            yPos = createStatsSection(doc, 20, yPos, data.info.stats, color);
            yPos += 10;
        }

        // Parkings Relais
        if (data.parkings && data.parkings.length > 0) {
            doc.setFontSize(14);
            doc.setFont(PDF_CONFIG.font, "bold");
            doc.setTextColor(...color);
            doc.text("PARKINGS RELAIS", 20, yPos);
            yPos += 10;

            for (const parking of data.parkings) {
                doc.setFillColor(245, 245, 245);
                doc.roundedRect(20, yPos, 170, 25, 2, 2, 'F');
                
                let textX = 25;

                // Image du parking
                if (parking.image) {
                    const parkingImgBase64 = await loadImageAsBase64(parking.image);
                    if (parkingImgBase64) {
                        // Calcul du ratio pour ne pas déformer le logo
                        const imgProps = doc.getImageProperties(parkingImgBase64);
                        const maxWidth = 30;
                        const maxHeight = 21;
                        const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
                        const w = imgProps.width * ratio;
                        const h = imgProps.height * ratio;
                        
                        // Centrage dans la zone
                        const xImg = 22 + (maxWidth - w) / 2;
                        const yImg = yPos + 2 + (maxHeight - h) / 2;

                        doc.addImage(parkingImgBase64, 'PNG', xImg, yImg, w, h);
                        textX = 55; // Décaler le texte si image présente
                    }
                }
                
                doc.setFontSize(12);
                doc.setTextColor(...TCM_COLORS.dark);
                doc.setFont(PDF_CONFIG.font, "bold");
                doc.text(`P+R ${parking.name}`, textX, yPos + 8);
                
                doc.setFontSize(9);
                doc.setFont(PDF_CONFIG.font, "normal");
                doc.setTextColor(...TCM_COLORS.secondary);
                doc.text(`${parking.capacity} places • ${parking.surveilled ? 'Surveillé' : 'Non surveillé'}`, textX, yPos + 15);
                
                // Description si disponible
                if (parking.description) {
                     doc.setFontSize(8);
                     doc.setTextColor(100);
                     const desc = doc.splitTextToSize(parking.description, 170 - (textX - 20) - 5);
                     doc.text(desc, textX, yPos + 20);
                }
                
                yPos += 30;
            }
            yPos += 5;
        }


        let tarifsAdded = false;
        // Infos Tarifs (si place dispo sur Page 1)
        // On augmente un peu la tolérance (255mm max)
        // MODIF: On force sur la page 2 comme demandé, sauf si on veut vraiment remplir la page 1
        // L'utilisateur a dit "mets les tarifs en page 2 d'office"
        /*
        if (yPos < 255) {
            yPos = await createTarifsSection(doc, 20, yPos, 170, color, lineId);
            tarifsAdded = true;
        }
        */

        // --- PAGE 2 : HORAIRES & PLAN ---
        doc.addPage();
        await createModernHeader(doc, lineId, type, color, "HORAIRES & PLAN", "Détails de circulation", data.info.operation);
        yPos = 70;

        // On met les tarifs en haut de la page 2 ou après les fréquences ?
        // "mets les tarifs en page 2 d'office" -> On va les mettre en bas de page 2 ou avant le plan.
        // Le plan est souvent gros. Mettons les tarifs juste après le header de la page 2 pour qu'ils soient visibles ?
        // Ou alors tout en bas de la page 2 ?
        // Essayons juste après le header pour changer, ou gardons la logique "avant le plan".
        
        // Fréquences (Régulier)
        if (data.frequences) {
            // ... (code existant) ...
            doc.setFontSize(14);
            doc.setFont(PDF_CONFIG.font, "bold");
            doc.setTextColor(...color);
            doc.text("FRÉQUENCES DE PASSAGE", 20, yPos);
            yPos += 10;

            const headers = ["Période", "Heures Creuses", "Heures de Pointe", "Soirée"];
            const rows = [];

            // Mapping des clés JSON vers affichage
            if (data.frequences.creuse) rows.push(["Semaine (Scolaire)", data.frequences.creuse, data.frequences.pointe, data.frequences.soir || "-"]);
            if (data.frequences.samedi_creuse) rows.push(["Samedi", data.frequences.samedi_creuse, data.frequences.samedi_pointe, data.frequences.samedi_soir || "-"]);
            if (data.frequences.dimanche_creuse) rows.push(["Dimanche & Fériés", data.frequences.dimanche_creuse, data.frequences.dimanche_pointe, "-"]);

            if (data.vacances) {
                 if (data.vacances.creuse) rows.push(["Vacances (Semaine)", data.vacances.creuse, data.vacances.pointe, data.vacances.soir || "-"]);
                 // Séparation Samedi / Dimanche pour les vacances
                 if (data.vacances.samedi_creuse) rows.push(["Vacances (Samedi)", data.vacances.samedi_creuse, data.vacances.samedi_pointe, data.vacances.samedi_soir || "-"]);
                 if (data.vacances.dimanche_creuse) rows.push(["Vacances (Dimanche)", data.vacances.dimanche_creuse, data.vacances.dimanche_pointe, "-"]);
            }

            yPos = createModernTable(doc, 20, yPos, 170, headers, rows, color);
            yPos += 15;
        }

        // Horaires Scolaires (Spécifique)
        if (data.scolaire) {
            // ... (code existant) ...
            doc.setFontSize(14);
            doc.setFont(PDF_CONFIG.font, "bold");
            doc.setTextColor(...color);
            doc.text("HORAIRES SCOLAIRES", 20, yPos);
            yPos += 10;

            const headers = ["Service", "Matin (Aller)", "Soir (Retour)", "Mercredi (Retour)"];
            const rows = [];
            
            // 1er Car
            if (data.scolaire.firstCar) {
                const fc = data.scolaire.firstCar;
                rows.push([
                    "Car Principal", 
                    fc.default?.morning || "-", 
                    fc.default?.evening || "-", 
                    fc["3"]?.evening || "-"
                ]);
            }
            
            // 2nd Car
            if (data.scolaire.secondCar) {
                const sc = data.scolaire.secondCar;
                rows.push([
                    "Car Secondaire", 
                    sc.default?.morning || "-", 
                    sc.default?.evening || "-", 
                    sc["3"]?.evening || "-"
                ]);
            }

            yPos = createModernTable(doc, 20, yPos, 170, headers, rows, color);
            yPos += 15;
        }

        // Tarifs toujours sur Page 2 maintenant
        if (!tarifsAdded) {
             yPos = await createTarifsSection(doc, 20, yPos, 170, color, lineId);
             yPos += 10;
             tarifsAdded = true;
        }

        // Plan de ligne
        if (yPos > 240) { // Nouvelle page si vraiment pas assez de place (seuil augmenté)
            doc.addPage();
            await createModernHeader(doc, lineId, type, color, "PLAN DE LIGNE", "Itinéraire");
            yPos = 70;
        } else {
            doc.setFontSize(14);
            doc.setFont(PDF_CONFIG.font, "bold");
            doc.setTextColor(...color);
            doc.text("PLAN DE LIGNE", 20, yPos);
            yPos += 10;
        }
        
        // Essayer de charger le plan
        const planPath = `img/plans/L${lineId}.png`;
        const planBase64 = await loadImageAsBase64(planPath);
        
        if (planBase64) {
            // Centrer l'image
            const imgProps = doc.getImageProperties(planBase64);
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const maxWidth = pdfWidth - (margin * 2);
            const maxHeight = pdfHeight - yPos - 20; // Espace restant

            const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
            const w = imgProps.width * ratio;
            const h = imgProps.height * ratio;
            const x = (pdfWidth - w) / 2;
            
            doc.addImage(planBase64, 'PNG', x, yPos, w, h);
        } else {
            doc.setFontSize(12);
            doc.setTextColor(...TCM_COLORS.secondary);
            doc.text("Plan de ligne non disponible pour le moment.", 105, yPos + 20, { align: 'center' });
        }

        // Footer sur toutes les pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} / ${pageCount} - Transport Clermont Métropole - www.tcm-mobilite.fr`, 105, 290, { align: 'center' });
        }

        // Sauvegarde
        doc.save(`Fiche_Horaire_Ligne_${lineId}.pdf`);

    } catch (error) {
        console.error("Erreur génération PDF:", error);
        alert("Une erreur est survenue lors de la génération du PDF.");
    } finally {
        hideLoadingSpinner();
    }
}

// Exposer la fonction globalement
window.generatePDF = generatePDF;

// Compatibilité avec les anciens appels
window.generateScolairePDF = (id) => generatePDF(id);
window.generateRegularLinePDF = (id) => generatePDF(id);
window.generateNocturnePDF = (id) => generatePDF(id);
window.generateNavetteSpecialePDF = () => generatePDF('NS');

console.info('✅ TCM PDF System v3.0 - Loaded & Ready');
