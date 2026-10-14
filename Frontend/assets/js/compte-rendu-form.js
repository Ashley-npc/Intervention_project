// Page d'une intervention pour l'intervenant : détails + saisie (ou lecture) du compte rendu.
Shell.demarrer(function (contenu) {
  var id = param('id'), retour = FRONT + 'espace-intervenant/planning.html';
  document.title = 'Intervention · Suivi à domicile';
  if (!id) { Shell.erreur(contenu, 'Identifiant manquant.', retour); return; }
  function ligne(l, v) { return '<div><dt>' + l + '</dt><dd>' + (v ? esc(v) : '—') + '</dd></div>'; }

  appel('interventions.php?id=' + encodeURIComponent(id)).then(function (r) {
    if (!r.ok) { Shell.erreur(contenu, r.data.message || 'Erreur.', retour); return; }
    var x = r.data.item, b = r.data.beneficiaire, cr = r.data.compte_rendu;
    var passee = x.date <= aujourdhui(), annulee = /^a/.test(x.statut), verrou = cr && cr.valide_par_coordinateur;
    var h = '<div class="page-head"><div><h1>' + esc(b.prenom + ' ' + b.nom) + '</h1><p><a href="' + FRONT + 'espace-intervenant/planning.html?date=' + x.date + '">← Mon planning</a> · ' + badgeStatut(x) + '</p></div></div>' +
      '<section class="card"><header><h2>Intervention</h2></header><dl class="facts">' + ligne('Date', dateLongue(x.date)) + ligne('Horaire', x.heure_debut + ' – ' + x.heure_fin) + ligne('Type', lib(x.type)) +
      ligne('Lieu', x.lieu === 'domicile' ? 'Au domicile' : 'Extérieur : ' + (x.adresse_exterieur || '')) + '</dl></section>' +
      '<section class="card"><header><h2>Bénéficiaire</h2></header><dl class="facts">' + ligne('Adresse', b.adresse) + ligne('Téléphone', b.telephone) + ligne('Accès au domicile', b.acces_domicile) +
      ligne('Animaux', b.animaux) + ligne('Habitudes', b.habitudes) + ligne('Horaires préférés', b.horaires_preferes) + '</dl></section>' +
      '<section class="card" id="dossier-medical" hidden></section>';
    if (annulee) h += '<section class="card"><p class="empty">Cette intervention est annulée.</p></section>';
    else if (!passee && !cr) h += '<section class="card"><header><h2>Compte rendu</h2></header><p class="empty">Le compte rendu se saisit à partir du jour de l\'intervention.</p></section>';
    else {
      var v = cr || {};
      h += '<form id="f" novalidate><section class="card"><header><h2>Compte rendu</h2>' + (cr ? '<span class="badge ' + (verrou ? 'ok' : 'warn') + '">' + (verrou ? 'Validé' : 'En attente de validation') + '</span>' : '') + '</header>' +
        '<p class="msg-err" id="msg" hidden></p><div class="form-grid">' +
        '<div class="field"><label for="c_duree_reelle">Durée réelle (minutes)</label><input id="c_duree_reelle" name="duree_reelle" type="number" min="1" max="1440" inputmode="numeric" value="' + esc(v.duree_reelle || '') + '"' + (verrou ? ' disabled' : '') + '><span class="field-err" id="e_duree_reelle"></span></div>' +
        '<div class="field"><label for="c_etat_beneficiaire">État du bénéficiaire</label><select id="c_etat_beneficiaire" name="etat_beneficiaire"' + (verrou ? ' disabled' : '') + '>' +
        [['', '—'], ['bon', 'Bon'], ['moyen', 'Moyen'], ['preoccupant', 'Préoccupant']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === (v.etat_beneficiaire || '') ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select><span class="field-err" id="e_etat_beneficiaire"></span></div>' +
        '<div class="field large"><label for="c_actes_realises">Actes réalisés *</label><textarea id="c_actes_realises" name="actes_realises" rows="4"' + (verrou ? ' disabled' : '') + '>' + esc(v.actes_realises || '') + '</textarea><span class="field-err" id="e_actes_realises"></span></div>' +
        '<div class="field large"><label for="c_observations">Observations</label><textarea id="c_observations" name="observations" rows="3"' + (verrou ? ' disabled' : '') + '>' + esc(v.observations || '') + '</textarea><span class="field-err" id="e_observations"></span></div></div>' +
        (verrou ? '<p class="muted">Compte rendu validé par le coordinateur : il ne peut plus être modifié.</p>' : '<div class="actions"><button class="btn" type="submit" id="ok">' + (cr ? 'Enregistrer les modifications' : 'Enregistrer le compte rendu') + '</button></div>') +
        '</section></form>';
    }
    contenu.innerHTML = h;
    DossierMedical.afficher(document.getElementById('dossier-medical'), x.id_beneficiaire);
    var f = document.getElementById('f');
    if (f && !verrou) f.addEventListener('submit', function (e) {
      e.preventDefault(); effacerErreurs();
      var corps = {}, ch = f.elements;
      for (var i = 0; i < ch.length; i++) if (ch[i].name && (cr || ch[i].value !== '')) corps[ch[i].name] = ch[i].value;
      if (!cr) corps.id_intervention = x.id;
      var btn = document.getElementById('ok'); btn.disabled = true;
      appel('comptes-rendus.php' + (cr ? '?id_intervention=' + x.id : ''), { method: cr ? 'PUT' : 'POST', body: JSON.stringify(corps) }).then(function (r2) {
        if (r2.ok) { location.reload(); return; }
        btn.disabled = false; montrerErreurs(r2);
      }, function () { btn.disabled = false; });
    });
  });
});
