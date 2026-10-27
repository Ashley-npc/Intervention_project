// Recherche d'interventions (coordinateur) : critères combinables, tri, pagination (CDC 5.12).
Shell.demarrer(function (contenu) {
  document.title = 'Interventions · Suivi à domicile';
  RechercheInterventions.demarrer(contenu, {
    titre: 'Interventions', api: 'interventions.php?recherche=1',
    statut: [['planifiee', 'Planifiée'], ['realisee', 'Réalisée'], ['annulee', 'Annulée']], type: true, urgente: true,
    tris: [['date', 'Date'], ['beneficiaire', 'Bénéficiaire'], ['intervenant', 'Intervenant'], ['statut', 'Statut'], ['type', 'Type']], tri: 'date', sens: 'desc',
    vide: function () { return 'Aucune intervention pour ces critères.'; },
    action: function (x) { return btnIco('ouvrir', 'Ouvrir', 'href="' + FRONT + 'interventions/fiche.html?id=' + x.id + '"', 'a'); }
  });
});
