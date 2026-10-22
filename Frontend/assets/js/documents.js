// Gestion documentaire : carte réutilisable.
//   Documents.carte(zone, {type: 'beneficiaire'|'intervenant'|'intervention', id})   documents d'une fiche
//   Documents.carte(zone, null)                                                      tous les documents autorisés (page « Documents »)
// Le serveur décide de ce que votre rôle voit et peut faire ; si l'accès est refusé, la carte d'une fiche reste cachée.
var Documents = (function () {
  function catLib(c) { var l = lib(c); return l === c ? c.charAt(0).toUpperCase() + c.slice(1) : l; }
  function taille(n) { return n === null || n === undefined ? '' : n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' Ko' : (n / 1048576).toFixed(1).replace('.', ',') + ' Mo'; }
  function lien(id, mode) { return API + 'documents.php?id=' + id + '&' + mode + '=1'; }
  function envoyer(fd) {
    return fetch(API + 'documents.php', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(function (rep) { return rep.json().catch(function () { return {}; }).then(function (data) { return { status: rep.status, ok: rep.ok, data: data }; }); });
  }
  var FICHES = { beneficiaire: 'beneficiaires/fiche.html?id=', intervenant: 'intervenants/fiche.html?id=', intervention: 'interventions/fiche.html?id=' };

  function carte(zone, cible) {
    var etat = { q: '', categorie: '', archives: false }, options = null, ouverts = {};
    function cherche() {
      var u = 'documents.php?x=1';
      if (cible) u += '&id_' + cible.type + '=' + cible.id;
      if (etat.q) u += '&q=' + encodeURIComponent(etat.q);
      if (etat.categorie) u += '&categorie=' + encodeURIComponent(etat.categorie);
      if (etat.archives) u += '&archives=1';
      return appel(u);
    }
    function boutons(d, peutArchiver, version) {
      var h = '<a class="btn small ic" href="' + lien(d.id, 'telecharger') + '" title="Télécharger" aria-label="Télécharger">' + ico('telecharger') + '</a>';
      if (d.affichable) h = '<a class="btn small ic" href="' + lien(d.id, 'voir') + '" target="_blank" rel="noopener" title="Consulter" aria-label="Consulter">' + ico('voir') + '</a> ' + h;
      if (version) return h;
      if (!d.archive) h += ' ' + btnIco('televerser', 'Nouvelle version', 'data-v="' + d.id + '"');
      if (d.nb_versions > 1) h += ' ' + btnIco('n_disponibilites', 'Historique des versions', 'data-h="' + d.id + '"');
      if (peutArchiver) h += ' ' + (d.archive ? btnIco('reactiver', 'Restaurer', 'data-r="' + d.id + '"') : btnIco('retirer', 'Archiver', 'data-a="' + d.id + '"'));
      return h;
    }
    function ligne(d, peutArchiver) {
      var rat = '';
      if (!cible && d.rattache.type) rat = ' · <a href="' + FRONT + FICHES[d.rattache.type] + d.rattache.id + '">' + esc(d.rattache.libelle) + '</a>';
      return '<li class="doc"><div class="doc-main"><b>' + esc(d.titre) + '</b> <span class="badge grey">v' + d.version + '</span>' + (d.archive ? ' <span class="badge warn">Archivé</span>' : '') +
        '<br><span class="muted">' + esc(catLib(d.categorie)) + rat + ' · ' + esc(d.nom_fichier) + (d.taille ? ' (' + taille(d.taille) + ')' : '') + '</span>' +
        '<br><span class="muted">Déposé le ' + dateFr(d.date_depot) + (d.depose_par ? ' par ' + esc(d.depose_par) : '') + ' · à conserver jusqu\'au ' + dateFr(d.conserver_jusqu_au) +
        (d.echu ? ' <span class="badge warn">Échu</span>' : '') + '</span>' + (d.commentaire ? '<br><span class="muted">« ' + esc(d.commentaire) + ' »</span>' : '') + '</div>' +
        '<div class="doc-acts">' + boutons(d, peutArchiver, false) + '</div><div class="doc-hist" id="hist-' + d.id + '"' + (ouverts[d.id] ? '' : ' hidden') + '></div></li>';
    }
    function formulaire(cats) {
      if (!cats.length) return '';
      var h = '<form id="doc-f" novalidate><h3 class="doc-titre">Déposer un document</h3><p class="msg-err" id="doc-msg" hidden></p><div class="form-grid">' +
        '<div class="field large"><label for="doc_fichier">Fichier * <small>(PDF, JPG, PNG, DOC, DOCX, ODT — 5 Mo maximum)</small></label><input id="doc_fichier" name="fichier" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.odt"><span class="field-err" id="e_fichier"></span></div>' +
        '<div class="field"><label for="doc_categorie">Catégorie *</label><select id="doc_categorie" name="categorie">';
      for (var i = 0; i < cats.length; i++) h += '<option value="' + esc(cats[i]) + '">' + esc(catLib(cats[i])) + '</option>';
      h += '</select><span class="field-err" id="e_categorie"></span></div><div class="field"><label for="doc_titre">Titre <small>(facultatif)</small></label><input id="doc_titre" name="titre" type="text" maxlength="150"><span class="field-err" id="e_titre"></span></div>';
      if (!cible) {
        h += '<div class="field"><label for="doc_type">Se rapporte à *</label><select id="doc_type"><option value="beneficiaire">Un bénéficiaire</option>' + (options && options.intervenants.length ? '<option value="intervenant">Un intervenant</option>' : '') + '</select></div>' +
             '<div class="field"><label for="doc_cible">Personne *</label><select id="doc_cible"></select><span class="field-err" id="e_rattachement"></span></div>';
      }
      return h + '<div class="field large"><label for="doc_commentaire">Commentaire <small>(facultatif)</small></label><input id="doc_commentaire" name="commentaire" type="text" maxlength="255"><span class="field-err" id="e_commentaire"></span></div></div>' +
        '<div class="acts"><button class="btn" type="submit" id="doc-ok">Déposer</button></div></form>';
    }
    function majCibles() {
      var t = document.getElementById('doc_type'), s = document.getElementById('doc_cible'); if (!t || !s) return;
      var l = t.value === 'intervenant' ? options.intervenants : options.beneficiaires, o = '';
      for (var i = 0; i < l.length; i++) o += '<option value="' + l[i].id + '">' + esc(l[i].nom + ' ' + l[i].prenom) + '</option>';
      s.innerHTML = o;
    }
    function dessiner(r) {
      if (!r.ok) {
        if (cible) { zone.hidden = true; return; }
        zone.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return;
      }
      zone.hidden = false;
      var d = r.data, h = '';
      var compte = document.getElementById('doc-compte'); if (compte) compte.textContent = d.items.length + ' document' + (d.items.length > 1 ? 's' : '') + ' · conservation : ' + d.duree_conservation_ans + (d.duree_conservation_ans > 1 ? ' ans' : ' an');
      if (!cible || d.categories.length > 4) {
        h += '<div class="toolbar"><input type="text" id="doc-q" placeholder="Rechercher un titre, un fichier, une personne" value="' + esc(etat.q) + '"><select id="doc-cat" aria-label="Catégorie"><option value="">Toutes les catégories</option>';
        for (var i = 0; i < d.categories.length; i++) h += '<option value="' + esc(d.categories[i]) + '"' + (etat.categorie === d.categories[i] ? ' selected' : '') + '>' + esc(catLib(d.categories[i])) + '</option>';
        h += '</select>' + (d.peut_archiver ? '<label class="chk"><input type="checkbox" id="doc-arch"' + (etat.archives ? ' checked' : '') + '> Voir aussi les archivés</label>' : '') + '</div>';
      }
      h += d.items.length ? '<ul class="docs">' + d.items.map(function (x) { return ligne(x, d.peut_archiver); }).join('') + '</ul>' : '<p class="empty">Aucun document.</p>';
      h += formulaire(d.categories_depot);
      zone.innerHTML = cible ? repli('doc-' + cible.type + '-' + cible.id, 'Documents', h, '<span class="badge grey">' + d.items.length + '</span>') : h;
      majCibles();
      Object.keys(ouverts).forEach(function (id) { if (ouverts[id]) afficherHistorique(id); });
      var q = document.getElementById('doc-q'), cat = document.getElementById('doc-cat'), ar = document.getElementById('doc-arch');
      if (q) q.addEventListener('keydown', function (e) { if (e.keyCode === 13) { e.preventDefault(); etat.q = q.value.trim(); charger(); } });
      if (q) q.addEventListener('change', function () { etat.q = q.value.trim(); charger(); });
      if (cat) cat.addEventListener('change', function () { etat.categorie = cat.value; charger(); });
      if (ar) ar.addEventListener('change', function () { etat.archives = ar.checked; charger(); });
      var t = document.getElementById('doc_type'); if (t) t.addEventListener('change', majCibles);
      var f = document.getElementById('doc-f');
      if (f) f.addEventListener('submit', function (e) {
        e.preventDefault(); effacerErreurs('doc-msg');
        var fi = document.getElementById('doc_fichier'), fd = new FormData(), bt = document.getElementById('doc-ok');
        if (!fi.files.length) { document.getElementById('e_fichier').textContent = 'Choisissez un fichier.'; return; }
        fd.append('fichier', fi.files[0]); fd.append('categorie', document.getElementById('doc_categorie').value);
        fd.append('titre', document.getElementById('doc_titre').value); fd.append('commentaire', document.getElementById('doc_commentaire').value);
        if (cible) fd.append('id_' + cible.type, cible.id); else fd.append('id_' + document.getElementById('doc_type').value, document.getElementById('doc_cible').value);
        bt.disabled = true;
        envoyer(fd).then(function (r2) {
          bt.disabled = false;
          if (r2.ok) charger(); else { var m = document.getElementById('doc-msg'); m.textContent = r2.data.message || 'Erreur.'; m.hidden = false; var er = r2.data.erreurs || {}; for (var k in er) { var s = document.getElementById('e_' + k); if (s) s.textContent = er[k]; } }
        }, function () { bt.disabled = false; });
      });
    }
    function afficherHistorique(id) {
      var z = document.getElementById('hist-' + id); if (!z) return;
      appel('documents.php?id=' + id + '&versions=1').then(function (r) {
        if (!r.ok) { z.innerHTML = '<span class="msg-err">' + esc(r.data.message || 'Erreur.') + '</span>'; z.hidden = false; return; }
        z.innerHTML = '<ul class="vers">' + r.data.items.map(function (v) {
          return '<li><span><b>v' + v.version + '</b> · ' + dateFr(v.date_depot) + (v.depose_par ? ' · ' + esc(v.depose_par) : '') + ' · ' + esc(v.nom_fichier) + (v.commentaire ? ' · « ' + esc(v.commentaire) + ' »' : '') + '</span><span>' + boutons(v, false, true) + '</span></li>';
        }).join('') + '</ul>';
        z.hidden = false;
      });
    }
    function charger() { cherche().then(dessiner); }

    zone.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      var id;
      if ((id = b.getAttribute('data-h'))) { ouverts[id] = !ouverts[id]; var z = document.getElementById('hist-' + id); if (ouverts[id]) afficherHistorique(id); else z.hidden = true; }
      else if ((id = b.getAttribute('data-a'))) { if (window.confirm('Archiver ce document ? Il reste conservé avec toutes ses versions et peut être restauré.')) appel('documents.php?id=' + id, { method: 'DELETE' }).then(function (r) { if (r.ok) charger(); else window.alert(r.data.message || 'Erreur.'); }); }
      else if ((id = b.getAttribute('data-r'))) { appel('documents.php?id=' + id, { method: 'PUT', body: JSON.stringify({ archive: false }) }).then(function (r) { if (r.ok) charger(); else window.alert(r.data.message || 'Erreur.'); }); }
      else if ((id = b.getAttribute('data-v'))) {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.odt';
        inp.addEventListener('change', function () {
          if (!inp.files.length) return;
          var com = window.prompt('Commentaire sur cette version (facultatif) :', '');
          if (com === null) return;
          var fd = new FormData(); fd.append('fichier', inp.files[0]); fd.append('nouvelle_version_de', id); fd.append('commentaire', com);
          envoyer(fd).then(function (r) { if (r.ok) { ouverts[id] = true; charger(); } else window.alert(r.data.message || 'Erreur.'); });
        });
        inp.click();
      }
    });

    if (cible) charger();
    else appel('documents.php?options=1').then(function (o) { options = o.ok ? o.data : { beneficiaires: [], intervenants: [] }; charger(); });
  }
  return { carte: carte };
})();
