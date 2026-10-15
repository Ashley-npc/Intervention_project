// Liste des comptes rendus à valider / des interventions sans compte rendu (coordinateur, administrateur).
Shell.demarrer(function (contenu) {
  document.title = 'Comptes rendus · Suivi à domicile';
  var etat = param('etat') === 'sans' ? 'sans' : 'a_valider';
  contenu.innerHTML = '<div class="page-head"><div><h1>Comptes rendus</h1><p id="compte"></p></div></div><section class="card"><div class="toolbar">' +
    '<button type="button" class="btn small onglet" data-etat="a_valider">À valider</button><button type="button" class="btn small onglet" data-etat="sans">Interventions sans compte rendu</button></div><div id="zone"></div></section>';
  function charger() {
    var bs = document.querySelectorAll('.onglet');
    for (var i = 0; i < bs.length; i++) bs[i].className = 'btn small onglet' + (bs[i].getAttribute('data-etat') === etat ? ' actif' : '');
    appel('comptes-rendus.php?etat=' + etat).then(function (r) {
      var z = document.getElementById('zone');
      if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var items = r.data.items, h = '';
      document.getElementById('compte').textContent = items.length + (etat === 'sans' ? ' sans compte rendu' : ' à valider');
      if (!items.length) { z.innerHTML = '<p class="empty">' + (etat === 'sans' ? 'Toutes les interventions passées ont un compte rendu.' : 'Rien à valider pour le moment.') + '</p>'; return; }
      for (var j = 0; j < items.length; j++) {
        var x = items[j];
        h += persHtml({ titre: x.beneficiaire_prenom + ' ' + x.beneficiaire_nom, badges: badgeStatut(x),
              infos: [dateFr(x.date) + ' ' + x.heure_debut + '–' + x.heure_fin, esc(x.intervenant_prenom + ' ' + x.intervenant_nom), esc(lib(x.type))],
              action: btnIco(etat === 'sans' ? 'ouvrir' : 'lue', etat === 'sans' ? 'Ouvrir' : 'Lire et valider', 'href="' + FRONT + 'interventions/fiche.html?id=' + x.id + '"', 'a') });
      }
      z.innerHTML = railHtml(h); railInit(z);
    });
  }
  contenu.addEventListener('click', function (e) { var b = e.target.getAttribute && e.target.getAttribute('data-etat'); if (b) { etat = b; charger(); } });
  charger();
});
