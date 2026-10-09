// Pages liste / fiche / formulaire d'une ressource (voir ressources.js). ES5 volontairement.
(function () {
  var nom = document.body.getAttribute('data-ressource');
  var vue = document.body.getAttribute('data-vue');
  var R = RESSOURCES[nom];
  var contenu;

  function menu(user) {
    var liens = [
      ['Tableau de bord', PAGES[user.role], ''], ['Planning', '#', 'soon'],
      ['Bénéficiaires', RESSOURCES.beneficiaires.pages.liste, 'beneficiaires'],
      ['Intervenants', RESSOURCES.intervenants.pages.liste, 'intervenants'], ['Comptes rendus', '#', 'soon']];
    var h = '';
    for (var i = 0; i < liens.length; i++) {
      var cur = liens[i][2] === nom ? ' aria-current="page"' : '';
      h += '<a href="' + liens[i][1] + '"' + cur + (liens[i][2] === 'soon' ? ' class="soon" title="Bientôt"' : '') + '><span class="dot"></span>' + liens[i][0] + '</a>';
    }
    return h;
  }
  function coque(user) {
    document.body.innerHTML =
      '<div class="app"><aside class="sidebar"><div class="brand">Suivi à domicile<small>' + esc(user.role) + '</small></div>' +
      '<nav class="nav" aria-label="Menu principal">' + menu(user) + '</nav></aside>' +
      '<div class="main"><header class="topbar"><span></span><div class="user"><div class="avatar">' + esc(user.identifiant.slice(0, 2).toUpperCase()) +
      '</div><div class="who">' + esc(user.identifiant) + '<span>' + esc(user.role) + '</span></div>' +
      '<a class="btn small" href="login.html" data-logout>Déconnexion</a></div></header><main class="content" id="contenu"></main></div></div>';
    contenu = document.getElementById('contenu');
    window.initTiroir();
  }
  function erreurPage(msg) { contenu.innerHTML = '<p class="msg-err">' + esc(msg) + '</p><p><a href="' + R.pages.liste + '">← Retour à la liste</a></p>'; }
  function badgeEtat(inactif) { return inactif ? '<span class="badge grey">' + R.etat.off + '</span>' : ''; }

  // ---------- Liste ----------
  function liste() {
    contenu.innerHTML =
      '<div class="page-head"><div><h1>' + R.titre + '</h1><p id="compte"></p></div><a class="btn" href="' + R.pages.form + '">+ ' + R.nouveau + '</a></div>' +
      '<section class="card"><div class="toolbar"><input type="text" id="q" placeholder="' + R.recherche + '" aria-label="Rechercher">' +
      '<label class="chk"><input type="checkbox" id="tous"> ' + R.etat.voirTous + '</label></div>' +
      '<div id="tableau"><p class="empty">Chargement…</p></div></section>';
    var q = document.getElementById('q'), tous = document.getElementById('tous'), minuteur, dernier = 0;
    function charger() {
      var n = ++dernier;
      appel(R.api + '?q=' + encodeURIComponent(q.value) + (tous.checked ? '&tous=1' : '')).then(function (r) {
        if (n !== dernier) return;
        if (!r.ok) { document.getElementById('tableau').innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
        var items = r.data.items, h = '';
        document.getElementById('compte').textContent = items.length + ' résultat' + (items.length > 1 ? 's' : '');
        if (!items.length) { document.getElementById('tableau').innerHTML = '<p class="empty">Aucun ' + R.singulier + ' trouvé.</p>'; return; }
        h = '<div class="rail-nav"><button type="button" class="btn small" id="prec" aria-label="Précédents">‹</button>' +
          '<span class="muted">Faites défiler pour voir la suite</span><button type="button" class="btn small" id="suiv" aria-label="Suivants">›</button></div><div class="rail" id="rail">';
        for (var i = 0; i < items.length; i++) {
          var x = items[i];
          h += '<article class="pers' + (x.inactif ? ' off' : '') + '"><h3><a href="' + R.pages.fiche + '?id=' + x.id + '">' + esc(R.nomComplet(x)) + '</a></h3>' + badgeEtat(x.inactif) + '<dl>';
          for (var c = 0; c < R.colonnes.length; c++) {
            var col = R.colonnes[c]; if (col.k === 'nom') continue;
            var v = col.f ? col.f(x) : x[col.k];
            h += '<div><dt>' + col.l + '</dt><dd>' + (v === null || v === '' ? '—' : esc(v)) + '</dd></div>';
          }
          h += '</dl><a class="btn small" href="' + R.pages.fiche + '?id=' + x.id + '">Ouvrir</a></article>';
        }
        document.getElementById('tableau').innerHTML = h + '</div>';
        var rail = document.getElementById('rail');
        document.getElementById('prec').addEventListener('click', function () { rail.scrollLeft -= rail.clientWidth; });
        document.getElementById('suiv').addEventListener('click', function () { rail.scrollLeft += rail.clientWidth; });
      });
    }
    q.addEventListener('input', function () { clearTimeout(minuteur); minuteur = setTimeout(charger, 250); });
    tous.addEventListener('change', charger);
    charger();
  }

  // ---------- Fiche ----------
  function fiche() {
    var id = param('id');
    if (!id) { erreurPage('Identifiant manquant.'); return; }
    appel(R.api + '?id=' + encodeURIComponent(id)).then(function (r) {
      if (!r.ok) { erreurPage(r.data.message || 'Erreur.'); return; }
      var x = r.data.item, h = '';
      h += '<div class="page-head"><div><h1>' + esc(R.nomComplet(x)) + ' ' + badgeEtat(x.inactif) + '</h1><p><a href="' + R.pages.liste + '">← ' + R.titre + '</a></p></div>' +
        '<div class="actions"><a class="btn" href="' + R.pages.form + '?id=' + x.id + '">Modifier</a>' +
        '<button type="button" class="btn secondary" id="etat">' + (x.inactif ? R.etat.retour : R.etat.action) + '</button></div></div>';
      h += '<p class="msg-err" id="msg" hidden></p>';
      for (var s = 0; s < R.sections.length; s++) {
        var sec = R.sections[s];
        h += '<section class="card"><header><h2>' + sec.titre + '</h2></header><dl class="facts">';
        for (var c = 0; c < sec.champs.length; c++) {
          var ch = sec.champs[c], v = x[ch.k];
          v = ch.aff ? ch.aff(v) : v;
          h += '<div><dt>' + ch.l + '</dt><dd>' + (v ? esc(v) : '—') + '</dd></div>';
        }
        h += '</dl></section>';
      }
      h += '<section class="card"><header><h2>Dernières interventions</h2><span class="muted">' + r.data.a_venir + ' à venir</span></header>';
      var it = r.data.interventions;
      if (!it.length) h += '<p class="empty">Aucune intervention.</p>';
      else {
        h += '<div class="table-wrap stack"><table><thead><tr><th>Date</th><th>Horaire</th><th>Type</th><th>' + (R.autrePersonne === 'intervenant' ? 'Intervenant' : 'Bénéficiaire') +
          '</th><th>Statut</th></tr></thead><tbody>';
        for (var i = 0; i < it.length; i++) {
          var a = it[i];
          h += '<tr><td data-l="Date">' + dateFr(a.date) + '</td><td data-l="Horaire">' + heure(a.heure_debut) + '–' + heure(a.heure_fin) + '</td><td data-l="Type">' + esc(a.type) +
            '</td><td data-l="' + (R.autrePersonne === 'intervenant' ? 'Intervenant' : 'Bénéficiaire') + '">' + esc(a[R.autrePersonne + '_prenom'] + ' ' + a[R.autrePersonne + '_nom']) +
            '</td><td data-l="Statut"><span class="badge">' + esc(a.statut) + '</span></td></tr>';
        }
        h += '</tbody></table></div>';
      }
      contenu.innerHTML = h + '</section>';
      document.getElementById('etat').addEventListener('click', function () {
        var vers = !x.inactif, msg;
        if (vers) {
          msg = R.etat.action + ' ' + R.nomComplet(x) + ' ?' + (r.data.a_venir > 0 ? '\n\nAttention : ' + r.data.a_venir + ' intervention(s) à venir sont encore prévues.' : '') + '\n\nLes données sont conservées.';
        } else msg = R.etat.retour + ' ' + R.nomComplet(x) + ' ?';
        if (!window.confirm(msg)) return;
        appel(R.api + '?id=' + x.id, { method: 'PUT', body: JSON.stringify({ inactif: vers }) }).then(function (r2) {
          if (r2.ok) location.reload();
          else { var m = document.getElementById('msg'); m.textContent = r2.data.message || 'Erreur.'; m.hidden = false; }
        });
      });
    });
  }

  // ---------- Formulaire (création et modification) ----------
  function formulaire() {
    var id = param('id');
    function dessiner(x) {
      var h = '<div class="page-head"><div><h1>' + (id ? 'Modifier ' + esc(R.nomComplet(x)) : R.nouveau) + '</h1><p><a href="' + (id ? R.pages.fiche + '?id=' + id : R.pages.liste) + '">← Annuler</a></p></div></div>' +
        '<form id="f" novalidate><p class="msg-err" id="msg" hidden></p>';
      for (var s = 0; s < R.sections.length; s++) {
        var sec = R.sections[s];
        h += '<section class="card"><header><h2>' + sec.titre + '</h2></header><div class="form-grid">';
        for (var c = 0; c < sec.champs.length; c++) {
          var ch = sec.champs[c], v = x[ch.k] === null || x[ch.k] === undefined ? '' : x[ch.k], t = ch.type || 'text', fid = 'c_' + ch.k;
          h += '<div class="field' + (ch.large ? ' large' : '') + '"><label for="' + fid + '">' + ch.l + (ch.requis ? ' *' : '') + '</label>';
          if (t === 'select') {
            h += '<select id="' + fid + '" name="' + ch.k + '">';
            for (var o = 0; o < ch.options.length; o++) h += '<option value="' + esc(ch.options[o][0]) + '"' + (ch.options[o][0] === v ? ' selected' : '') + '>' + esc(ch.options[o][1]) + '</option>';
            h += '</select>';
          } else if (t === 'textarea') h += '<textarea id="' + fid + '" name="' + ch.k + '" rows="3">' + esc(v) + '</textarea>';
          else h += '<input id="' + fid + '" name="' + ch.k + '" type="' + t + '" value="' + esc(v) + '">';
          h += (ch.aide && !id ? '<small>' + ch.aide + '</small>' : '') + '<span class="field-err" id="e_' + ch.k + '"></span></div>';
        }
        h += '</div></section>';
      }
      contenu.innerHTML = h + '<div class="actions"><button class="btn" type="submit" id="ok">Enregistrer</button></div></form>';
      document.getElementById('f').addEventListener('submit', envoyer);
    }
    function envoyer(e) {
      e.preventDefault();
      var corps = {}, champs = document.getElementById('f').elements, i, b = document.getElementById('ok');
      for (i = 0; i < champs.length; i++) if (champs[i].name && (id || champs[i].value !== '')) corps[champs[i].name] = champs[i].value;   // création : les champs vides sont omis
      var spans = document.querySelectorAll('.field-err'); for (i = 0; i < spans.length; i++) spans[i].textContent = '';
      document.getElementById('msg').hidden = true;
      b.disabled = true;
      appel(R.api + (id ? '?id=' + encodeURIComponent(id) : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(corps) }).then(function (r) {
        if (r.ok) { location.href = R.pages.fiche + '?id=' + (r.data.id || id); return; }
        b.disabled = false;
        var m = document.getElementById('msg'); m.textContent = r.data.message || 'Erreur.'; m.hidden = false;
        var er = r.data.erreurs || {};
        for (var k in er) { var s = document.getElementById('e_' + k); if (s) { s.textContent = er[k]; s.parentNode.className += ' invalide'; } }
        window.scrollTo(0, 0);
      }, function () { b.disabled = false; });
    }
    if (!id) { dessiner({}); return; }
    appel(R.api + '?id=' + encodeURIComponent(id)).then(function (r) { if (r.ok) dessiner(r.data.item); else erreurPage(r.data.message || 'Erreur.'); });
  }

  window.utilisateurPret.then(function (user) {
    coque(user);
    document.title = R.titre + ' · Suivi à domicile';
    if (vue === 'liste') liste(); else if (vue === 'fiche') fiche(); else formulaire();
  });
})();
