// Suivi de la facturation : interventions pas encore facturees (par beneficiaire) et factures pas encore payees.
Shell.demarrer(function (contenu) {
  document.title = 'À facturer · Suivi à domicile';
  var onglet = param('onglet') === 'payer' ? 'payer' : 'facturer', data = null;
  contenu.innerHTML = '<div class="page-head"><div><h1>Suivi de la facturation</h1><p id="compte"></p></div><a class="btn" href="' + FRONT + 'facturation/nouvelle.html">+ Nouvelle facture</a></div>' +
    '<section class="card"><div class="toolbar"><button type="button" class="btn small onglet" data-o="facturer">Pas encore facturées</button><button type="button" class="btn small onglet" data-o="payer">Pas encore payées</button></div>' +
    '<div id="zone"><p class="empty">Chargement…</p></div></section>';
  function pluriel(n, mot) { return n + ' ' + mot + (n > 1 ? 's' : ''); }
  function afficher() {
    var bs = document.querySelectorAll('.onglet'), z = document.getElementById('zone'), h = '', i;
    for (i = 0; i < bs.length; i++) {
      var o = bs[i].getAttribute('data-o');
      bs[i].className = 'btn small onglet' + (o === onglet ? ' actif' : '');
      bs[i].textContent = (o === 'facturer' ? 'Pas encore facturées' : 'Pas encore payées') + ' (' + (o === 'facturer' ? data.a_facturer.length : data.non_payees.length) + ')';
    }
    if (onglet === 'facturer') {
      var a = data.a_facturer, nb = 0;
      for (i = 0; i < a.length; i++) nb += a[i].nb;
      document.getElementById('compte').textContent = pluriel(nb, 'intervention') + ' à facturer, ' + pluriel(a.length, 'bénéficiaire');
      if (!a.length) { z.innerHTML = '<p class="empty">Toutes les interventions validées sont facturées.</p>'; return; }
      for (i = 0; i < a.length; i++) {
        var x = a[i], lien = FRONT + 'facturation/nouvelle.html?id_beneficiaire=' + x.id + '&du=' + x.premiere + '&au=' + x.derniere;
        h += persHtml({ titre: x.prenom + ' ' + x.nom, lien: lien, infos: [pluriel(x.nb, 'intervention'), x.premiere === x.derniere ? dateFr(x.premiere) : 'du ' + dateFr(x.premiere) + ' au ' + dateFr(x.derniere)],
                        action: btnIco('n_nouvelle', 'Créer la facture', 'href="' + lien + '"', 'a') });
      }
    } else {
      var p = data.non_payees, reste = 0;
      for (i = 0; i < p.length; i++) reste += p[i].restant;
      document.getElementById('compte').textContent = pluriel(p.length, 'facture') + ' non payée' + (p.length > 1 ? 's' : '') + ' · reste ' + argent(Math.round(reste * 100) / 100);
      if (!p.length) { z.innerHTML = '<p class="empty">Toutes les factures sont payées.</p>'; return; }
      for (i = 0; i < p.length; i++) {
        var f = p[i];
        h += factureCarte({ id: f.id, numero: f.numero, benef: f.prenom + ' ' + f.nom, statut: f.statut, total: f.montant_total, restant: f.restant, date: f.date_emission, retard: f.retard });
      }
    }
    z.innerHTML = railHtml(h); railInit();
  }
  contenu.addEventListener('click', function (e) {
    var o = e.target.getAttribute && e.target.getAttribute('data-o');
    if (o && data) { onglet = o; afficher(); }
  });
  appel('a-facturer.php').then(function (r) {
    if (!r.ok) { document.getElementById('zone').innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
    data = r.data; afficher();
  });
});
