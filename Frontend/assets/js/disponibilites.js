// Disponibilites hebdomadaires (semaine type). Sans creneau : aucune contrainte. Avec des creneaux : une intervention doit entrer dans l'un d'eux.
Shell.demarrer(function (contenu, user) {
  document.title = 'Disponibilités · Suivi à domicile';
  var gestion = user.role !== 'intervenant', idV = Number(param('id')) || 0, creneaux = [];
  var NOMS_J = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  function charger() {
    appel('disponibilites.php' + (gestion && idV ? '?id_intervenant=' + idV : '')).then(function (r) {
      if (!r.ok) {
        if (gestion && r.status === 404) { choix(); return; }
        Shell.erreur(contenu, r.data.message || 'Erreur.'); return;
      }
      idV = r.data.id_intervenant; creneaux = r.data.creneaux; dessiner(r.data);
    });
  }
  // Coordinateur sans intervenant choisi : liste a choisir.
  function choix() {
    appel('absences.php').then(function (r) {
      var o = '<option value="">— choisir un intervenant —</option>', l = (r.data && r.data.intervenants) || [];
      for (var i = 0; i < l.length; i++) o += '<option value="' + l[i].id + '">' + esc(l[i].prenom + ' ' + l[i].nom) + '</option>';
      contenu.innerHTML = '<div class="page-head"><div><h1>Disponibilités</h1><p>Semaine type d\'un intervenant.</p></div></div><section class="card"><div class="field"><label for="c_iv">Intervenant</label><select id="c_iv">' + o + '</select></div></section>';
      document.getElementById('c_iv').onchange = function () { if (this.value) { idV = Number(this.value); history.replaceState(null, '', '?id=' + idV); charger(); } };
    });
  }
  function dessiner(d) {
    var h = '<div class="page-head"><div><h1>' + (gestion ? 'Disponibilités · ' + esc(d.intervenant) : 'Mes disponibilités') + '</h1><p>' + (gestion ? 'Semaine type de l\'intervenant. ' : 'Votre semaine type. ') +
      'Sans créneau, aucune contrainte ; avec des créneaux, une intervention doit entrer dans l\'un d\'eux (les urgences peuvent y déroger).</p></div>' +
      (gestion ? '<select id="c_iv" aria-label="Intervenant">' + (d.intervenants || []).map(function (v) { return '<option value="' + v.id + '"' + (v.id === d.id_intervenant ? ' selected' : '') + '>' + esc(v.prenom + ' ' + v.nom) + '</option>'; }).join('') + '</select>' : '') + '</div>' +
      '<p class="msg-err" id="msg" hidden></p><p class="msg-ok" id="info" hidden></p><section class="card"><div class="semaine" id="sem">';
    for (var j = 1; j <= 7; j++) h += '<div class="jsem" data-j="' + j + '"><div class="jsem-t"><b>' + NOMS_J[j] + '</b><button type="button" class="btn small secondary" data-add="' + j + '">+ Créneau</button></div><div class="jsem-l"></div></div>';
    h += '</div><div class="actions"><button class="btn" type="button" id="ok">Enregistrer</button><button class="btn secondary" type="button" id="vider">Tout effacer (aucune contrainte)</button></div></section><div id="hors"></div>';
    contenu.innerHTML = h;
    rendre();
    if (gestion) document.getElementById('c_iv').onchange = function () { idV = Number(this.value); history.replaceState(null, '', '?id=' + idV); charger(); };
  }
  function ligne(c) {
    return '<div class="cren"><input type="time" value="' + esc(c.debut) + '" data-k="debut" aria-label="Début"><span>à</span><input type="time" value="' + esc(c.fin) + '" data-k="fin" aria-label="Fin">' + btnIco('retirer', 'Retirer ce créneau', 'data-del') + '</div>';
  }
  function rendre() {
    var jours = document.querySelectorAll('.jsem');
    for (var i = 0; i < jours.length; i++) {
      var j = Number(jours[i].getAttribute('data-j')), h = '';
      creneaux.forEach(function (c) { if (c.jour === j) h += ligne(c); });
      jours[i].querySelector('.jsem-l').innerHTML = h || '<span class="muted">Aucun créneau</span>';
    }
  }
  function lire() {   // relit les champs de l'ecran
    var res = [], jours = document.querySelectorAll('.jsem');
    for (var i = 0; i < jours.length; i++) {
      var j = Number(jours[i].getAttribute('data-j')), l = jours[i].querySelectorAll('.cren');
      for (var k = 0; k < l.length; k++) { var ch = l[k].querySelectorAll('input'); res.push({ jour: j, debut: ch[0].value, fin: ch[1].value }); }
    }
    return res;
  }
  function msg(t, ok) { var e = document.getElementById('msg'), f = document.getElementById('info'); e.hidden = ok || !t; f.hidden = !ok || !t; (ok ? f : e).textContent = t || ''; }
  contenu.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-add],[data-del],#ok,#vider') : null; if (!t) return;
    if (t.hasAttribute('data-add')) { creneaux = lire(); var j = Number(t.getAttribute('data-add')); creneaux.push({ jour: j, debut: j >= 6 ? '08:00' : '08:00', fin: '12:00' }); rendre(); }
    else if (t.hasAttribute('data-del')) { var c = t.closest('.cren'); c.parentNode.removeChild(c); creneaux = lire(); rendre(); }
    else if (t.id === 'vider') { if (window.confirm('Effacer toute la semaine ? L\'intervenant ne sera plus soumis à aucune contrainte de disponibilité.')) { creneaux = []; rendre(); } }
    else if (t.id === 'ok') {
      msg(''); t.disabled = true;
      appel('disponibilites.php' + (gestion ? '?id_intervenant=' + idV : ''), { method: 'PUT', body: JSON.stringify({ creneaux: lire() }) }).then(function (r) {
        t.disabled = false;
        if (!r.ok) { msg(r.data.message || 'Erreur.'); window.scrollTo(0, 0); return; }
        creneaux = r.data.creneaux; rendre(); msg('Disponibilités enregistrées.', true);
        var z = document.getElementById('hors'), l = r.data.hors_creneaux || [];
        if (!l.length) { z.innerHTML = ''; return; }
        var h = '<section class="card"><header><h2>Interventions prévues en dehors des créneaux</h2><span class="badge danger">' + l.length + '</span></header><p class="muted">Elles restent planifiées : à déplacer ou à réaffecter.</p><ul class="alerts">';
        l.forEach(function (x) { h += '<li><a href="' + FRONT + 'interventions/' + (gestion ? 'fiche.html' : '../espace-intervenant/compte-rendu.html') + '?id=' + x.id + '"><b>' + dateFr(x.date) + ' ' + x.heure_debut + '–' + x.heure_fin + '</b> · ' + esc(x.beneficiaire_prenom + ' ' + x.beneficiaire_nom) + '</a></li>'; });
        z.innerHTML = h + '</ul></section>';
      }, function () { t.disabled = false; });
    }
  });
  charger();
});
