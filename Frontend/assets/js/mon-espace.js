// Espace du bénéficiaire (« Mes visites », gros caractères) et du proche aidant (lecture seule).
Shell.demarrer(function (contenu, user) {
  var benef = user.role === 'beneficiaire';
  document.title = (benef ? 'Mes visites' : 'Suivi de mon proche') + ' · Suivi à domicile';
  if (benef) document.body.className += ' large';
  var notation = true;   // faux tant que ajout-satisfaction.sql n'a pas été lancé
  function visite(v, passee) {
    return '<li><time>' + (passee ? dateFr(v.date).slice(0, 5) : v.heure_debut) + '<span>' + (passee ? v.heure_debut : v.heure_fin) + '</span></time><div><b>' + (passee ? '' : jourLong(v.date) + ' · ') + esc(lib(v.type)) + '</b><span>Avec ' + esc(v.intervenant_prenom) +
           (v.lieu !== 'domicile' ? ' · à l\'extérieur' : '') + '</span></div><span class="badge ' + (/^r/.test(v.statut) ? 'ok' : /^a/.test(v.statut) ? 'grey' : '') + '">' + esc(lib(v.statut)) + '</span>' + (passee && notation && /^r/.test(v.statut) ? '<div class="noter" data-id="' + v.id + '">' + (v.ma_note ? '<span class="muted">Votre note : ' + v.ma_note + ' / 5</span>' : '<button type="button" class="btn small" data-noter="' + v.id + '">Noter cette visite</button>') + '</div>' : '') + '</li>';
  }
  // Note de 1 à 5 + commentaire facultatif sur une visite réalisée (une seule fois, non modifiable).
  function formNote(zone) {
    var id = zone.getAttribute('data-id'), h = '<fieldset class="note-form"><legend>Votre note</legend><div class="etoiles" role="radiogroup" aria-label="Note de 1 à 5">';
    for (var n = 1; n <= 5; n++) h += '<label><input type="radio" name="note-' + id + '" value="' + n + '"> ' + n + '</label>';
    h += '</div><div class="field"><label for="com-' + id + '">Commentaire (facultatif)</label><textarea id="com-' + id + '" rows="2" maxlength="500"></textarea></div>' +
         '<p class="msg-err" hidden></p><div class="actions"><button type="button" class="btn small" data-envoyer="' + id + '">Envoyer</button> <button type="button" class="btn small secondary" data-annuler="' + id + '">Annuler</button></div></fieldset>';
    zone.innerHTML = h;
  }
  contenu.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
    var zone = b.closest('.noter');
    if (b.hasAttribute('data-noter')) { formNote(zone); return; }
    if (b.hasAttribute('data-annuler')) { zone.innerHTML = '<button type="button" class="btn small" data-noter="' + zone.getAttribute('data-id') + '">Noter cette visite</button>'; return; }
    if (b.hasAttribute('data-envoyer')) {
      var id = zone.getAttribute('data-id'), ch = zone.querySelector('input:checked'), err = zone.querySelector('.msg-err');
      if (!ch) { err.textContent = 'Choisissez une note de 1 à 5.'; err.hidden = false; return; }
      b.disabled = true;
      appel('evaluations.php', { method: 'POST', body: JSON.stringify({ id_intervention: parseInt(id, 10), note: parseInt(ch.value, 10), commentaire: zone.querySelector('textarea').value }) }).then(function (r) {
        if (r.ok) { zone.innerHTML = '<span class="muted">Merci ! Votre note : ' + ch.value + ' / 5</span>'; return; }
        b.disabled = false; err.textContent = (r.data.erreurs && (r.data.erreurs.note || r.data.erreurs.commentaire)) || r.data.message || 'Erreur.'; err.hidden = false;
      });
    }
  });
  appel('mon-espace.php').then(function (r) {
    if (!r.ok) { Shell.erreur(contenu, r.data.message || 'Erreur.'); return; }
    notation = r.data.notation !== false;
    var p = r.data.personnes, h = '<div class="page-head"><div><h1>' + (benef ? 'Bonjour ' + (p[0] ? esc(p[0].prenom) : '') : 'Suivi de mes proches') + '</h1><p>' + dateLongue(aujourdhui()) + '</p></div></div>';
    if (!benef) h += '<div class="banner"><b>Lecture seule.</b> Vous voyez uniquement ce que le coordinateur vous a autorisé.</div>';
    if (!p.length) h += '<section class="card"><p class="empty">' + (benef ? 'Votre compte n\'est lié à aucune fiche. Contactez la structure.' : 'Aucun bénéficiaire ne vous est encore associé. Contactez la structure.') + '</p></section>';
    for (var i = 0; i < p.length; i++) {
      var x = p[i], suiv = x.prochaines[0];
      if (!benef) h += '<h2 class="sous-titre">' + esc(x.prenom + ' ' + x.nom) + (x.lien ? ' <span class="muted">(' + esc(x.lien) + ')</span>' : '') + '</h2>';
      if (x.voit_medical) h += '<section class="card dossier-medical" data-b="' + x.id + '" hidden></section>';
      if (!x.voit_planning) { h += '<section class="card"><p class="empty">Vous n\'avez pas l\'autorisation de consulter le planning de cette personne.</p></section>'; continue; }
      h += '<section class="card t-brand"><header><h2>' + (benef ? 'Ma prochaine visite' : 'Prochaine visite') + '</h2></header>' +
           (suiv ? '<div class="next-visit"><div class="when">' + esc(jourLong(suiv.date)) + ' · ' + suiv.heure_debut + '</div><div>' + esc(lib(suiv.type)) + ' avec ' + esc(suiv.intervenant_prenom) + '</div></div>' : '<p class="empty">Aucune visite prévue pour le moment.</p>') + '</section>';
      if (x.voit_etat) h += '<section class="card t-ok"><header><h2>Dernier état constaté</h2></header>' + (x.etat ? '<p><b>' + esc(lib(x.etat.etat_beneficiaire)) + '</b> <span class="muted">(visite du ' + dateFr(x.etat.date) + ')</span></p>' : '<p class="empty">Pas encore d\'information.</p>') + '</section>';
      h += '<div class="grid-2"><section class="card t-violet"><header><h2>À venir</h2></header>' + (x.prochaines.length ? '<ul class="agenda scroll">' + x.prochaines.map(function (v) { return visite(v, false); }).join('') + '</ul>' : '<p class="empty">Rien de prévu.</p>') + '</section>' +
           '<section class="card t-warn"><header><h2>Dernières visites</h2></header>' + (x.dernieres.length ? '<ul class="agenda scroll">' + x.dernieres.map(function (v) { return visite(v, true); }).join('') + '</ul>' : '<p class="empty">Aucune visite passée.</p>') + '</section></div>';
    }
    contenu.innerHTML = h;
    var dms = contenu.querySelectorAll('.dossier-medical');
    for (var k = 0; k < dms.length; k++) DossierMedical.afficher(dms[k], dms[k].getAttribute('data-b'));
  });
});
