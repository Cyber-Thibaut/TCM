// Fonction pour gérer la visibilité du menu déroulant
function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    if (dropdown.style.display === "block") {
        dropdown.style.display = "none";
    } else {
        dropdown.style.display = "block";
    }
}

// Ajoutez un gestionnaire d'événements à chaque lien du menu
document.getElementById("menu-network").addEventListener("click", () => {
    toggleDropdown("menu-network-dropdown");
});

document.getElementById("menu-traffic").addEventListener("click", () => {
    toggleDropdown("menu-traffic-dropdown");
});

document.getElementById("menu-pricing").addEventListener("click", () => {
    toggleDropdown("menu-pricing-dropdown");
});

document.getElementById("menu-network-lg").addEventListener("click", () => {
    toggleDropdown("menu-network-dropdown");
});

document.getElementById("menu-traffic-lg").addEventListener("click", () => {
    toggleDropdown("menu-traffic-dropdown");
});

document.getElementById("menu-pricing-lg").addEventListener("click", () => {
    toggleDropdown("menu-pricing
