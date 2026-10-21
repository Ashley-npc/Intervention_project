// Carte « Documents » sur la fiche d'un bénéficiaire ou d'un intervenant. Elle reste cachée si votre rôle n'y a pas accès.
(function () {
  [['beneficiaires', 'beneficiaire'], ['intervenants', 'intervenant']].forEach(function (c) {
    var R = RESSOURCES[c[0]]; if (!R) return;
    var avant = R.apresFiche;
    R.apresFiche = function (x, contenu, data) {
      if (avant) avant(x, contenu, data);
      var zone = document.createElement('section'); zone.className = 'card'; zone.hidden = true; contenu.appendChild(zone);
      Documents.carte(zone, { type: c[1], id: x.id });
    };
  });
})();
