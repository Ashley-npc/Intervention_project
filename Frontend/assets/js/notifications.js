// Notifications de l'utilisateur connecte (tous les roles) : alertes critiques en tete, lu / non lu, preference de communication.
Shell.demarrer(function (contenu, user) {
  document.title = 'Notifications · Suivi à domicile';
  var CANAUX = { application: 'Dans l\'application', courriel: 'Par courriel', sms: 'Par SMS' };
  function lien(x) {
    if (!x.id_intervention) return String(x.contenu).indexOf('Nouveau message de') === 0 ? FRONT + 'messages/liste.html' : '';
    if (user.role === 'coordinateur') return FRONT + 'interventions/fiche.html?id=' + x.id_intervention;
    if (user.role === 'intervenant') return FRONT + 'espace-intervenant/compte-rendu.html?id=' + x.id_intervention;
    return '';
  }
  contenu.innerHTML = '<div class="page-head"><div><h1>Notifications</h1><p id="compte"></p></div><button type="button" class="btn" id="tout">Tout marquer comme lu</button></div>' +
    '<section class="card"><header><h2>Comment être prévenu ?</h2></header><div class="toolbar"><select id="pref" aria-label="Canal préféré"></select><span class="muted" id="pref-msg"></span></div>' +
    '<p class="muted">Toutes vos notifications restent visibles ici. Avec « courriel » ou « SMS », elles sont aussi préparées pour l\'envoi : l\'envoi réel sera activé quand la structure aura branché une messagerie. Les alertes critiques apparaissent toujours en premier.</p></section>' +
    '<section class="card"><div class="table-wrap stack" id="zone"><p class="empty">Chargement…</p></div></section>';
  var pref = document.getElementById('pref'), i;
  for (var k in CANAUX) pref.innerHTML += '<option value="' + k + '">' + CANAUX[k] + '</option>';
  function charger() {
    appel('notifications.php').then(function (r) {
      var z = document.getElementById('zone');
      if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var it = r.data.items; pref.value = r.data.preference;
      document.getElementById('compte').textContent = r.data.non_lues + ' non lue' + (r.data.non_lues > 1 ? 's' : '') + ' sur ' + it.length;
      document.getElementById('tout').hidden = !r.data.non_lues;
      if (!it.length) { z.innerHTML = '<p class="empty">Aucune notification pour le moment.</p>'; return; }
      var h = '<table><thead><tr><th>Date</th><th>Notification</th><th>Envoi</th><th></th></tr></thead><tbody>';
      for (i = 0; i < it.length; i++) {
        var x = it[i], l = lien(x);
        h += '<tr' + (x.lue ? ' class="off"' : '') + '><td data-l="Date">' + dateFr(x.date_envoi) + ' ' + esc(String(x.date_envoi).slice(11, 16)) + '</td><td data-l="Notification">' +
             (x.critique ? '<span class="badge danger">Critique</span> ' : '') + (x.lue ? '' : '<b>') + esc(x.contenu) + (x.lue ? '' : '</b>') + '</td>' +
             '<td data-l="Envoi">' + (x.statut_envoi === 'a_envoyer' ? '<span class="badge warn">' + esc(CANAUX[x.canal] || x.canal) + ' (à envoyer)</span>' : '<span class="badge grey">Application</span>') + '</td>' +
             '<td class="actions">' + (l ? btnIco('ouvrir', 'Ouvrir', 'href="' + l + '" data-lu="' + x.id + '"', 'a') : '') +
             btnIco(x.lue ? 'nonlue' : 'lue', x.lue ? 'Marquer comme non lue' : 'Marquer comme lue', 'data-id="' + x.id + '" data-lue="' + (x.lue ? 0 : 1) + '"') + '</td></tr>';
      }
      z.innerHTML = h + '</tbody></table>';
    });
  }
  pref.addEventListener('change', function () {
    appel('notifications.php', { method: 'PUT', body: JSON.stringify({ preference: pref.value }) }).then(function (r) {
      var m = document.getElementById('pref-msg'); m.textContent = r.ok ? 'Préférence enregistrée.' : (r.data.message || 'Erreur.');
    });
  });
  document.getElementById('tout').addEventListener('click', function () {
    appel('notifications.php', { method: 'PUT', body: JSON.stringify({ toutes_lues: true }) }).then(function () { location.reload(); });
  });
  contenu.addEventListener('click', function (e) {
    var t = e.target, id = t.getAttribute && t.getAttribute('data-id');
    if (id) { appel('notifications.php?id=' + id, { method: 'PUT', body: JSON.stringify({ lue: t.getAttribute('data-lue') === '1' }) }).then(charger); return; }
    var lu = t.getAttribute && t.getAttribute('data-lu');   // « Ouvrir » : on la marque lue puis on suit le lien
    if (lu) { e.preventDefault(); var href = t.href; appel('notifications.php?id=' + lu, { method: 'PUT', body: JSON.stringify({ lue: true }) }).then(function () { location.href = href; }); }
  });
  charger();
});
