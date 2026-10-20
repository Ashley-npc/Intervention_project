// Organismes payeurs (CAF, CPAM, MDPH...). Contacts externes : pas de compte. Coordinateur et facturation.
Shell.demarrer(function (contenu) {
  document.title = 'Organismes payeurs · Suivi à domicile';
  var items = [], edition = 0;
  contenu.innerHTML = '<div class="page-head"><div><h1>Organismes payeurs</h1><p id="compte"></p></div></div>' +
    '<section class="card"><p class="muted">Un organisme payeur finance tout ou partie des prestations. Le coordinateur l\'associe à un bénéficiaire (droits ouverts, taux de prise en charge) depuis la fiche du bénéficiaire.</p></section>' +
    '<section class="card"><header><h2 id="titre-f">Ajouter un organisme</h2></header><p class="msg-err" id="msg" hidden></p><form id="f" novalidate><div class="form-grid">' +
    '<div class="field large"><label for="o_nom">Nom *</label><input id="o_nom" name="nom" type="text" maxlength="150"><span class="field-err" id="e_nom"></span></div>' +
    '<div class="field large"><label for="o_adresse">Adresse</label><input id="o_adresse" name="adresse" type="text" maxlength="255"><span class="field-err" id="e_adresse"></span></div>' +
    '<div class="field"><label for="o_telephone">Téléphone</label><input id="o_telephone" name="telephone" type="tel"><span class="field-err" id="e_telephone"></span></div>' +
    '<div class="field"><label for="o_courriel">Courriel</label><input id="o_courriel" name="courriel" type="email"><span class="field-err" id="e_courriel"></span></div>' +
    '</div><div class="actions"><button class="btn" type="submit" id="ok">Ajouter</button> <button class="btn secondary" type="button" id="annuler" hidden>Annuler</button></div></form></section>' +
    '<section class="card"><header><h2>Liste</h2></header><div class="table-wrap stack" id="liste"><p class="empty">Chargement…</p></div></section>';
  var champs = ['nom', 'adresse', 'telephone', 'courriel'];
  function remettre() { edition = 0; document.getElementById('f').reset(); document.getElementById('titre-f').textContent = 'Ajouter un organisme'; document.getElementById('ok').textContent = 'Ajouter'; document.getElementById('annuler').hidden = true; effacerErreurs(); }
  function charger() {
    appel('organismes.php').then(function (r) {
      var z = document.getElementById('liste');
      if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      items = r.data.items;
      document.getElementById('compte').textContent = items.length + ' organisme' + (items.length > 1 ? 's' : '');
      if (!items.length) { z.innerHTML = '<p class="empty">Aucun organisme enregistré.</p>'; return; }
      var h = '<table><thead><tr><th>Organisme</th><th>Contact</th><th>Bénéficiaires</th><th></th></tr></thead><tbody>';
      for (var i = 0; i < items.length; i++) {
        var o = items[i];
        h += '<tr><td data-l="Organisme"><b>' + esc(o.nom) + '</b>' + (o.adresse ? '<br><span class="muted">' + esc(o.adresse) + '</span>' : '') + '</td><td data-l="Contact">' + esc(o.telephone || o.courriel || '—') +
             '</td><td data-l="Bénéficiaires">' + o.nb_beneficiaires + '</td><td>' + btnIco('n_nouvelle', 'Modifier', 'data-edit="' + o.id + '"') + ' ' + btnIco('n_incidents', 'Supprimer', 'data-del="' + o.id + '"') + '</td></tr>';
      }
      z.innerHTML = h + '</tbody></table>';
    });
  }
  contenu.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var i, o;
    if (b.id === 'annuler') { remettre(); return; }
    if (b.getAttribute('data-edit')) {
      for (i = 0; i < items.length; i++) if (String(items[i].id) === b.getAttribute('data-edit')) o = items[i];
      if (!o) return; remettre(); edition = o.id;
      for (i = 0; i < champs.length; i++) document.getElementById('o_' + champs[i]).value = o[champs[i]] || '';
      document.getElementById('titre-f').textContent = 'Modifier « ' + o.nom + ' »'; document.getElementById('ok').textContent = 'Enregistrer'; document.getElementById('annuler').hidden = false;
      document.getElementById('o_nom').focus();
    } else if (b.getAttribute('data-del')) {
      if (!window.confirm('Supprimer cet organisme ?')) return;
      appel('organismes.php?id=' + b.getAttribute('data-del'), { method: 'DELETE' }).then(function (r) { if (r.ok) charger(); else window.alert(r.data.message || 'Erreur.'); });
    }
  });
  contenu.addEventListener('submit', function (e) {
    e.preventDefault(); effacerErreurs();
    var corps = {}, ch = e.target.elements, i, bt = document.getElementById('ok');
    for (i = 0; i < ch.length; i++) if (ch[i].name) corps[ch[i].name] = ch[i].value;
    if (edition) { for (i = 0; i < champs.length; i++) if (corps[champs[i]] === '' && champs[i] === 'nom') delete corps.nom; }
    else for (i in corps) if (corps[i] === '') delete corps[i];
    bt.disabled = true;
    appel('organismes.php' + (edition ? '?id=' + edition : ''), { method: edition ? 'PUT' : 'POST', body: JSON.stringify(corps) }).then(function (r) {
      bt.disabled = false;
      if (r.ok) { remettre(); charger(); } else montrerErreurs(r);
    }, function () { bt.disabled = false; });
  });
  charger();
});
