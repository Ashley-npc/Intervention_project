// Description des ressources gérées par crud.js. Ajouter une ressource = ajouter un bloc ici + 3 petites pages HTML.
var RESSOURCES = {
  beneficiaires: {
    api: 'beneficiaires.php', singulier: 'bénéficiaire', titre: 'Bénéficiaires', nouveau: 'Nouveau bénéficiaire',
    pages: { liste: 'beneficiaires/liste.html', fiche: 'beneficiaires/fiche.html', form: 'beneficiaires/form.html' },
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
    pages: { liste: 'intervenants/liste.html', fiche: 'intervenants/fiche.html', form: 'intervenants/form.html' },
    etat: { off: 'Désactivé', action: 'Désactiver', retour: 'Réactiver', voirTous: 'Afficher aussi les désactivés' },
    autrePersonne: 'beneficiaire',
    recherche: 'Nom ou prénom',
    colonnes: [
      { k: 'nom', l: 'Nom', f: function (x) { return x.nom + ' ' + x.prenom; } },
      { k: 'statut', l: 'Statut', f: function (x) { return lib(x.statut); } }, { k: 'telephone', l: 'Téléphone' }, { k: 'nb_interventions', l: 'Interventions' }
    ],
    nomComplet: function (x) { return x.prenom + ' ' + x.nom; },
    sections: [
      { titre: 'Identité', champs: [
        { k: 'nom', l: 'Nom', requis: 1 }, { k: 'prenom', l: 'Prénom', requis: 1 },
        { k: 'statut', l: 'Statut', type: 'select', requis: 1, aff: lib, options: [['', '— choisir —'], ['salarie', 'Salarié'], ['benevole', 'Bénévole'], ['prestataire', 'Prestataire']] } ] },
      { titre: 'Contact', champs: [
        { k: 'adresse', l: 'Adresse', large: 1 }, { k: 'telephone', l: 'Téléphone', type: 'tel' }, { k: 'courriel', l: 'Courriel', type: 'email' } ] },
      { titre: 'Préférences', champs: [
        { k: 'types_beneficiaires_preferes', l: 'Bénéficiaires préférés', large: 1 },
        { k: 'horaires_preferes', l: 'Horaires préférés', large: 1 } ] }
    ]
  }
  ,
  aidants: {
    api: 'aidants.php', singulier: 'proche aidant', titre: 'Proches aidants', nouveau: 'Nouveau proche aidant',
    pages: { liste: 'aidants/liste.html', fiche: 'aidants/fiche.html', form: 'aidants/form.html' },
    etat: { off: 'Désactivé', action: 'Désactiver', retour: 'Réactiver', voirTous: 'Afficher aussi les désactivés' },
    recherche: 'Nom ou prénom',
    colonnes: [
      { k: 'nom', l: 'Nom', f: function (x) { return x.nom + ' ' + x.prenom; } },
      { k: 'telephone', l: 'Téléphone' }, { k: 'preference_communication', l: 'Préférence' }, { k: 'nb_beneficiaires', l: 'Bénéficiaires liés' }
    ],
    nomComplet: function (x) { return x.prenom + ' ' + x.nom; },
    sections: [
      { titre: 'Identité', champs: [ { k: 'nom', l: 'Nom', requis: 1 }, { k: 'prenom', l: 'Prénom', requis: 1 } ] },
      { titre: 'Contact', champs: [
        { k: 'adresse', l: 'Adresse', large: 1 }, { k: 'telephone', l: 'Téléphone', type: 'tel' }, { k: 'courriel', l: 'Courriel', type: 'email' },
        { k: 'preference_communication', l: 'Préférence de contact', type: 'select', options: [['', '—'], ['courriel', 'Courriel'], ['sms', 'SMS'], ['appel', 'Appel']] } ] }
    ],
    // Sous la fiche : les bénéficiaires auxquels cette personne est liée.
    apresFiche: function (x, contenu, data) {
      var l = data.beneficiaires_lies || [], h = '<section class="card"><header><h2>Bénéficiaires suivis</h2></header>';
      if (!l.length) h += '<p class="empty">Aucun bénéficiaire lié. Le lien se crée depuis la fiche du bénéficiaire.</p>';
      else { h += '<ul class="agenda">'; for (var i = 0; i < l.length; i++) h += '<li><div><b><a href="' + FRONT + 'beneficiaires/fiche.html?id=' + l[i].id + '">' + esc(l[i].prenom + ' ' + l[i].nom) + '</a></b><span>' + esc(l[i].lien_parente || 'lien non précisé') + '</span></div></li>'; h += '</ul>'; }
      contenu.insertAdjacentHTML('beforeend', h + '</section>');
    }
  }
};

// Les chemins ci-dessus sont relatifs au dossier frontend/ : on les rend absolus une fois pour toutes.
(function () {
  for (var n in RESSOURCES) for (var k in RESSOURCES[n].pages) RESSOURCES[n].pages[k] = FRONT + RESSOURCES[n].pages[k];
})();
