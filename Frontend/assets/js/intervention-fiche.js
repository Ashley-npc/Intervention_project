// Fiche d'une intervention (coordinateur / administrateur) : détails, compte rendu, validation, annulation.
Shell.demarrer(function (contenu) {
  var id = param('id');
  document.title = 'Intervention · Suivi à domicile';
  var retour = FRONT + 'interventions/planning.html';
  if (!id) { Shell.erreur(contenu, 'Identifiant manquant.', retour); return; }
  function ligne(l, v) { return '<div><dt>' + l + '</dt><dd>' + (v ? esc(v) : '—') + '</dd></div>'; }

  appel('interventions.php?id=' + encodeURIComponent(id)).then(function (r) {
    if (!r.ok) { Shell.erreur(contenu, r.data.message || 'Erreur.', retour); return; }
    var x = r.data.item, b = r.data.beneficiaire, cr = r.data.compte_rendu;
    var h = '<div class="page-head"><div><h1>' + esc(x.beneficiaire_prenom + ' ' + x.beneficiaire_nom) + '</h1><p><a href="' + FRONT + 'interventions/planning.html?date=' + x.date + '">← Planning</a> · ' + badgeStatut(x) + '</p></div><div class="actions">' +
            (x.validee ? '' : '<a class="btn" href="' + FRONT + 'interventions/form.html?id=' + x.id + '">Modifier</a>') +
            (x.validee || /^a/.test(x.statut) ? '' : '<button type="button" class="btn secondary" id="annuler">Annuler l\'intervention</button>') + '</div></div><p class="msg-err" id="msg" hidden></p>' +
            '<section class="card"><header><h2>Intervention</h2></header><dl class="facts">' + ligne('Date', dateLongue(x.date)) + ligne('Horaire', x.heure_debut + ' – ' + x.heure_fin) + ligne('Type', x.type) +
            ligne('Intervenant', x.intervenant_prenom + ' ' + x.intervenant_nom) + ligne('Lieu', x.lieu === 'domicile' ? 'Au domicile' : 'Extérieur : ' + (x.adresse_exterieur || '')) + '</dl></section>' +
            '<section class="card"><header><h2>Bénéficiaire</h2><a class="link" href="' + FRONT + 'beneficiaires/fiche.html?id=' + x.id_beneficiaire + '">Voir la fiche</a></header><dl class="facts">' +
            ligne('Adresse', b.adresse) + ligne('Téléphone', b.telephone) + ligne('Accès au domicile', b.acces_domicile) + ligne('Animaux', b.animaux) + ligne('Habitudes', b.habitudes) + '</dl></section>' +
            '<section class="card"><header><h2>Compte rendu</h2>' + (cr ? '<span class="badge ' + (cr.valide_par_coordinateur ? 'ok' : 'warn') + '">' + (cr.valide_par_coordinateur ? 'Validé' : 'À valider') + '</span>' : '') + '</header>';
    if (!cr) h += '<p class="empty">Pas encore de compte rendu.</p>';
    else {
      h += '<dl class="facts">' + ligne('Saisi le', dateFr(cr.date_saisie)) + ligne('Durée réelle', cr.duree_reelle ? cr.duree_reelle + ' min' : '') + ligne('État du bénéficiaire', cr.etat_beneficiaire) +
           ligne('Actes réalisés', cr.actes_realises) + ligne('Observations', cr.observations) + '</dl>';
      if (!cr.valide_par_coordinateur) h += '<div class="actions"><button type="button" class="btn" id="valider">Valider le compte rendu</button></div>';
    }
    contenu.innerHTML = h + '</section>';

    function action(corps, url) {
      appel(url, { method: 'PUT', body: JSON.stringify(corps) }).then(function (r2) {
        if (r2.ok) location.reload(); else { var m = document.getElementById('msg'); m.textContent = r2.data.message || 'Erreur.'; m.hidden = false; window.scrollTo(0, 0); }
      });
    }
    var a = document.getElementById('annuler'), v = document.getElementById('valider');
    if (a) a.addEventListener('click', function () { if (window.confirm('Annuler cette intervention ? Elle restera visible dans l\'historique.')) action({ statut: 'annulée' }, 'interventions.php?id=' + x.id); });
    if (v) v.addEventListener('click', function () { if (window.confirm('Valider ce compte rendu ? L\'intervention sera verrouillée (plus de modification possible).')) action({ valider: true }, 'comptes-rendus.php?id_intervention=' + x.id); });
  });
});
