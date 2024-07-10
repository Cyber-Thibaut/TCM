const now = new Date();
const date = formatDate(now); // Convertir la date en chaîne "YYYY-MM-DD"


function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
const holidayDates = [
    "2024-07-24",
    "2024-07-27",
    "2024-07-31",
    "2024-08-03"
];
const estFerie = holidayDates.includes(date);



function updateBusTimes() {
    const alertMessage = document.getElementById("alertMessage");

    if (estFerie) {
        alertMessage.innerHTML = `
        <div role="alert" class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 shrink-0 stroke-current"><path stroke-linecap="round" stroke-linejoin="round"
      stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path> </svg>
            <span>La navette sera en service a partir de 17h jusqu'a 00h. Un bus toutes les 5 minutes en moyenne. Bon match a tous.</span>
        </div>
    `;
    } else {
        alertMessage.innerHTML = `
        <div role="alert" class="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Aucune épreuve n'est prévue ce jour au stade Marcel Michelin. La navette n'est pas en service.</span>
        </div>
    `;
    }
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
    document.getElementById('destination').innerHTML = `<h2 class="text-4xl text-primary-content dark:text-primary font-bold">Direction Stade Marchel Michelin ♿</h2><br>`;

}
setInterval(updateCurrentTime, 1000);
updateCurrentTime(); // Update initially