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

function cleanHTMLText(html) {
    if (!html) return "";
    return html
        .replace(/<br\s*[\/]?>/gi, "\n") // Sauts de ligne simples
        .replace(/<\/p>/gi, "\n\n")      // Paragraphes
        .replace(/<ul[^>]*>/gi, "\n")    // Début de liste
        .replace(/<\/ul>/gi, "\n")       // Fin de liste
        .replace(/<li[^>]*>/gi, "• ")    // Puces
        .replace(/<\/li>/gi, "\n")       // Fin de puce
        .replace(/<[^>]+>/g, "")         // Retire TOUTES les autres balises
        .replace(/&nbsp;/g, " ")         // Espaces insécables
        .replace(/\n\s*\n\s*\n/g, "\n\n")// Évite les sauts de ligne excessifs
        .trim();
}

async function loadImageAsBase64(imagePath, maxDim = 0) {
    const pathsToTry = [
        imagePath,
        `../${imagePath}`,
        imagePath.replace('../', ''),
        `/${imagePath}`,
        `../img/${imagePath.replace('../img/', '').replace('img/', '')}`,
        `img/${imagePath.replace('../img/', '').replace('img/', '')}`
    ];

    for (const path of pathsToTry) {
        try {
            const result = await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (maxDim > 0 && (width > maxDim || height > maxDim)) {
                        if (width > height) {
                            height = (height * maxDim) / width;
                            width = maxDim;
                        } else {
                            width = (width * maxDim) / height;
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
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

async function extractScolaireData(lineId) {
    try {
        const response = await fetch(`scripts/${lineId}.js`);
        if (!response.ok) return null;
        const text = await response.text();

        const firstCarMatch = text.match(/const firstCarSchedules = ({[\s\S]*?});/);
        const secondCarMatch = text.match(/const secondCarSchedules = ({[\s\S]*?});/);

        if (firstCarMatch && secondCarMatch) {
            try {
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

        const info = ligneJson.lignes.find(l => l.id == lineId);
        const freq = freqJson.lignes.find(l => l.numero == lineId);
        
        let scolaireData = null;
        if (!freq && (lineId.toString().startsWith('6') || lineId.toString().startsWith('9'))) {
            scolaireData = await extractScolaireData(lineId);
        }

        if (!info) throw new Error(`Ligne ${lineId} introuvable dans ligne.json`);

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

async function createModernHeader(doc, lineId, lineType, accentColor, title, subtitle, operation = null) {
    // Fond principal uni
    doc.setFillColor(...accentColor);
    doc.rect(0, 0, 210, 45, 'F'); 
    
    // Bande d'accentuation sombre
    doc.setFillColor(33, 33, 33);
    doc.rect(0, 45, 210, 6, 'F');

    // Logo TCM
    const logoPath = 'img/TCM-Clair.png'; 
    const logoBase64 = await loadImageAsBase64(logoPath);
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 15, 8, 30, 18); 
    } else {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text("TCM", 15, 20);
    }

    // Badge "Type de ligne"
    doc.setFillColor(255, 255, 255, 0.2);
    doc.roundedRect(15, 30, 40, 7, 1.5, 1.5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(lineType.toUpperCase(), 35, 35, { align: 'center' });

    // Amplitude Horaire
    if (operation && operation.start && operation.end) {
        doc.setFillColor(255, 255, 255, 0.2);
        doc.roundedRect(60, 30, 50, 7, 1.5, 1.5, 'F');
        doc.text(`Circule de ${operation.start.replace(':', 'h')} à ${operation.end.replace(':', 'h')}`, 85, 35, { align: 'center' });
    }

    // Icône de ligne à droite
    const iconPath = `img/${lineId}.png`;
    const iconBase64 = await loadImageAsBase64(iconPath);
    if (iconBase64) {
        doc.addImage(iconBase64, 'PNG', 165, 5, 30, 30);
    } else {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(165, 5, 30, 30, 3, 3, 'F');
        doc.setTextColor(...accentColor);
        doc.setFontSize(22);
        doc.text(String(lineId), 180, 24, { align: 'center' });
    }

    // Titre et Sous-titre
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(PDF_CONFIG.font, "bold");
    
    const splitTitle = doc.splitTextToSize(title, 100);
    doc.text(splitTitle, 60, 18);

    if (subtitle) {
        doc.setFontSize(11);
        doc.setFont(PDF_CONFIG.font, "normal");
        doc.text(subtitle, 60, 18 + (splitTitle.length * 8));
    }

    // Date de génération
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 195, 49, { align: 'right' });
}

async function createTarifsSection(doc, x, y, width, accentColor, lineId) {
    const height = 35;
    
    // Cadre principal épuré
    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, height, 2, 2, 'FD');
    
    // Bande d'accentuation à gauche
    doc.setFillColor(...accentColor);
    doc.roundedRect(x, y, 3, height, 2, 2, 'F');
    doc.rect(x + 1.5, y, 1.5, height, 'F'); 
    
    // Titre
    doc.setTextColor(...accentColor);
    doc.setFontSize(11);
    doc.setFont(PDF_CONFIG.font, "bold");
    doc.text("INFOS TARIFS", x + 10, y + 8);

    // Contenu
    doc.setTextColor(...TCM_COLORS.dark);
    doc.setFontSize(9);
    doc.setFont(PDF_CONFIG.font, "normal");
    
    const col1X = x + 10;
    const col2X = x + (width/2) - 10;
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
    
    // QR Code Temps Réel
    try {
        let targetUrl = `https://tcm-mobilite.vercel.app/src/ligne.html#${lineId}`;
        if (String(lineId).startsWith('BEN') || String(lineId).startsWith('PL')) {
            targetUrl = `https://tcm-mobilite.vercel.app/src/nocturne.html#${lineId}`;
        }

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(targetUrl)}`;
        const qrBase64 = await loadImageAsBase64(qrUrl);
        if (qrBase64) {
            doc.addImage(qrBase64, 'PNG', x + width - 35, y + 5, 25, 25);
            doc.setFontSize(6);
            doc.text("Temps réel", x + width - 22.5, y + 33, { align: 'center' });
        }
    } catch (e) {
        console.warn("Impossible de générer le QR Code");
    }

    return y + height + 10;
}

function createModernTable(doc, x, y, width, headers, rows, accentColor) {
    const colWidth = width / headers.length;
    const rowHeight = 9;
    const headerHeight = 11;

    // En-tête
    doc.setFillColor(...accentColor);
    doc.roundedRect(x, y, width, headerHeight, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(PDF_CONFIG.font, "bold");

    headers.forEach((header, i) => {
        doc.text(header, x + (i * colWidth) + (colWidth / 2), y + 7.5, { align: 'center' });
    });

    // Lignes
    let currentY = y + headerHeight;
    doc.setFont(PDF_CONFIG.font, "normal");
    
    rows.forEach((row, i) => {
        // Fond zébré très léger
        if (i % 2 === 0) {
            doc.setFillColor(252, 252, 252);
            doc.rect(x, currentY, width, rowHeight, 'F');
        }
        
        // Ligne séparatrice
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.2);
        doc.line(x, currentY + rowHeight, x + width, currentY + rowHeight);

        doc.setTextColor(...TCM_COLORS.dark);
        row.forEach((cell, j) => {
            let cellText = String(cell);
            doc.setFontSize(cellText.length > 15 ? 8 : 9);
            doc.text(cellText, x + (j * colWidth) + (colWidth / 2), currentY + 6, { align: 'center' });
        });
        currentY += rowHeight;
    });

    // Bordure extérieure
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, currentY - y, 1.5, 1.5, 'S');

    return currentY;
}

function createStatsSection(doc, x, y, stats, accentColor) {
    const totalWidth = 170;
    const cardWidth = 52;
    const gap = (totalWidth - (cardWidth * 3)) / 2; 
    const cardHeight = 22;

    const items = [
        { label: "Arrêts", value: stats.nombre_arrets || "?", icon: "📍" },
        { label: "Temps", value: stats.temps_trajet || "?", icon: "⏱️" },
        { label: "Distance", value: stats.longueur_ligne || "?", icon: "📏" }
    ];

    items.forEach((item, i) => {
        const xPos = x + (i * (cardWidth + gap));
        
        // Fond
        doc.setFillColor(248, 249, 250);
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.roundedRect(xPos, y, cardWidth, cardHeight, 2, 2, 'FD');

        // Ligne d'accentuation
        doc.setFillColor(...accentColor);
        doc.roundedRect(xPos, y, 2.5, cardHeight, 2, 2, 'F');
        doc.rect(xPos + 1.25, y, 1.25, cardHeight, 'F');

        // Valeur
        doc.setTextColor(...TCM_COLORS.dark);
        doc.setFontSize(14);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text(`${item.value}`, xPos + (cardWidth / 2), y + 10, { align: 'center' });

        // Label
        doc.setTextColor(...TCM_COLORS.secondary);
        doc.setFontSize(8);
        doc.setFont(PDF_CONFIG.font, "normal");
        doc.text(item.label.toUpperCase(), xPos + (cardWidth / 2), y + 17, { align: 'center' });
    });

    return y + cardHeight + 10;
}

// --- GÉNÉRATEURS SPÉCIFIQUES ---

async function generatePDF(lineId) {
    lineId = String(lineId);

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
        await createModernHeader(doc, lineId, type, color, data.info.nom, "", data.info.operation);

        let yPos = 65;

        // Description
        doc.setFontSize(14);
        doc.setTextColor(...TCM_COLORS.dark);
        doc.setFont(PDF_CONFIG.font, "bold");
        doc.text("PRÉSENTATION DE LA LIGNE", 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.font, "normal");
        
        let description = data.info.description || "";
        description = cleanHTMLText(description);

        if (data.info.mode === 'tram') {
            description = description.replace(/\bbus\b/gi, 'tram')
                                   .replace(/\bbuses\b/gi, 'trams')
                                   .replace(/monter à bord d'un tram/gi, "monter à bord d'une rame");
        }

        const descLines = doc.splitTextToSize(description, 170);
        doc.text(descLines, 20, yPos);
        yPos += (descLines.length * 5) + 8; 

        // Stats
        if (data.info.stats) {
            yPos = createStatsSection(doc, 20, yPos, data.info.stats, color);
            yPos += 5;
        }

        // Parkings Relais
        if (data.parkings && data.parkings.length > 0) {
            doc.setFontSize(14);
            doc.setFont(PDF_CONFIG.font, "bold");
            doc.setTextColor(...color);
            doc.text("PARKINGS RELAIS", 20, yPos);
            yPos += 8;

            for (const parking of data.parkings) {
                doc.setFillColor(252, 252, 252);
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.3);
                doc.roundedRect(20, yPos, 170, 22, 2, 2, 'FD');
                
                let textX = 25;

                if (parking.image) {
                    const parkingImgBase64 = await loadImageAsBase64(parking.image);
                    if (parkingImgBase64) {
                        const imgProps = doc.getImageProperties(parkingImgBase64);
                        const maxWidth = 25;
                        const maxHeight = 18;
                        const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
                        const w = imgProps.width * ratio;
                        const h = imgProps.height * ratio;
                        
                        const xImg = 22 + (maxWidth - w) / 2;
                        const yImg = yPos + 2 + (maxHeight - h) / 2;

                        doc.addImage(parkingImgBase64, 'PNG', xImg, yImg, w, h);
                        textX = 52; 
                    }
                }
                
                doc.setFontSize(11);
                doc.setTextColor(...TCM_COLORS.dark);
                doc.setFont(PDF_CONFIG.font, "bold");
                doc.text(`P+R ${parking.name}`, textX, yPos + 8);
                
                doc.setFontSize(9);
                doc.setFont(PDF_CONFIG.font, "normal");
                doc.setTextColor(...TCM_COLORS.secondary);
                doc.text(`${parking.capacity} places • ${parking.surveilled ? 'Surveillé' : 'Non surveillé'}`, textX, yPos + 15);
                
                yPos += 26;
            }
            yPos += 5;
        }

        // --- PAGE 2 : HORAIRES & PLAN ---
        doc.addPage();
        await createModernHeader(doc, lineId, type, color, "HORAIRES & PLAN", "Détails de circulation", data.info.operation);
        yPos = 65;
        
        let frequencesData = data.frequences;

        if (!frequencesData && data.info.circulation && data.info.circulation.frequency) {
            const freq = data.info.circulation.frequency;
            frequencesData = {
                creuse: (freq.weekday || "-") + " min",
                pointe: (freq.weekday || "-") + " min", 
                soir: (freq.weekday || "-") + " min",
                samedi_creuse: (freq.saturday || "-") + " min",
                samedi_pointe: (freq.saturday || "-") + " min",
                samedi_soir: (freq.saturday || "-") + " min",
                dimanche_creuse: (freq.sunday_holiday || "-") + " min",
                dimanche_pointe: (freq.sunday_holiday || "-") + " min"
            };
        }

        if (frequencesData) {
            doc.setFontSize(14);
            doc.setFont(PDF_CONFIG.font, "bold");
            doc.setTextColor(...color);
            doc.text("FRÉQUENCES DE PASSAGE", 20, yPos);
            yPos += 8;

            const headers = ["Période", "Heures Creuses", "Heures de Pointe", "Soirée"];
            const rows = [];

            if (frequencesData.creuse) rows.push(["Semaine", frequencesData.creuse, frequencesData.pointe, frequencesData.soir || "-"]);
            if (frequencesData.samedi_creuse) rows.push(["Samedi", frequencesData.samedi_creuse, frequencesData.samedi_pointe, frequencesData.samedi_soir || "-"]);
            if (frequencesData.dimanche_creuse) rows.push(["Dimanche & Fériés", frequencesData.dimanche_creuse, frequencesData.dimanche_pointe, "-"]);

            if (data.vacances) {
                 if (data.vacances.creuse) rows.push(["Vacances (Semaine)", data.vacances.creuse, data.vacances.pointe, data.vacances.soir || "-"]);
                 if (data.vacances.samedi_creuse) rows.push(["Vacances (Samedi)", data.vacances.samedi_creuse, data.vacances.samedi_pointe, data.vacances.samedi_soir || "-"]);
                 if (data.vacances.dimanche_creuse) rows.push(["Vacances (Dimanche)", data.vacances.dimanche_creuse, data.vacances.dimanche_pointe, "-"]);
            }

            yPos = createModernTable(doc, 20, yPos, 170, headers, rows, color);
            yPos += 12;
        }

        if (data.scolaire) {
            doc.setFontSize(14);
            doc.setFont(PDF_CONFIG.font, "bold");
            doc.setTextColor(...color);
            doc.text("HORAIRES SCOLAIRES", 20, yPos);
            yPos += 8;

            const headers = ["Service", "Matin (Aller)", "Soir (Retour)", "Mercredi (Retour)"];
            const rows = [];
            
            if (data.scolaire.firstCar) {
                const fc = data.scolaire.firstCar;
                rows.push([
                    "Car Principal", 
                    fc.default?.morning || "-", 
                    fc.default?.evening || "-", 
                    fc["3"]?.evening || "-"
                ]);
            }
            
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
            yPos += 12;
        }

        // Tarifs sur Page 2
        yPos = await createTarifsSection(doc, 20, yPos, 170, color, lineId);
        yPos += 8;

        // Plan de ligne
        if (yPos > 230) { 
            doc.addPage();
            await createModernHeader(doc, lineId, type, color, "PLAN DE LIGNE", "Itinéraire");
            yPos = 65;
        } else {
            doc.setFontSize(14);
            doc.setFont(PDF_CONFIG.font, "bold");
            doc.setTextColor(...color);
            doc.text("PLAN DE LIGNE", 20, yPos);
            yPos += 8;
        }
        
        let planPath = `img/plans/L${lineId}.png`;
        if (lineId.startsWith('BEN') || lineId.startsWith('PL')) {
            planPath = `img/plans/${lineId}.png`;
        }
        
        const planBase64 = await loadImageAsBase64(planPath);
        
        if (planBase64) {
            const imgProps = doc.getImageProperties(planBase64);
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const maxWidth = pdfWidth - (margin * 2);
            const maxHeight = pdfHeight - yPos - 20;

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
            doc.text(`Page ${i} / ${pageCount} - Transport Clermont Métropole - https://tcm-mobilite.vercel.app/`, 105, 290, { align: 'center' });
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

// --- GÉNÉRATEUR SPÉCIAL CARAMEL ARENA ---
async function generateArenaGlobalPDF() {
    showLoadingSpinner();
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();

        const response = await fetch('ligne.json');
        const data = await response.json();
        const navettes = data.lignes.filter(l => String(l.id).startsWith('NAV'));

        const logoArena = await loadImageAsBase64('img/Caramel Arena.png');
        const logoTCM = await loadImageAsBase64('img/TCM.png');

        // --- PAGE DE COUVERTURE ---
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, width, height, 'F');

        // Design "Zenith"
        doc.setFillColor(255, 193, 7);
        doc.triangle(0, 0, width * 0.6, 0, 0, height * 0.4, 'F');
        doc.setFillColor(33, 33, 33);
        doc.triangle(width, height, width, height * 0.5, width * 0.4, height, 'F');
        doc.setFillColor(0, 121, 65);
        doc.triangle(width * 0.7, 0, width * 0.8, 0, width, height * 0.2, 'F');

        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(2);
        doc.circle(width * 0.1, height * 0.1, 15, 'S');
        doc.circle(width * 0.9, height * 0.9, 25, 'S');

        if (logoArena) {
            const imgProps = doc.getImageProperties(logoArena);
            const imgWidth = 100;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            doc.setFillColor(255, 255, 255);
            doc.roundedRect((width - imgWidth) / 2 - 10, 50 - 5, imgWidth + 20, imgHeight + 10, 5, 5, 'F');
            doc.addImage(logoArena, 'PNG', (width - imgWidth) / 2, 50, imgWidth, imgHeight);
        }

        doc.setTextColor(33, 33, 33);
        doc.setFontSize(32);
        doc.setFont("helvetica", "bold");
        doc.text("GUIDE DES NAVETTES", width / 2, 120, { align: "center" });
        
        doc.setTextColor(0, 121, 65);
        doc.setFontSize(18);
        doc.text("DISPOSITIF ÉVÉNEMENTIEL", width / 2, 135, { align: "center" });

        let yPos = 160;
        doc.setFontSize(12);
        navettes.forEach(nav => {
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(35, yPos - 7, width - 70, 12, 2, 2, 'F');

            doc.setFillColor(0, 121, 65);
            doc.roundedRect(40, yPos - 5, 18, 8, 2, 2, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text(nav.id, 49, yPos, { align: "center" });
            
            doc.setTextColor(50, 50, 50);
            doc.setFont("helvetica", "normal");
            doc.text(nav.nom, 65, yPos);
            
            yPos += 16;
        });

        if (logoTCM) {
            doc.addImage(logoTCM, 'PNG', (width - 30) / 2, height - 30, 30, 30);
        }

        // --- PAGES NAVETTES ---
        for (const nav of navettes) {
            doc.addPage();
            
            doc.setFillColor(255, 193, 7);
            doc.triangle(width, height, width, height - 70, width - 70, height, 'F');
            doc.setFillColor(249, 249, 249); 
            doc.triangle(0, 120, 0, height - 40, width * 0.5, height / 2, 'F');
            doc.setFillColor(0, 121, 65); 
            doc.circle(10, 35, 3, 'F');
            doc.circle(width - 10, height - 10, 5, 'F');

            doc.setFillColor(0, 121, 65);
            doc.rect(0, 0, width, 30, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont("helvetica", "bold");
            doc.text(nav.id, 15, 20);
            
            doc.setFontSize(14);
            doc.text(nav.nom, 50, 20);

            if (logoArena) {
                const imgProps = doc.getImageProperties(logoArena);
                const maxWidth = 35;
                const maxHeight = 24;
                const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
                const w = imgProps.width * ratio;
                const h = imgProps.height * ratio;
                const x = width - 10 - maxWidth + (maxWidth - w)/2;
                const y = 3 + (maxHeight - h)/2;
                doc.addImage(logoArena, 'PNG', x, y, w, h);
            }

            doc.setFillColor(240, 240, 240);
            doc.rect(0, 30, width, 25, 'F');
            doc.setFillColor(255, 193, 7);
            doc.rect(0, 30, width, 2, 'F');

            doc.setTextColor(50, 50, 50);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            
            const stats = nav.stats || {};
            const infoText = `Véhicule : ${stats.vehicule || 'Bus'}     |     Temps : ${stats.temps_trajet}     |     Distance : ${stats.longueur_ligne || '?'}     |     Arrêts : ${stats.nombre_arrets}`;
            doc.text(infoText, width / 2, 45, { align: "center" });

            let planBottomY = 70;
            try {
                let planImg = await loadImageAsBase64(`img/plans/${nav.id}.png`, 1500);
                if (!planImg) {
                    planImg = await loadImageAsBase64(`img/plans/LNS.png`, 1500);
                }
                
                if (planImg) {
                    const imgProps = doc.getImageProperties(planImg);
                    const maxWidth = width - 20;
                    const maxHeight = 100;
                    let pWidth = maxWidth;
                    let pHeight = (imgProps.height * pWidth) / imgProps.width;
                    
                    if (pHeight > maxHeight) {
                        pHeight = maxHeight;
                        pWidth = (imgProps.width * pHeight) / imgProps.height;
                    }
                    
                    doc.setFillColor(235, 235, 235);
                    doc.roundedRect((width - pWidth) / 2 + 2, 72, pWidth, pHeight, 2, 2, 'F');
                    doc.addImage(planImg, 'PNG', (width - pWidth) / 2, 70, pWidth, pHeight);
                    
                    planBottomY = 70 + pHeight;
                } else {
                    doc.setTextColor(150, 150, 150);
                    doc.text("Plan non disponible", width / 2, 100, { align: "center" });
                    planBottomY = 110;
                }
            } catch (e) {
                console.warn("Erreur image plan", e);
                planBottomY = 110;
            }

            let descY = planBottomY + 15;
            
            doc.setFillColor(0, 121, 65);
            doc.rect(20, descY, 5, 15, 'F');
            
            doc.setTextColor(33, 33, 33);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Description du service", 30, descY + 5);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            const cleanDescription = cleanHTMLText(nav.description || "Pas de description."); 
            const splitDesc = doc.splitTextToSize(cleanDescription, width - 60);
            doc.text(splitDesc, 30, descY + 12);

            const lineHeight = 5;
            const textHeight = splitDesc.length * lineHeight;
            const heightIncrement = 12 + textHeight + 5;
            descY += Math.max(25, heightIncrement);

            let freqAvant = "Toutes les 10 à 15 minutes";
            let freqApres = "Retours en continu (1h)";
            let capa = "150 voyageurs";

            if (nav.id === 'NAV1') {
                freqAvant = "Toutes les 4 à 6 minutes";
                freqApres = "Trafic intense - Départ immédiat";
                capa = "300 voyageurs (Tramway)";
            } else if (nav.id === 'NAV6') {
                freqAvant = "Départ fixe : H-2 et H-1";
                freqApres = "Départ unique 30min après fin";
                capa = "55 voyageurs (Autocar)";
            } else {
                freqAvant = "Toutes les 10 à 15 minutes";
                capa = "156 voyageurs (Bus)";
            }

            const boxWidth = (width - 50) / 2;
            const boxHeight = 50;
            
            doc.setFillColor(0, 121, 65);
            doc.roundedRect(20, descY, boxWidth, 10, 2, 2, 'F');
            doc.rect(20, descY + 5, boxWidth, 5, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("HORAIRES & FRÉQUENCES", 20 + (boxWidth/2), descY + 7, { align: 'center' });

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(0, 121, 65);
            doc.setLineWidth(0.5);
            doc.roundedRect(20, descY + 10, boxWidth, boxHeight - 10, 2, 2, 'S');
            
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("• Avant l'événement :", 25, descY + 20);
            doc.setFont("helvetica", "normal");
            doc.text(`   ${freqAvant}`, 25, descY + 25);
            doc.text("   Départ : H-2 avant le show", 25, descY + 30);
            
            doc.setFont("helvetica", "bold");
            doc.text("• Après l'événement :", 25, descY + 40);
            doc.setFont("helvetica", "normal");
            doc.text(`   ${freqApres}`, 25, descY + 45);

            const xRight = 20 + boxWidth + 10;
            
            doc.setFillColor(33, 33, 33);
            doc.roundedRect(xRight, descY, boxWidth, 10, 2, 2, 'F');
            doc.rect(xRight, descY + 5, boxWidth, 5, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("INFOS PRATIQUES", xRight + (boxWidth/2), descY + 7, { align: 'center' });

            doc.setDrawColor(33, 33, 33);
            doc.roundedRect(xRight, descY + 10, boxWidth, boxHeight - 10, 2, 2, 'S');
            
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`• Capacité : ${capa}`, xRight + 5, descY + 20);
            doc.text("• Accessibilité : 100% PMR", xRight + 5, descY + 27);
            doc.text("• Climatisation / Chauffage", xRight + 5, descY + 34);
            doc.text("• Connexion Wi-Fi à bord", xRight + 5, descY + 41);
            
            doc.setFillColor(255, 193, 7);
            doc.roundedRect(xRight + 15, descY + 45, boxWidth - 30, 6, 3, 3, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("INCLUS DANS LE BILLET", xRight + (boxWidth/2), descY + 49, {align: "center"});

            descY += boxHeight + 15;

            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(1);
            doc.setLineDash([2, 2], 0);
            doc.line(20, descY, width - 20, descY);
            doc.setLineDash([]); 
            
            doc.setTextColor(0, 121, 65);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("CORRESPONDANCES AUX TERMINUS", 20, descY + 8);
            
            doc.setTextColor(50, 50, 50);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            
            let correspText = "Réseau urbain • Parking Relais Arena";
            if (nav.id === 'NAV1') {
                correspText = "Tram A • Bus 12 • Correspondance NAV3 (Hôtel de Police)";
            } else if (nav.id === 'NAV2') {
                correspText = "Métro B • Bus C4 • Parking P2";
            } else if (nav.id === 'NAV3') {
                correspText = "Tram C • Gare SNCF • Parking P3";
            } else if (nav.id === 'NAV4') {
                 correspText = "Bus 9 • Parking P4";
            } else if (nav.id === 'NAV5') {
                 correspText = "Tram B • Bus 16 • Parking P5";
            }

            doc.text(correspText, 20, descY + 16);
            
            doc.setFillColor(255, 255, 255, 0.8);
            doc.roundedRect((width/2) - 80, height - 12, 160, 8, 2, 2, 'F'); 
             
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            doc.text("Caramel Arena - Dispositif de transport événementiel - TCM", width / 2, height - 8, { align: "center" });
        }

        doc.save('Guide_Caramel_Arena.pdf');

    } catch (error) {
        console.error("Erreur génération PDF Arena:", error);
        alert("Une erreur est survenue lors de la génération du guide.");
    } finally {
        hideLoadingSpinner();
    }
}
window.generateArenaGlobalPDF = generateArenaGlobalPDF;

console.info('✅ TCM PDF System v3.1 - Clean UI Loaded & Ready');