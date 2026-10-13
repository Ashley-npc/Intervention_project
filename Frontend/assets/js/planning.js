// Planning sous forme de CALENDRIER MENSUEL : on voit la charge du mois d'un coup d'oeil, on navigue dans les mois passés,
// et un clic sur un jour affiche le détail de ce jour en dessous.
//   <body data-mode="coordination"> : coordinateur / administrateur (filtre par intervenant, ajout d'intervention)
//   <body data-mode="intervenant">   : l'intervenant voit ses propres interventions (+ accès au compte rendu)
Shell.demarrer(function (contenu, user) {
  var coord = document.body.getAttribute("data-mode") === "coordination";
  var depart = param("date") || aujourdhui();
  var mois = depart.slice(0, 7),
    jour = depart,
    filtre = "",
    items = {};
  document.title = "Planning · Suivi à domicile";

  contenu.innerHTML =
    '<div class="page-head"><div><h1>' +
    (coord ? "Planning" : "Mon planning") +
    '</h1><p id="periode"></p></div>' +
    (coord
      ? '<a class="btn" id="nouvelle" href="' +
        FRONT +
        'interventions/form.html">+ Nouvelle intervention</a>'
      : "") +
    "</div>" +
    '<section class="card"><div class="toolbar"><button type="button" class="btn small" id="prec" aria-label="Mois précédent">‹</button>' +
    '<b id="titre-mois" class="titre-mois"></b><button type="button" class="btn small" id="suiv" aria-label="Mois suivant">›</button>' +
    '<button type="button" class="btn small" id="auj">Aujourd\'hui</button>' +
    (coord
      ? '<select id="filtre" aria-label="Filtrer par intervenant"><option value="">Tous les intervenants</option></select>'
      : "") +
    "</div>" +
    '<div id="calendrier"><p class="empty">Chargement…</p></div></section>' +
    '<section class="card" id="detail"></section>';

  if (coord)
    appel("intervenants.php").then(function (r) {
      if (!r.ok) return;
      var o = "";
      for (var i = 0; i < r.data.items.length; i++)
        o +=
          '<option value="' +
          r.data.items[i].id +
          '">' +
          esc(r.data.items[i].prenom + " " + r.data.items[i].nom) +
          "</option>";
      document.getElementById("filtre").insertAdjacentHTML("beforeend", o);
    });

  function lienIntervention(x) {
    return (
      FRONT +
      (coord
        ? "interventions/fiche.html"
        : "espace-intervenant/compte-rendu.html") +
      "?id=" +
      x.id
    );
  }
  function premierDuMois() {
    return mois + "-01";
  }

  function dessinerCalendrier() {
    var d1 = premierDuMois(),
      debut = lundiDe(d1),
      dm = dateDe(d1),
      mm = dm.getMonth();
    document.getElementById("titre-mois").textContent =
      MOIS[mm].charAt(0).toUpperCase() +
      MOIS[mm].slice(1) +
      " " +
      dm.getFullYear();
    var h = '<div class="cal"><div class="cal-tete">';
    var noms = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    for (var i = 0; i < 7; i++) h += "<span>" + noms[i] + "</span>";
    h += '</div><div class="cal-grille">';
    for (var s = 0; s < 6; s++) {
      // 6 semaines max
      var j0 = addJours(debut, s * 7);
      if (s === 5 && dateDe(j0).getMonth() !== mm) break;
      for (i = 0; i < 7; i++) {
        var j = addJours(j0, i),
          liste = items[j] || [],
          actives = 0,
          k;
        for (k = 0; k < liste.length; k++)
          if (!/^a/.test(liste[k].statut)) actives++;
        var cls =
          "jr" +
          (dateDe(j).getMonth() !== mm ? " hors" : "") +
          (j === aujourdhui() ? " auj" : "") +
          (j === jour ? " sel" : "");
        h +=
          '<button type="button" class="' +
          cls +
          '" data-jour="' +
          j +
          '"><span class="num">' +
          dateDe(j).getDate() +
          "</span>";
        // Grand écran : les 3 premiers créneaux ; petit écran : juste le nombre.
        for (k = 0; k < Math.min(liste.length, 3); k++)
          h +=
            '<span class="puce' +
            (/^a/.test(liste[k].statut) ? " off" : "") +
            (liste[k].urgente ? " urg" : "") +
            '">' +
            liste[k].heure_debut +
            " " +
            esc(coord ? liste[k].beneficiaire_nom : liste[k].beneficiaire_nom) +
            "</span>";
        if (liste.length > 3)
          h += '<span class="puce plus">+' + (liste.length - 3) + "</span>";
        if (actives) h += '<span class="compte">' + actives + "</span>";
        h += "</button>";
      }
    }
    document.getElementById("calendrier").innerHTML = h + "</div></div>";
  }

  function dessinerDetail() {
    var liste = items[jour] || [],
      h =
        '<header><h2 style="text-transform:none">' +
        dateLongue(jour).replace(/^./, function (c) {
          return c.toUpperCase();
        }) +
        "</h2>" +
        (coord
          ? '<a class="btn small" href="' +
            FRONT +
            "interventions/form.html?date=" +
            jour +
            (filtre ? "&id_intervenant=" + filtre : "") +
            '">+ Ajouter</a>'
          : "") +
        "</header>";
    if (!liste.length) h += '<p class="empty">Rien de prévu ce jour-là.</p>';
    else {
      h += '<div class="defile">';
      for (var i = 0; i < liste.length; i++) {
        var x = liste[i],
          qui = coord
            ? x.beneficiaire_prenom +
              " " +
              x.beneficiaire_nom +
              " · " +
              x.intervenant_prenom +
              " " +
              x.intervenant_nom
            : x.beneficiaire_prenom + " " + x.beneficiaire_nom;
        h +=
          '<a class="creneau' +
          (/^a/.test(x.statut) ? " off" : "") +
          '" href="' +
          lienIntervention(x) +
          '"><b>' +
          x.heure_debut +
          "–" +
          x.heure_fin +
          "</b><span>" +
          esc(qui) +
          "</span><small>" +
          esc(lib(x.type)) +
          (x.lieu !== "domicile" ? " · extérieur" : "") +
          "</small><span>" +
          badgeStatut(x) +
          "</span></a>";
      }
      h += "</div>";
    }
    document.getElementById("detail").innerHTML = h;
  }

  function charger() {
    var d1 = premierDuMois(),
      debut = lundiDe(d1),
      fin = addJours(debut, 41);
    document.getElementById("periode").textContent =
      "Cliquez sur un jour pour voir son détail.";
    appel(
      "interventions.php?du=" +
        debut +
        "&au=" +
        fin +
        (filtre ? "&id_intervenant=" + filtre : ""),
    ).then(function (r) {
      if (!r.ok) {
        document.getElementById("calendrier").innerHTML =
          '<p class="msg-err">' + esc(r.data.message || "Erreur.") + "</p>";
        return;
      }
      items = {};
      for (var i = 0; i < r.data.items.length; i++)
        (items[r.data.items[i].date] = items[r.data.items[i].date] || []).push(
          r.data.items[i],
        );
      dessinerCalendrier();
      dessinerDetail();
    });
  }
  function changerMois(n) {
    var d = dateDe(premierDuMois());
    d.setMonth(d.getMonth() + n);
    mois = isoDe(d).slice(0, 7);
    jour = mois + "-01";
    charger();
  }

  document.getElementById("prec").addEventListener("click", function () {
    changerMois(-1);
  });
  document.getElementById("suiv").addEventListener("click", function () {
    changerMois(1);
  });
  document.getElementById("auj").addEventListener("click", function () {
    jour = aujourdhui();
    mois = jour.slice(0, 7);
    charger();
  });
  if (coord)
    document.getElementById("filtre").addEventListener("change", function () {
      filtre = this.value;
      charger();
    });
  document.getElementById("calendrier").addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-jour]") : null;
    if (!b) return;
    jour = b.getAttribute("data-jour");
    if (jour.slice(0, 7) !== mois) {
      mois = jour.slice(0, 7);
      charger();
      return;
    }
    dessinerCalendrier();
    dessinerDetail();
    document.getElementById("detail").scrollIntoView();
  });
  charger();
});
