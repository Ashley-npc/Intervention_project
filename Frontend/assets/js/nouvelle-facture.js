// Génération d'une facture : on choisit le bénéficiaire et la période, on voit un aperçu, puis on crée.
Shell.demarrer(function (contenu) {
  document.title = 'Nouvelle facture · Suivi à domicile';
  var debutMois = aujourdhui().slice(0, 8) + '01';
  contenu.innerHTML = '<div class="page-head"><div><h1>Nouvelle facture</h1><p>Seules les interventions réalisées et validées, pas encore facturées, sont reprises.</p></div></div>' +
    '<form id="f" novalidate><section class="card"><p class="msg-err" id="msg" hidden></p><div class="form-grid">' +
    '<div class="field large"><label for="c_id_beneficiaire">Bénéficiaire *</label><select id="c_id_beneficiaire"></select><span class="field-err" id="e_id_beneficiaire"></span></div>' +
    '<div class="field"><label for="c_du">Du *</label><input id="c_du" type="date" value="' + (param('du') || debutMois) + '"><span class="field-err" id="e_du"></span></div>' +
    '<div class="field"><label for="c_au">Au *</label><input id="c_au" type="date" value="' + (param('au') || aujourdhui()) + '"><span class="field-err" id="e_au"></span></div></div>' +
    '<div class="actions"><button class="btn secondary" type="submit" id="apercu">Voir l\'aperçu</button></div></section></form><div id="resultat"></div>';
  appel('factures.php?options=1').then(function (r) {
    var o = '<option value="">— choisir —</option>';
    if (r.ok) for (var i = 0; i < r.data.items.length; i++) o += '<option value="' + r.data.items[i].id + '">' + esc(r.data.items[i].nom + ' ' + r.data.items[i].prenom) + '</option>';
    document.getElementById('c_id_beneficiaire').innerHTML = o;
    if (param('id_beneficiaire')) document.getElementById('c_id_beneficiaire').value = param('id_beneficiaire');
  });
  function corps(extra) { var c = { id_beneficiaire: Number(document.getElementById('c_id_beneficiaire').value) || 0, du: document.getElementById('c_du').value, au: document.getElementById('c_au').value }; for (var k in extra) c[k] = extra[k]; return c; }
  document.getElementById('f').addEventListener('submit', function (e) {
    e.preventDefault(); effacerErreurs();
    var res = document.getElementById('resultat'); res.innerHTML = '';
    appel('factures.php', { method: 'POST', body: JSON.stringify(corps({ apercu: true })) }).then(function (r) {
      if (!r.ok) { montrerErreurs(r); return; }
      var d = r.data, h = '<section class="card"><header><h2>Aperçu</h2></header>';
      if (d.types_sans_tarif.length) h += '<p class="msg-err">Aucun tarif pour : ' + esc(d.types_sans_tarif.map(lib).join(', ')) + '. <a href="' + FRONT + 'facturation/tarifs.html">Ajouter un tarif</a> (ces interventions ne sont pas comptées).</p>';
      if (!d.lignes.length) h += '<p class="empty">Aucune intervention à facturer sur cette période.</p>';
      else {
        h += '<div class="table-wrap stack"><table><thead><tr><th>Date</th><th>Type</th><th>Durée</th><th>Tarif / h</th><th>Montant</th></tr></thead><tbody>';
        for (var i = 0; i < d.lignes.length; i++) { var l = d.lignes[i]; h += '<tr><td data-l="Date">' + dateFr(l.date) + '</td><td data-l="Type">' + esc(lib(l.type)) + '</td><td data-l="Durée">' + l.minutes + ' min</td><td data-l="Tarif / h">' + argent(l.tarif) + '</td><td data-l="Montant">' + argent(l.montant) + '</td></tr>'; }
        h += '</tbody></table></div><p><b>Total : ' + argent(d.total) + '</b></p>';
        if (d.organisme) h += '<p>Pris en charge par <b>' + esc(d.organisme) + '</b> (' + d.taux + ' %) : <b>' + argent(d.part_organisme) + '</b><br>Reste à charge du bénéficiaire : <b>' + argent(d.reste_a_charge) + '</b></p>';
        else h += '<p class="muted">Aucune prise en charge applicable : tout est à la charge du bénéficiaire.</p>';
        if (!d.types_sans_tarif.length) h += '<div class="actions"><button type="button" class="btn" id="creer">Créer la facture</button></div>';
      }
      res.innerHTML = h + '</section>';
      var c = document.getElementById('creer');
      if (c) c.addEventListener('click', function () {
        c.disabled = true;
        appel('factures.php', { method: 'POST', body: JSON.stringify(corps({})) }).then(function (r2) {
          if (r2.ok) location.href = FRONT + 'facturation/facture.html?id=' + r2.data.id; else { c.disabled = false; montrerErreurs(r2); }
        });
      });
    });
  });
});
