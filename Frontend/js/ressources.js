// Description des ressources gérées par crud.js. Ajouter une ressource = ajouter un bloc ici + 3 petites pages HTML.
var RESSOURCES = {
  beneficiaires: {
    api: 'beneficiaires.php', singulier: 'bénéficiaire', titre: 'Bénéficiaires', nouveau: 'Nouveau bénéficiaire',
    pages: { liste: 'beneficiaires.html', fiche: 'beneficiaire-fiche.html', form: 'beneficiaire-form.html' },
    etat: { off: 'Archivé', action: 'Archiver', retour: 'Restaurer', voirTous: 'Afficher aussi les archivés' },
    autrePersonne: 'intervenant',
    recherche: 'Nom, prénom ou n° de dossier',
    colonnes: [
      { k: 'numero_dossier', l: 'Dossier' },
      { k: 'nom', l: 'Nom', f: function (x) { return x.nom + ' ' + x.prenom; } },
      { k: 'date_naissance', l: 'Âge', f: function (x) { return age(x.date_naissance); } },
      { k: 'telephone', l: 'Téléphone' },
      { k: 'nb_interventions', l: 'Interventions' }
    ],
    nomComplet: function (x) { return x.prenom + ' ' + x.nom; },
    sections: [
      { titre: 'Identité', champs: [
        { k: 'nom', l: 'Nom', requis: 1 }, { k: 'prenom', l: 'Prénom', requis: 1 },
        { k: 'date_naissance', l: 'Date de naissance', type: 'date', requis: 1, aff: dateFr },
        { k: 'sexe', l: 'Sexe', type: 'select', options: [['', '—'], ['F', 'Femme'], ['M', 'Homme']], aff: function (v) { return v === 'F' ? 'Femme' : v === 'M' ? 'Homme' : ''; } },
        { k: 'numero_dossier', l: 'N° de dossier', aide: 'Laisser vide : généré automatiquement.' },
        { k: 'situation_familiale', l: 'Situation familiale' } ] },
      { titre: 'Contact et domicile', champs: [
        { k: 'adresse', l: 'Adresse', requis: 1, large: 1 }, { k: 'telephone', l: 'Téléphone', type: 'tel' },
        { k: 'courriel', l: 'Courriel', type: 'email' }, { k: 'acces_domicile', l: 'Accès au domicile', large: 1 } ] },
      { titre: 'Préférences', champs: [
        { k: 'horaires_preferes', l: 'Horaires préférés', large: 1 },
        { k: 'animaux', l: 'Animaux' },
        { k: 'habitudes', l: 'Habitudes', type: 'textarea', large: 1 } ] }
    ]
  },
  intervenants: {
    api: 'intervenants.php', singulier: 'intervenant', titre: 'Intervenants', nouveau: 'Nouvel intervenant',
    pages: { liste: 'intervenants.html', fiche: 'intervenant-fiche.html', form: 'intervenant-form.html' },
    etat: { off: 'Désactivé', action: 'Désactiver', retour: 'Réactiver', voirTous: 'Afficher aussi les désactivés' },
    autrePersonne: 'beneficiaire',
    recherche: 'Nom ou prénom',
    colonnes: [
      { k: 'nom', l: 'Nom', f: function (x) { return x.nom + ' ' + x.prenom; } },
      { k: 'statut', l: 'Statut' }, { k: 'telephone', l: 'Téléphone' }, { k: 'nb_interventions', l: 'Interventions' }
    ],
    nomComplet: function (x) { return x.prenom + ' ' + x.nom; },
    sections: [
      { titre: 'Identité', champs: [
        { k: 'nom', l: 'Nom', requis: 1 }, { k: 'prenom', l: 'Prénom', requis: 1 },
        { k: 'statut', l: 'Statut', type: 'select', requis: 1, options: [['', '— choisir —'], ['salarié', 'Salarié'], ['bénévole', 'Bénévole'], ['prestataire', 'Prestataire']] } ] },
      { titre: 'Contact', champs: [
        { k: 'adresse', l: 'Adresse', large: 1 }, { k: 'telephone', l: 'Téléphone', type: 'tel' }, { k: 'courriel', l: 'Courriel', type: 'email' } ] },
      { titre: 'Préférences', champs: [
        { k: 'types_beneficiaires_preferes', l: 'Bénéficiaires préférés', large: 1 },
        { k: 'horaires_preferes', l: 'Horaires préférés', large: 1 } ] }
    ]
  }
};
