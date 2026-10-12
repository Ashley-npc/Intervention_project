// Fiche d'une facture : lignes, paiements, enregistrement d'un paiement, relance.
Shell.demarrer(function (contenu) {
  var id = param('id'), retour = FRONT + 'facturation/factures.html';
  document.title = 'Facture · Suivi à domicile';
  if (!id) { Shell.erreur(contenu, 'Identifiant manquant.', retour); return; }
  function ligne(l, v) { return '<div><dt>' + l + '</dt><dd>' + (v ? esc(v) : '—') + '</dd></div>'; }
  function champ(nom, libelle, type, extra) { return '<div class="field" data-mode="' + (extra || '') + '"><label for="c_' + nom + '">' + libelle + '</label><input id="c_' + nom + '" name="' + nom + '" type="' + type + '"><span class="field-err" id="e_' + nom + '"></span></div>'; }

  appel('factures.php?id=' + encodeURIComponent(id)).then(function (r) {
    if (!r.ok) { Shell.erreur(contenu, r.data.message || 'Erreur.', retour); return; }
    var f = r.data.item, pays = r.data.paiements, it = r.data.interventions;
    var h = '<div class="page-head"><div><h1>' + esc(f.numero) + '</h1><p><a href="' + retour + '">← Factures</a> · ' + badgeFacture(f.statut) + '</p></div><div class="actions">' +
      (f.statut === 'payee' ? '' : (f.statut === 'relancee' ? '' : '<button type="button" class="btn secondary" data-statut="relancee">Marquer relancée</button>') + (f.statut === 'impayee' ? '' : '<button type="button" class="btn secondary" data-statut="impayee">Marquer impayée</button>')) +
      '</div></div><p class="msg-err" id="msg" hidden></p>' +
      '<section class="card"><header><h2>Résumé</h2></header><dl class="facts">' + ligne('Bénéficiaire', f.beneficiaire_prenom + ' ' + f.beneficiaire_nom) + ligne('Émise le', dateFr(f.date_emission)) +
      ligne('Total', argent(f.montant_total)) + ligne('Déjà payé', argent(f.paye)) + ligne('Reste à payer', argent(f.restant)) + '</dl></section>' +
      '<section class="card"><header><h2>Interventions facturées</h2></header>';
    if (!it.length) h += '<p class="empty">Aucune intervention rattachée.</p>';
    else {
      h += '<div class="table-wrap stack"><table><thead><tr><th>Date</th><th>Horaire</th><th>Type</th><th>Durée</th></tr></thead><tbody>';
      for (var i = 0; i < it.length; i++) h += '<tr><td data-l="Date">' + dateFr(it[i].date) + '</td><td data-l="Horaire">' + heure(it[i].heure_debut) + '–' + heure(it[i].heure_fin) + '</td><td data-l="Type">' + esc(lib(it[i].type)) + '</td><td data-l="Durée">' + (it[i].duree_reelle ? it[i].duree_reelle + ' min' : '—') + '</td></tr>';
      h += '</tbody></table></div>';
    }
    h += '</section><section class="card"><header><h2>Paiements</h2></header>';
    if (!pays.length) h += '<p class="empty">Aucun paiement enregistré.</p>';
    else {
      h += '<div class="table-wrap stack"><table><thead><tr><th>Date</th><th>Montant</th><th>Mode</th><th>Détail</th></tr></thead><tbody>';
      for (var j = 0; j < pays.length; j++) {
        var p = pays[j], d = p.mode === 'espece' ? [p.recu_par && 'Reçu par ' + p.recu_par, p.numero_recu && 'Reçu n° ' + p.numero_recu] :
          p.mode === 'banque' ? [p.nom_banque, p.type_operation, p.reference] : [p.nom_operateur, p.numero_telephone, p.reference_transaction];
        h += '<tr><td data-l="Date">' + dateFr(p.date_paiement) + '</td><td data-l="Montant"><b>' + argent(p.montant) + '</b></td><td data-l="Mode">' + esc(lib(p.mode)) + '</td><td data-l="Détail">' + esc(d.filter(Boolean).join(' · ') || '—') + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</section>';
    if (f.restant > 0) {
      h += '<form id="f" novalidate><section class="card"><header><h2>Enregistrer un paiement</h2></header><p class="msg-err" id="msg2" hidden></p><div class="form-grid">' +
        '<div class="field"><label for="c_date_paiement">Date</label><input id="c_date_paiement" name="date_paiement" type="date" value="' + aujourdhui() + '"><span class="field-err" id="e_date_paiement"></span></div>' +
        '<div class="field"><label for="c_montant">Montant (Ar) — reste ' + argent(f.restant) + '</label><input id="c_montant" name="montant" type="text" inputmode="decimal" value="' + String(f.restant).replace('.', ',') + '"><span class="field-err" id="e_montant"></span></div>' +
        '<div class="field"><label for="c_mode">Mode</label><select id="c_mode" name="mode"><option value="espece">Espèces</option><option value="banque">Banque</option><option value="operateur">Opérateur mobile</option></select></div>' +
        '<div class="field"><label for="c_payeur">Payé par</label><select id="c_payeur" name="payeur"><option value="beneficiaire">Le bénéficiaire</option><option value="organisme">Un organisme</option></select></div>' +
        champ('recu_par', 'Encaissé par', 'text', 'espece') + champ('numero_recu', 'N° de reçu', 'text', 'espece') +
        champ('nom_banque', 'Banque *', 'text', 'banque') + '<div class="field" data-mode="banque"><label for="c_type_operation">Opération *</label><select id="c_type_operation" name="type_operation"><option value="cheque">Chèque</option><option value="virement">Virement</option></select><span class="field-err" id="e_type_operation"></span></div>' + champ('reference', 'Référence', 'text', 'banque') +
        champ('nom_operateur', 'Opérateur * (ex. MVola, Orange Money)', 'text', 'operateur') + champ('numero_telephone', 'Numéro de téléphone', 'tel', 'operateur') + champ('reference_transaction', 'Référence de transaction', 'text', 'operateur') +
        '</div><div class="actions"><button class="btn" type="submit" id="ok">Enregistrer le paiement</button></div></section></form>';
    }
    contenu.innerHTML = h;

    var mode = document.getElementById('c_mode');
    function majMode() {
      var blocs = document.querySelectorAll('[data-mode]');
      for (var k = 0; k < blocs.length; k++) { var m = blocs[k].getAttribute('data-mode'); if (m) blocs[k].hidden = m !== mode.value; }
    }
    if (mode) { mode.addEventListener('change', majMode); majMode(); }
    var form = document.getElementById('f');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault(); effacerErreurs('msg2');
      var corps = { id_facture: Number(id) }, ch = form.elements;
      for (var k = 0; k < ch.length; k++) if (ch[k].name && ch[k].value !== '' && !ch[k].parentNode.hidden) corps[ch[k].name] = ch[k].value;
      var b = document.getElementById('ok'); b.disabled = true;
      appel('paiements.php', { method: 'POST', body: JSON.stringify(corps) }).then(function (r2) {
        if (r2.ok) location.reload(); else { b.disabled = false; montrerErreurs(r2, 'msg2'); }
      }, function () { b.disabled = false; });
    });
    contenu.addEventListener('click', function (e) {
      var s = e.target.getAttribute && e.target.getAttribute('data-statut'); if (!s) return;
      appel('factures.php?id=' + id, { method: 'PUT', body: JSON.stringify({ statut: s }) }).then(function (r2) {
        if (r2.ok) location.reload(); else { var m = document.getElementById('msg'); m.textContent = r2.data.message || 'Erreur.'; m.hidden = false; }
      });
    });
  });
});
