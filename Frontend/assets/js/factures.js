// Liste des factures (service facturation, administrateur) : recherche, filtre par statut, cartes avec défilement vers le bas.
Shell.demarrer(function (contenu) {
  document.title = 'Factures · Suivi à domicile';
  contenu.innerHTML = '<div class="page-head"><div><h1>Factures</h1><p id="compte"></p></div><a class="btn" href="' + FRONT + 'facturation/nouvelle.html">+ Nouvelle facture</a></div>' +
    '<section class="card"><div class="toolbar"><input type="text" id="q" placeholder="N° de facture ou bénéficiaire" aria-label="Rechercher">' +
    '<select id="statut" aria-label="Statut"><option value="">Tous les statuts</option><option value="emise">Émises</option><option value="relancee">Relancées</option><option value="impayee">Impayées</option><option value="payee">Payées</option></select></div>' +
    '<div id="zone"><p class="empty">Chargement…</p></div></section>';
  var q = document.getElementById('q'), st = document.getElementById('statut'), minuteur, dernier = 0;
  st.value = param('statut');
  function charger() {
    var n = ++dernier;
    appel('factures.php?q=' + encodeURIComponent(q.value) + '&statut=' + st.value).then(function (r) {
      if (n !== dernier) return;
      var z = document.getElementById('zone');
      if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var it = r.data.items, h = '', tot = 0;
      document.getElementById('compte').textContent = it.length + ' facture' + (it.length > 1 ? 's' : '');
      if (!it.length) { z.innerHTML = '<p class="empty">Aucune facture.</p>'; return; }
      for (var i = 0; i < it.length; i++) {
        var f = it[i]; tot += f.restant;
        h += factureCarte({ id: f.id, numero: f.numero, benef: f.beneficiaire_prenom + ' ' + f.beneficiaire_nom, statut: f.statut, total: f.montant_total, restant: f.restant });
      }
      z.innerHTML = railHtml(h); railInit();
    });
  }
  q.addEventListener('input', function () { clearTimeout(minuteur); minuteur = setTimeout(charger, 250); });
  st.addEventListener('change', charger);
  charger();
});
