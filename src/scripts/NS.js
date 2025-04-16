function updateBusTimes() {
  //const url = "https://raw.githubusercontent.com/Cyber-Thibaut/infotrafic/main/info.json";
  const url = "/src/test.json";
  $.getJSON(url, function (data) {
    const ligne = data.lignes.find((l) => l.ligne === "NS");
    const alertMessage = $("#alertMessage");
    alertMessage.removeClass("hidden").empty(); // Afficher & nettoyer

    if (ligne) {
      const cardHeader = $("<div>").addClass("flex justify-center mb-4");
      const logoLigne = $("<img>")
        .attr("src", "/img/NS.png")
        .addClass("w-20 h-16 object-contain");
      cardHeader.append(logoLigne);
      alertMessage.append(cardHeader);

      if (ligne.infos_trafic.length === 0) {
        alertMessage.append(
          $("<div>").addClass("alert alert-info").append(
            $("<span>").text("Aucun évènement prévu au Zénith prochainement.")
          )
        );
      } else {
        const currentDate = new Date();
        let hasEvent = false;

        ligne.infos_trafic.forEach((info) => {
          const start = new Date(info.debut);
          const end = new Date(info.fin);
          const afficheFin = new Date(info.fin);
          end.setDate(end.getDate() + 1);
          
          if (currentDate >= new Date(info.annonce) && currentDate <= end) {
            hasEvent = true;
        
            let badgeColor = "badge-info";
            let bgColor = "bg-base-200";
            let borderColor = "border-info";
            let emoji = "🎫";
        
            if (currentDate < start) {
              badgeColor = "badge-warning";
              bgColor = "bg-yellow-50";
              borderColor = "border-yellow-300";
              emoji = "📅";
            } else if (currentDate >= start && currentDate <= end) {
              badgeColor = "badge-error";
              bgColor = "bg-red-100";
              borderColor = "border-red-300";
              emoji = "🔥";
            }
        
            const card = $("<div>")
              .addClass(`card shadow-xl border ${borderColor} animate-fade-in ${bgColor}`)
              .css({ transition: "all 0.5s ease-in-out" });
        
            const cardBody = $("<div>").addClass("card-body");
        
            // Badge + emoji
            const badge = $("<div>")
              .addClass(`badge ${badgeColor} text-white px-4 py-2 mb-2 text-sm font-bold tracking-wide uppercase`)
              .text(emoji + " " + info.titre);
        
            // Description stylée
            const description = $("<p>")
              .addClass("text-base leading-relaxed")
              .html(info.description.replace(/\n/g, "<br><br>"));
        
            // Footer avec date
            const footer = $("<div>")
              .addClass("text-sm opacity-60 mt-4")
              .text(
                `📍 Du ${start.toLocaleDateString("fr-FR")} au ${afficheFin.toLocaleDateString("fr-FR")}`
              );
        
            // Composer la carte
            cardBody.append(badge, description, footer);
            card.addClass("hover:scale-[1.02] transition-transform duration-300 hover:shadow-2xl");

            card.append(cardBody);
            alertMessage.append(card);
          }
        });
        

        if (!hasEvent) {
          alertMessage.append(
            $("<div>").addClass("alert alert-success").append(
              $("<span>").text("Aucun évènement prévu au Zénith prochainement.")
            )
          );
        }
      }
    } else {
      alertMessage.append(
        $("<div>").addClass("alert alert-success shadow-lg").append(
          $("<div>").addClass("flex items-center gap-3").append(
            $("<span>").text("✅").addClass("text-2xl"),
            $("<h3>").addClass("font-bold text-lg").text("Tout va bien actuellement")
          ),
          $("<p>").addClass("text-sm mt-2").text(
            "Aucune information de trafic à signaler pour cette ligne. Tout circule normalement."
          )
        )
      );
    }
  });
}

updateBusTimes();
setInterval(updateBusTimes, 60000);
