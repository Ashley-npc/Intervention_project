// Tarifs horaires par type d'intervention. Un nouveau tarif clôture automatiquement l'ancien.
Shell.demarrer(function (contenu) {
  document.title = 'Tarifs · Suivi à domicile';
  contenu.innerHTML = '<div class="page-head"><div><h1>Tarifs</h1><p>Montant horaire par type d\'intervention (en Ariary).</p></div></div>' +
    '<section class="card"><header><h2>Ajouter un tarif</h2></header><p class="msg-err" id="msg" hidden></p><form id="f" novalidate><div class="form-grid">' +
    '<div class="field"><label for="c_type_intervention">Type *</label><select id="c_type_intervention" name="type_intervention"></select><span class="field-err" id="e_type_intervention"></span></div>' +
    '<div class="field"><label for="c_montant_horaire">Montant horaire (Ar) *</label><input id="c_montant_horaire" name="montant_horaire" type="text" inputmode="decimal"><span class="field-err" id="e_montant_horaire"></span></div>' +
    '<div class="field"><label for="c_date_debut_validite">Valable à partir du *</label><input id="c_date_debut_validite" name="date_debut_validite" type="date" value="' + aujourdhui() + '"><span class="field-err" id="e_date_debut_validite"></span></div></div>' +
    '<div class="actions"><button class="btn" type="submit" id="ok">Ajouter</button></div></form></section>' +
    '<section class="card"><header><h2>Tarifs enregistrés</h2></header><div class="table-wrap stack" id="liste"></div></section>';
  function charger() {
    appel('tarifs.php').then(function (r) {
      if (!r.ok) { document.getElementById('liste').innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var o = '', i;
      for (i = 0; i < r.data.types.length; i++) o += '<option value="' + esc(r.data.types[i]) + '">' + esc(lib(r.data.types[i])) + '</option>';
      document.getElementById('c_type_intervention').innerHTML = o;
      if (!r.data.items.length) { document.getElementById('liste').innerHTML = '<p class="empty">Aucun tarif : ajoutez-en un pour pouvoir facturer.</p>'; return; }
      var h = '<table><thead><tr><th>Type</th><th>Montant / h</th><th>Du</th><th>Au</th></tr></thead><tbody>';
      for (i = 0; i < r.data.items.length; i++) { var t = r.data.items[i]; h += '<tr><td data-l="Type">' + esc(lib(t.type_intervention)) + '</td><td data-l="Montant / h"><b>' + argent(t.montant_horaire) + '</b></td><td data-l="Du">' + dateFr(t.date_debut_validite) + '</td><td data-l="Au">' + (t.date_fin_validite ? dateFr(t.date_fin_validite) : '<span class="badge ok">En cours</span>') + '</td></tr>'; }
      document.getElementById('liste').innerHTML = h + '</tbody></table>';
    });
  }
  document.getElementById('f').addEventListener('submit', function (e) {
    e.preventDefault(); effacerErreurs();
    var corps = {}, ch = this.elements; for (var i = 0; i < ch.length; i++) if (ch[i].name) corps[ch[i].name] = ch[i].value;
    var b = document.getElementById('ok'); b.disabled = true;
    appel('tarifs.php', { method: 'POST', body: JSON.stringify(corps) }).then(function (r) {
      b.disabled = false; if (r.ok) { document.getElementById('c_montant_horaire').value = ''; charger(); } else montrerErreurs(r);
    }, function () { b.disabled = false; });
  });
  charger();
});
