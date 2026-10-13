// Incidents survenus pendant une intervention : declaration (intervenant, coordinateur, admin) et suivi (qualite, coordinateur, admin).
Shell.demarrer(function (contenu) {
  document.title = 'Incidents · Suivi à domicile';
  var GRAV = { mineur: 'Mineur', important: 'Important', urgent: 'Urgent' }, donnees = null;
  contenu.innerHTML = '<div class="page-head"><div><h1>Incidents</h1><p id="compte"></p></div></div><div id="declarer"></div>' +
    '<section class="card"><div class="toolbar"><select id="filtre" aria-label="Statut"><option value="0">À traiter</option><option value="1">Traités</option><option value="">Tous</option></select></div>' +
    '<div class="table-wrap stack" id="zone"><p class="empty">Chargement…</p></div></section>';
  var filtre = document.getElementById('filtre');
  function formulaire() {
    var z = document.getElementById('declarer');
    if (!donnees.peut_declarer || z.innerHTML) return;
    var o = '<option value="">— choisir —</option>', i, p = param('intervention');
    for (i = 0; i < donnees.interventions.length; i++) {
      var x = donnees.interventions[i];
      o += '<option value="' + x.id + '"' + (String(x.id) === p ? ' selected' : '') + '>' + dateFr(x.date) + ' ' + heure(x.heure_debut) + ' · ' + esc(x.prenom + ' ' + x.nom) + '</option>';
    }
    var g = '<option value="">— choisir —</option>';
    for (i = 0; i < donnees.gravites.length; i++) g += '<option value="' + donnees.gravites[i] + '">' + esc(GRAV[donnees.gravites[i]] || donnees.gravites[i]) + '</option>';
    z.innerHTML = '<section class="card"><header><h2>Déclarer un incident</h2></header><p class="msg-err" id="msg" hidden></p><form id="f" novalidate><div class="form-grid">' +
      '<div class="field"><label for="i_inter">Intervention * <small>(30 derniers jours)</small></label><select id="i_inter">' + o + '</select><span class="field-err" id="e_id_intervention"></span></div>' +
      '<div class="field"><label for="i_grav">Gravité *</label><select id="i_grav">' + g + '</select><span class="field-err" id="e_gravite"></span></div>' +
      '<div class="field large"><label for="i_desc">Description *</label><textarea id="i_desc" rows="3" maxlength="2000"></textarea><span class="field-err" id="e_description"></span></div>' +
      '</div><div class="actions"><button class="btn" type="submit" id="ok">Enregistrer l\'incident</button></div></form></section>';
  }
  function charger() {
    appel('incidents.php' + (filtre.value !== '' ? '?traite=' + filtre.value : '')).then(function (r) {
      var z = document.getElementById('zone');
      if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      donnees = r.data; formulaire();
      var it = r.data.items;
      document.getElementById('compte').textContent = it.length + ' incident' + (it.length > 1 ? 's' : '');
      if (!it.length) { z.innerHTML = '<p class="empty">Aucun incident.</p>'; return; }
      var h = '<table><thead><tr><th>Date</th><th>Bénéficiaire</th><th>Intervenant</th><th>Gravité</th><th>Description</th><th></th></tr></thead><tbody>';
      for (var i = 0; i < it.length; i++) {
        var x = it[i];
        h += '<tr' + (x.traite ? ' class="off"' : '') + '><td data-l="Date">' + dateFr(x.date_heure) + '</td><td data-l="Bénéficiaire"><a href="' + FRONT + 'interventions/fiche.html?id=' + x.id_intervention + '">' + esc(x.b_prenom + ' ' + x.b_nom) + '</a></td>' +
             '<td data-l="Intervenant">' + esc(x.v_prenom + ' ' + x.v_nom) + '</td><td data-l="Gravité"><span class="badge ' + (x.gravite === 'urgent' ? 'danger' : x.gravite === 'important' ? 'warn' : 'grey') + '">' + esc(GRAV[x.gravite] || x.gravite || '—') + '</span></td>' +
             '<td data-l="Description">' + esc(x.description) + '</td><td class="actions">' +
             (x.traite ? '<span class="badge ok">Traité</span> ' : '') +
             (r.data.peut_traiter ? '<button type="button" class="btn small" data-id="' + x.id + '" data-traite="' + (x.traite ? 0 : 1) + '">' + (x.traite ? 'Rouvrir' : 'Marquer traité') + '</button>' : '') + '</td></tr>';
      }
      z.innerHTML = h + '</tbody></table>';
    });
  }
  filtre.addEventListener('change', charger);
  contenu.addEventListener('click', function (e) {
    var id = e.target.getAttribute && e.target.getAttribute('data-id'); if (!id) return;
    appel('incidents.php?id=' + id, { method: 'PUT', body: JSON.stringify({ traite: e.target.getAttribute('data-traite') === '1' }) }).then(function (r) { if (r.ok) charger(); else alert(r.data.message || 'Erreur.'); });
  });
  contenu.addEventListener('submit', function (e) {
    e.preventDefault(); effacerErreurs();
    var b = document.getElementById('ok'); b.disabled = true;
    appel('incidents.php', { method: 'POST', body: JSON.stringify({ id_intervention: Number(document.getElementById('i_inter').value) || 0, gravite: document.getElementById('i_grav').value, description: document.getElementById('i_desc').value }) }).then(function (r) {
      b.disabled = false;
      if (r.ok) { document.getElementById('declarer').innerHTML = ''; filtre.value = '0'; charger(); } else montrerErreurs(r);
    }, function () { b.disabled = false; });
  });
  charger();
});
