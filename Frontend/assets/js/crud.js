// Pages liste / fiche / formulaire d'une ressource (voir ressources.js). ES5 volontairement.
(function () {
  var nom = document.body.getAttribute('data-ressource');
  var vue = document.body.getAttribute('data-vue');
  var R = RESSOURCES[nom];
  var contenu;

  function erreurPage(msg) { contenu.innerHTML = '<p class="msg-err">' + esc(msg) + '</p><p><a href="' + R.pages.liste + '">← Retour à la liste</a></p>'; }
  function badgeEtat(inactif) { return inactif ? '<span class="badge grey">' + R.etat.off + '</span>' : ''; }

  // ---------- Liste ----------
  function liste() {
    var F = R.filtres || {}, page = 1, minuteur, dernier = 0, secteurs = [];
    function sel(id, label, opts, vide) {
      var o = vide ? '<option value="">' + vide + '</option>' : '';
      for (var i = 0; i < opts.length; i++) o += '<option value="' + esc(opts[i][0]) + '">' + esc(opts[i][1]) + '</option>';
      return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '">' + o + '</select></div>';
    }
    var filtres = '<div class="field"><label for="q">Recherche</label><input type="text" id="q" placeholder="' + R.recherche + '" aria-label="Rechercher"></div>';
    if (F.etat) filtres += sel('f-etat', 'Statut du dossier', F.etat.options);
    if (F.statut) filtres += sel('f-statut', 'Statut', F.statut, 'Tous');
    if (F.secteur) filtres += '<div class="field"><label for="f-secteur">Secteur</label><select id="f-secteur"><option value="">Tous</option></select></div>';
    if (R.tris) filtres += sel('f-tri', 'Trier par', R.tris) + sel('f-sens', 'Ordre', [['asc', 'Croissant'], ['desc', 'Décroissant']]);
    contenu.innerHTML =
      '<div class="page-head"><div><h1>' + R.titre + '</h1><p id="compte"></p></div><a class="btn" href="' + R.pages.form + '">+ ' + R.nouveau + '</a></div>' +
      '<section class="card"><div class="filtres">' + filtres + '</div>' +
      '<div id="tableau"><p class="empty">Chargement…</p></div><div id="pag"></div></section>';
    function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
    function charger() {
      var n = ++dernier, u = R.api + '?page=' + page + '&q=' + encodeURIComponent(val('q'));
      if (F.etat) u += '&' + F.etat.param + '=' + encodeURIComponent(val('f-etat'));
      if (val('f-statut')) u += '&statut=' + encodeURIComponent(val('f-statut'));
      if (val('f-secteur')) u += '&id_secteur=' + encodeURIComponent(val('f-secteur'));
      if (R.tris) u += '&tri=' + encodeURIComponent(val('f-tri')) + '&sens=' + encodeURIComponent(val('f-sens'));
      appel(u).then(function (r) {
        if (n !== dernier) return;
        if (!r.ok) { document.getElementById('tableau').innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
        var items = r.data.items, meta = r.data.meta, h = '';
        page = meta.page;
        document.getElementById('compte').textContent = meta.total + ' résultat' + (meta.total > 1 ? 's' : '');
        document.getElementById('pag').innerHTML = pagination(meta);
        if (!items.length) { document.getElementById('tableau').innerHTML = '<p class="empty">Aucun ' + R.singulier + ' trouvé.</p>'; return; }
        h = '';
        for (var i = 0; i < items.length; i++) {
          var x = items[i];
          var infos = [], cote = '';
          for (var c = 0; c < R.colonnes.length; c++) {
            var col = R.colonnes[c]; if (col.k === 'nom') continue;
            var v = col.f ? col.f(x) : x[col.k];
            if (v === null || v === undefined || v === '') { if (col.k.indexOf('nb_') === 0) v = '0'; else continue; }
            if (col.cote) { cote = (col.court ? col.court + ' ' : '') + esc(v); continue; }   // ex. l'age : sur la ligne du nom, a droite
            infos.push((col.etiq ? '<span class="et">' + (col.court || col.l + ' :') + '</span> ' : '') + esc(v));   // seules les colonnes « etiq » gardent leur titre (les autres sont evidentes)
          }
          h += persHtml({ titre: R.nomComplet(x), lien: R.pages.fiche + '?id=' + x.id, off: x.inactif, badges: badgeEtat(x.inactif), cote: cote, infos: infos.length ? infos : ['—'],
                          action: btnIco('ouvrir', 'Ouvrir', 'href="' + R.pages.fiche + '?id=' + x.id + '"', 'a') });
        }
        document.getElementById('tableau').innerHTML = railHtml(h);
        railInit(document.getElementById('tableau'));
      });
    }
    function depuisZero() { page = 1; charger(); }
    document.getElementById('q').addEventListener('input', function () { clearTimeout(minuteur); minuteur = setTimeout(depuisZero, 250); });
    ['f-etat', 'f-statut', 'f-secteur', 'f-tri', 'f-sens'].forEach(function (id) { var e = document.getElementById(id); if (e) e.addEventListener('change', depuisZero); });
    lierPagination(document.getElementById('pag'), function (p) { page = p; charger(); window.scrollTo(0, 0); });
    if (F.secteur) appel('secteurs.php').then(function (r) {
      if (!r.ok) return;
      var o = ''; for (var i = 0; i < r.data.items.length; i++) o += '<option value="' + r.data.items[i].id + '">' + esc(r.data.items[i].libelle) + '</option>';
      document.getElementById('f-secteur').insertAdjacentHTML('beforeend', o);
    });
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
        var dl = '<dl class="facts">';
        for (var c = 0; c < sec.champs.length; c++) {
          var ch = sec.champs[c], v = x[ch.k];
          v = ch.aff ? ch.aff(v) : v;
          dl += '<div><dt>' + ch.l + '</dt><dd>' + (v ? esc(v) : '—') + '</dd></div>';
        }
        dl += '</dl>';
        h += sec.repli ? '<section class="card">' + repli('fiche-' + nom + '-' + s, sec.titre, dl) + '</section>' : '<section class="card"><header><h2>' + sec.titre + '</h2></header>' + dl + '</section>';
      }
      if (r.data.interventions) {
      h += '<section class="card"><header><h2>Dernières interventions</h2><span class="muted">' + r.data.a_venir + ' à venir</span></header>';
        var it = r.data.interventions;
        if (!it.length) h += '<p class="empty">Aucune intervention.</p>';
        else {
          h += '<div class="table-wrap stack"><table><thead><tr><th>Date</th><th>Horaire</th><th>Type</th><th>' + (R.autrePersonne === 'intervenant' ? 'Intervenant' : 'Bénéficiaire') +
               '</th><th>Statut</th></tr></thead><tbody>';
          for (var i = 0; i < it.length; i++) {
            var a = it[i];
            h += '<tr><td data-l="Date">' + dateFr(a.date) + '</td><td data-l="Horaire">' + heure(a.heure_debut) + '–' + heure(a.heure_fin) + '</td><td data-l="Type">' + esc(lib(a.type)) +
                 '</td><td data-l="' + (R.autrePersonne === 'intervenant' ? 'Intervenant' : 'Bénéficiaire') + '">' + esc(a[R.autrePersonne + '_prenom'] + ' ' + a[R.autrePersonne + '_nom']) +
                 '</td><td data-l="Statut"><span class="badge">' + esc(lib(a.statut)) + '</span></td></tr>';
          }
          h += '</tbody></table></div>';
        }
        h += '</section>';
      }
      contenu.innerHTML = h;
      if (R.apresFiche) R.apresFiche(x, contenu, r.data);
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
        var grille = '';
        for (var c = 0; c < sec.champs.length; c++) {
          var ch = sec.champs[c], v = x[ch.k] === null || x[ch.k] === undefined ? '' : x[ch.k], t = ch.type || 'text', fid = 'c_' + ch.k;
          grille += '<div class="field' + (ch.large ? ' large' : '') + '"><label for="' + fid + '">' + ch.l + (ch.requis ? ' *' : '') + '</label>';
          if (t === 'select') {
            grille += '<select id="' + fid + '" name="' + ch.k + '">';
            for (var o = 0; o < ch.options.length; o++) grille += '<option value="' + esc(ch.options[o][0]) + '"' + (ch.options[o][0] === v ? ' selected' : '') + '>' + esc(ch.options[o][1]) + '</option>';
            grille += '</select>';
          } else if (t === 'textarea') grille += '<textarea id="' + fid + '" name="' + ch.k + '" rows="3">' + esc(v) + '</textarea>';
          else grille += '<input id="' + fid + '" name="' + ch.k + '" type="' + t + '" value="' + esc(v) + '">';
          grille += (ch.aide && !id ? '<small>' + ch.aide + '</small>' : '') + '<span class="field-err" id="e_' + ch.k + '"></span></div>';
        }
        h += sec.repli ? '<section class="card">' + repli('form-' + nom + '-' + s, sec.titre, '<div class="form-grid">' + grille + '</div>') + '</section>'
                       : '<section class="card"><header><h2>' + sec.titre + '</h2></header><div class="form-grid">' + grille + '</div></section>';
      }
      if (!id && nom === 'beneficiaires' && moi && moi.role === 'coordinateur') {
        var dmh = '<div class="form-grid">' +
          '<div class="field"><label for="dm_niveau_autonomie">Niveau d\'autonomie</label><select id="dm_niveau_autonomie" name="dm_niveau_autonomie"><option value="">—</option><option value="autonome">Autonome</option><option value="partielle">Aide partielle</option><option value="dependant">Dépendant</option></select></div>';
        var dm = [['allergies', 'Allergies'], ['pathologies', 'Pathologies'], ['traitements', 'Traitements'], ['observations', 'Observations (internes)']];
        for (var q = 0; q < dm.length; q++) dmh += '<div class="field large"><label for="dm_' + dm[q][0] + '">' + dm[q][1] + '</label><textarea id="dm_' + dm[q][0] + '" name="dm_' + dm[q][0] + '" rows="2" maxlength="2000"></textarea></div>';
        h += '<section class="card">' + repli('form-dossier-medical', 'Dossier médical', dmh + '</div>', '<span class="badge grey">Confidentiel · facultatif</span>') + '</section>';
      }
      contenu.innerHTML = h + '<div class="actions"><button class="btn" type="submit" id="ok">Enregistrer</button></div></form>';
      document.getElementById('f').addEventListener('submit', envoyer);
    }
    function envoyer(e) {
      e.preventDefault();
      var corps = {}, champs = document.getElementById('f').elements, i, b = document.getElementById('ok');
      for (i = 0; i < champs.length; i++) if (champs[i].name && (id || champs[i].value !== '')) corps[champs[i].name] = champs[i].value;   // création : les champs vides sont omis
      var dossier = {}, rempli = false;
      for (var k0 in corps) if (k0.indexOf('dm_') === 0) { if (corps[k0] !== '') { dossier[k0.slice(3)] = corps[k0]; rempli = true; } delete corps[k0]; }
      var spans = document.querySelectorAll('.field-err'); for (i = 0; i < spans.length; i++) spans[i].textContent = '';
      document.getElementById('msg').hidden = true;
      b.disabled = true;
      appel(R.api + (id ? '?id=' + encodeURIComponent(id) : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(corps) }).then(function (r) {
        if (r.ok) {
          var nid = r.data.id || id, ir = function () { location.href = R.pages.fiche + '?id=' + nid; };
          if (!id && rempli) appel('dossier-medical.php?id_beneficiaire=' + encodeURIComponent(nid), { method: 'PUT', body: JSON.stringify(dossier) }).then(ir, ir); else ir();
          return;
        }
        b.disabled = false;
        var m = document.getElementById('msg'); m.textContent = r.data.message || 'Erreur.'; m.hidden = false;
        var er = r.data.erreurs || {};
        for (var k in er) { var s = document.getElementById('e_' + k); if (s) { s.textContent = er[k]; s.parentNode.className += ' invalide'; } }
        ouvrirErreurs();
        window.scrollTo(0, 0);
      }, function () { b.disabled = false; });
    }
    if (!id) { dessiner({}); return; }
    appel(R.api + '?id=' + encodeURIComponent(id)).then(function (r) { if (r.ok) dessiner(r.data.item); else erreurPage(r.data.message || 'Erreur.'); });
  }

  var moi = null;
  Shell.demarrer(function (c, u) {
    contenu = c; moi = u;
    document.title = R.titre + ' · Suivi à domicile';
    if (vue === 'liste') liste(); else if (vue === 'fiche') fiche(); else formulaire();
  });
})();
