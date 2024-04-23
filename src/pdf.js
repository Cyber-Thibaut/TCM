// Importer la bibliothèque jsPDF
import jsPDF from 'jspdf';
// Fonction pour générer le PDF des fiches horaires
function generatePDF() {
    // Charger les données à partir du fichier JSON
    fetch('data.json')
    .then(response => response.json())
    .then(data => {
        // Générer le PDF avec les données récupérées
        generateSchedulePDF(data);
    })
    .catch(error => console.error('Erreur lors du chargement des données :', error));
}

// Fonction pour générer le PDF des fiches horaires
function generateSchedulePDF(data) {
    // Créer un nouveau document PDF
    const doc = new jsPDF();

    // Itérer à travers chaque ligne de bus
    data.lignes.forEach((ligne, index) => {
        // Ajouter un titre pour la fiche horaire de la ligne
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 255);
        doc.text(`Fiche Horaire - ${ligne.numéro}`, 10, 10);
        doc.setTextColor(0);

        // Ajouter les informations de la ligne
        doc.setFontSize(12);
        doc.text(`Destinations: ${ligne.destinations.join(', ')}`, 10, 20);
        doc.text(`Description: ${ligne.description}`, 10, 30);
        doc.text(`Nombre d'arrêts: ${ligne.stats.nb_arrets}`, 10, 40);
        doc.text(`Distance: ${ligne.stats.distance}`, 10, 50);
        doc.text(`Durée du parcours: ${ligne.stats.duree_parcours}`, 10, 60);

        // Ajouter les horaires pour chaque type de journée
        let startY = 70;
        Object.keys(ligne.horaires).forEach((typeJour, index) => {
            doc.setFontSize(14);
            doc.setTextColor(255, 0, 0);
            doc.text(typeJour.toUpperCase(), 10, startY + index * 15);
            doc.setTextColor(0);

            doc.setFontSize(12);
            const horaires = ligne.horaires[typeJour].fréquences.map(horaire => `${horaire.heure}: ${horaire.fréquence} min`).join(', ');
            doc.text(horaires, 10, startY + 10 + index * 15);
        });

        // Ajouter une nouvelle page pour la prochaine ligne (si ce n'est pas la dernière)
        if (index < data.lignes.length - 1) {
            doc.addPage();
        }
    });

    // Enregistrer le document PDF
    doc.save('fiches_horaires.pdf');
}
