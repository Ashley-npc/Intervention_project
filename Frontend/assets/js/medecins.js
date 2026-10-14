// Fiches des medecins prescripteurs (coordinateur, administrateur). Contacts externes : pas de compte de connexion.
Shell.demarrer(function (contenu) {
  document.title = 'Médecins · Suivi à domicile';
  contenu.innerHTML = '<div class="page-head"><div><h1>Médecins prescripteurs</h1><p id="compte"></p></div></div>' +
    '<section class="card"><p class="muted">Un médecin prescripteur est un contact externe : il n\'a pas de compte. Enregistrez-le ici pour pouvoir l\'indiquer sur les interventions qu\'il a prescrites.</p></section>' +
    '<section class="card"><header><h2>Ajouter un médecin</h2></header><p class="msg-err" id="msg" hidden></p><form id="f" novalidate><div class="form-grid">' +
    '<div class="field"><label for="m_nom">Nom *</label><input id="m_nom" name="nom" type="text" maxlength="100"><span class="field-err" id="e_nom"></span></div>' +
    '<div class="field"><label for="m_prenom">Prénom</label><input id="m_prenom" name="prenom" type="text" maxlength="100"><span class="field-err" id="e_prenom"></span></div>' +
    '<div class="field"><label for="m_specialite">Spécialité</label><input id="m_specialite" name="specialite" type="text" maxlength="100"><span class="field-err" id="e_specialite"></span></div>' +
    '<div class="field"><label for="m_telephone">Téléphone</label><input id="m_telephone" name="telephone" type="tel"><span class="field-err" id="e_telephone"></span></div>' +
    '<div class="field large"><label for="m_courriel">Courriel</label><input id="m_courriel" name="courriel" type="email"><span class="field-err" id="e_courriel"></span></div>' +
    '</div><div class="actions"><button class="btn" type="submit" id="ok">Ajouter</button></div></form></section>' +
    '<section class="card"><header><h2>Liste</h2></header><div class="table-wrap stack" id="liste"><p class="empty">Chargement…</p></div></section>';
  function nom(m) { return ((m.prenom || '') + ' ' + m.nom).replace(/^ /, ''); }
  function charger() {
    appel('medecins.php').then(function (r) {
      var z = document.getElementById('liste');
      if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var it = r.data.items;
      document.getElementById('compte').textContent = it.length + ' médecin' + (it.length > 1 ? 's' : '');
      if (!it.length) { z.innerHTML = '<p class="empty">Aucun médecin enregistré.</p>'; return; }
      var h = '<table><thead><tr><th>Médecin</th><th>Spécialité</th><th>Contact</th><th>Interventions prescrites</th></tr></thead><tbody>';
      for (var i = 0; i < it.length; i++) {
        var m = it[i];
        h += '<tr><td data-l="Médecin"><b>Dr ' + esc(nom(m)) + '</b></td><td data-l="Spécialité">' + esc(m.specialite || '—') + '</td><td data-l="Contact">' + esc(m.telephone || m.courriel || '—') +
             '</td><td data-l="Interventions prescrites">' + m.nb_interventions + '</td></tr>';
      }
      z.innerHTML = h + '</tbody></table>';
    });
  }
  contenu.addEventListener('submit', function (e) {
    e.preventDefault(); effacerErreurs();
    var corps = {}, ch = e.target.elements, i, bt = document.getElementById('ok');
    for (i = 0; i < ch.length; i++) if (ch[i].name && ch[i].value !== '') corps[ch[i].name] = ch[i].value;
    bt.disabled = true;
    appel('medecins.php', { method: 'POST', body: JSON.stringify(corps) }).then(function (r) {
      bt.disabled = false;
      if (r.ok) { e.target.reset(); charger(); } else montrerErreurs(r);
    }, function () { bt.disabled = false; });
  });
  charger();
});
