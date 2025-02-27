function updateBusTimes() {
  const url = "https://raw.githubusercontent.com/Cyber-Thibaut/infotrafic/main/info.json";
  $.getJSON(url, function (data) {
    const ligne = data.lignes.find((l) => l.ligne === "NS");
    const alertMessage = $("#alertMessage");
    alertMessage.empty(); // Clear previous content

    if (ligne) {
      const cardHeader = $("<div>").addClass("mb-2");
      const logoLigne = $("<img>")
        .attr("src", "/img/NS.png")
        .addClass("w-15 h-12");

      cardHeader.append(logoLigne);
      alertMessage.append(cardHeader);

      if (ligne.infos_trafic.length === 0) {
        alertMessage.append(
          $("<p>").text("Aucun évènement prévu au Zénith prochainement.")
        );
      } else {
        const currentDate = new Date();
        let hasUpcomingEvent = false;
        let hasOngoingEvent = false;

        ligne.infos_trafic.forEach((info) => {
          const dateDebut = new Date(info.annonce);
          const dateDd = new Date(info.debut);
          const dateFin = new Date(info.fin);
          const dateFinAffichee = new Date(info.fin);
          dateFin.setDate(dateFin.getDate() + 1);

          if (currentDate >= dateDebut && currentDate <= dateFin) {
            const card = $("<div>").addClass("p-4 mb-4 border rounded-lg");
            let theme;
            let icon;
            const startDate = new Date(info.debut);
            const endDate = new Date(info.fin);

            if (currentDate < startDate) {
              theme =
                "p-4 mb-4 text-yellow-800 border border-yellow-300 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300 dark:border-yellow-800";
              icon = `<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
              hasUpcomingEvent = true;
            } else if (currentDate >= startDate && currentDate <= endDate) {
              theme =
                "p-4 mb-4 text-red-800 border border-red-300 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800";
              icon = `<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
              hasOngoingEvent = true;
            } else {
              theme =
                "p-4 mb-4 text-green-800 border border-green-300 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400 dark:border-green-800";
              icon = `<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
            }

            card.addClass(theme);
            card.attr("role", "alert");

            card.append(
              $("<div>")
                .addClass("flex items-center")
                .append(
                  icon,
                  $("<h3>")
                    .addClass("text-xl font-big")
                    .text(" " + info.titre)
                )
            );
            if (currentDate > endDate) {
              card.append(
                $("<p>")
                  .addClass("mt-2 mb-4 text-sm")
                  .text("Aucun évènement prévu au Zénith prochainement.")
              );
            } else {
              card.append(
                $("<h2 class='mt-2 mb-4 text-sm'>").html(
                  info.description.replace(/\n/g, "<br><br>")
                )
              );
            }

            card.append($("<hr>").addClass("border-current opacity-30"));
            card.append(
              $("<p>")
                .addClass("mb-0 mt-4")
                .text(
                  "Date: " +
                    dateDd.toLocaleDateString("fr-FR") +
                    " → " +
                    dateFinAffichee.toLocaleDateString("fr-FR")
                )
            );

            alertMessage.append(card);
          }
        });

        if (!hasUpcomingEvent && !hasOngoingEvent) {
          alertMessage.append($("<p>").text("Aucun évènement prévu au Zénith prochainement."));
        }
      }
    } else {
      alertMessage.append(
        $("<div>")
          .attr("id", "alert-additional-content-3")
          .addClass(
            "p-4 mb-4 text-green-800 border border-green-300 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400 dark:border-green-800"
          )
          .attr("role", "alert")
          .append(
            $("<div>")
              .addClass("flex items-center")
              .append(
                $(
                  '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
                ),
                $("<span>").addClass("sr-only").text("Info"),
                $("<h3>")
                  .addClass("text-lg font-medium")
                  .text("Tout va bien actuellement")
              ),
            $("<div>")
              .addClass("mt-2 mb-4 text-sm")
              .text(
                "Aucune information de trafic à signaler pour cette ligne. Tout circule normalement."
              )
          )
      );
    }
  });
}

updateBusTimes(); // Appel initial pour mettre à jour les données immédiatement
setInterval(updateBusTimes, 60000); // Appel toutes les minutes pour mettre à jour les données
