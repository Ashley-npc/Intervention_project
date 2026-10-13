// Journal d'audit : qui a fait quoi et quand (lecture seule). Administrateur, direction, responsable qualite.
Shell.demarrer(function (contenu) {
  document.title = 'Journal · Suivi à domicile';
  var ACTIONS = { connexion: 'Connexion', creation: 'Création', modification: 'Modification', annulation: 'Annulation', validation: 'Validation',
    activation: 'Activation', desactivation: 'Désactivation', reinitialisation_mdp: 'Mot de passe réinitialisé' };
  contenu.innerHTML = '<div class="page-head"><div><h1>Journal d\'audit</h1><p id="compte"></p></div></div>' +
    '<section class="card"><div class="toolbar"><input type="text" id="q" placeholder="Utilisateur, objet ou détail" aria-label="Rechercher">' +
    '<select id="action" aria-label="Action"><option value="">Toutes les actions</option></select>' +
    '<input type="date" id="du" aria-label="Du"><input type="date" id="au" aria-label="Au"></div>' +
    '<div class="table-wrap stack" id="zone"><p class="empty">Chargement…</p></div></section>';
  var q = document.getElementById('q'), act = document.getElementById('action'), du = document.getElementById('du'), au = document.getElementById('au'), minuteur, dernier = 0, rempli = false;
  function charger() {
    var n = ++dernier;
    appel('journal.php?q=' + encodeURIComponent(q.value) + '&action=' + encodeURIComponent(act.value) + '&du=' + du.value + '&au=' + au.value).then(function (r) {
      if (n !== dernier) return;
      var z = document.getElementById('zone');
      if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      if (!rempli) {
        var o = '';
        for (var k = 0; k < r.data.actions.length; k++) o += '<option value="' + esc(r.data.actions[k]) + '">' + esc(ACTIONS[r.data.actions[k]] || r.data.actions[k]) + '</option>';
        act.insertAdjacentHTML('beforeend', o); rempli = true;
      }
      var it = r.data.items;
      document.getElementById('compte').textContent = it.length + ' ligne' + (it.length > 1 ? 's' : '') + (it.length === 200 ? ' (les 200 plus récentes)' : '');
      if (!it.length) { z.innerHTML = '<p class="empty">Aucune action enregistrée.</p>'; return; }
      var h = '<table><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Objet</th><th>Détail</th></tr></thead><tbody>';
      for (var i = 0; i < it.length; i++) {
        var x = it[i];
        h += '<tr><td data-l="Date">' + dateFr(x.date_heure) + ' ' + esc(String(x.date_heure).slice(11, 16)) + '</td><td data-l="Utilisateur"><b>' + esc(x.identifiant) + '</b></td><td data-l="Action">' +
             esc(ACTIONS[x.action] || x.action) + '</td><td data-l="Objet">' + esc(x.entite || '—') + '</td><td data-l="Détail">' + esc(x.detail || '—') + '</td></tr>';
      }
      z.innerHTML = h + '</tbody></table>';
    });
  }
  q.addEventListener('input', function () { clearTimeout(minuteur); minuteur = setTimeout(charger, 250); });
  act.addEventListener('change', charger); du.addEventListener('change', charger); au.addEventListener('change', charger);
  charger();
});
