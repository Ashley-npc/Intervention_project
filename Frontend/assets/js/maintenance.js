// État du système (équipe technique, administrateur).
Shell.demarrer(function (contenu) {
  document.title = 'Maintenance · Suivi à domicile';
  contenu.innerHTML = '<div class="page-head"><div><h1>État du système</h1><p id="maj"></p></div><button type="button" class="btn secondary" id="rafraichir">Actualiser</button></div><div id="zone"><p class="empty">Chargement…</p></div>';
  function charger() {
    appel('maintenance.php').then(function (r) {
      var z = document.getElementById('zone');
      if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var d = r.data, s = d.serveur, h = '';
      document.getElementById('maj').textContent = 'Heure du serveur : ' + s.heure;
      h += '<section class="kpis">' +
        '<div class="card kpi"><div><b class="' + (d.base.ok ? '' : 'alerte') + '">' + (d.base.ok ? 'OK' : 'HORS LIGNE') + '</b><span>Base de données (' + d.base.ms + ' ms)</span></div></div>' +
        '<div class="card kpi"><div><b>' + esc(s.php) + '</b><span>Version de PHP</span></div></div>' +
        '<div class="card kpi"><div><b class="' + (s.pdo_mysql ? '' : 'alerte') + '">' + (s.pdo_mysql ? 'Activé' : 'Absent') + '</b><span>Extension pdo_mysql</span></div></div>' +
        '<div class="card kpi"><div><b>' + s.memoire_mo + ' Mo</b><span>Mémoire utilisée · ' + esc(s.fuseau) + '</span></div></div></section>';
      h += '<section class="card"><header><h2>Contrôles de cohérence</h2></header><ul class="alerts">';
      for (var i = 0; i < d.controles.length; i++) {
        var c = d.controles[i], n = c.n, cls = n === null ? 'grey' : (n > 0 ? 'warn' : 'ok');
        h += '<li><span class="badge ' + cls + '">' + (n === null ? '?' : n) + '</span><div><b>' + esc(c.libelle) + '</b><span>' + (n === null ? 'Contrôle impossible (table ou colonne absente ?).' : n > 0 ? 'À examiner.' : 'Rien à signaler.') + '</span></div></li>';
      }
      h += '</ul></section><section class="card"><header><h2>Volumes</h2></header><div class="table-wrap stack"><table><thead><tr><th>Table</th><th>Lignes</th></tr></thead><tbody>';
      for (var j = 0; j < d.tables.length; j++) h += '<tr><td data-l="Table">' + esc(d.tables[j].table) + '</td><td data-l="Lignes">' + (d.tables[j].lignes === null ? '<span class="badge grey">absente</span>' : d.tables[j].lignes) + '</td></tr>';
      z.innerHTML = h + '</tbody></table></div></section>';
    });
  }
  document.getElementById('rafraichir').addEventListener('click', charger);
  charger();
});
