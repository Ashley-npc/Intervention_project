// Comptes rendus (coordinateur) : à valider / interventions sans compte rendu / tous, avec filtres, tri et pagination.
Shell.demarrer(function (contenu) {
  document.title = 'Comptes rendus · Suivi à domicile';
  RechercheInterventions.demarrer(contenu, {
    titre: 'Comptes rendus', api: 'comptes-rendus.php',
    onglets: [['a_valider', 'À valider'], ['sans', 'Interventions sans compte rendu'], ['tous', 'Tous les comptes rendus']],
    ongletInitial: param('etat') === 'sans' ? 'sans' : (param('etat') === 'tous' ? 'tous' : 'a_valider'),
    tris: [['date', 'Date'], ['beneficiaire', 'Bénéficiaire'], ['intervenant', 'Intervenant']], tri: 'date', sens: 'desc',
    vide: function (e) { return e === 'sans' ? 'Aucune intervention passée sans compte rendu pour ces critères.' : (e === 'tous' ? 'Aucun compte rendu pour ces critères.' : 'Rien à valider pour ces critères.'); },
    action: function (x, e) { return btnIco(e === 'sans' ? 'ouvrir' : 'lue', e === 'sans' ? 'Ouvrir' : 'Lire et valider', 'href="' + FRONT + 'interventions/fiche.html?id=' + x.id + '"', 'a'); }
  });
});
