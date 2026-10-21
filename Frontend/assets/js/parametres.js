// Administration : paramètres de la structure, listes de valeurs (référentiels) et secteurs. Administrateur uniquement.
Shell.demarrer(function (contenu) {
  document.title = 'Paramètres · Suivi à domicile';
  contenu.innerHTML = '<div class="page-head"><div><h1>Paramètres</h1><p>Structure, listes de valeurs et secteurs. Chaque modification est tracée dans le journal.</p></div></div>' +
    '<section class="card" id="p-struct"></section><section class="card" id="p-sect"></section><div id="p-ref"></div>';

  function maj(el, r, fini) {   // retour d'une action : message ou rechargement
    if (r.ok) { if (fini) fini(); } else window.alert(r.data.message || 'Erreur.');
  }

  // 1. Structure
  var CHAMPS = [['nom_structure', 'Nom de la structure *', 'text'], ['adresse', 'Adresse', 'text'], ['telephone', 'Téléphone', 'text'], ['courriel', 'Courriel', 'email'], ['duree_conservation_ans', 'Conservation des documents (années)', 'select']];
  function structure() {
    appel('parametres.php').then(function (r) {
      var p = r.data.parametres || {}, h = '<header><h2>Structure</h2></header><form id="f-struct" novalidate><p class="msg-err" id="msg" hidden></p><div class="form-grid">';
      CHAMPS.forEach(function (c) {
        var champ;
        if (c[2] === 'select') {
          champ = '<select id="c_' + c[0] + '" name="' + c[0] + '">';
          ['1', '2', '3', '5', '10', '15', '20', '30'].forEach(function (n) { champ += '<option value="' + n + '"' + (String(p[c[0]] || '5') === n ? ' selected' : '') + '>' + n + (n === '1' ? ' an' : ' ans') + '</option>'; });
          champ += '</select>';
        } else champ = '<input id="c_' + c[0] + '" name="' + c[0] + '" type="' + c[2] + '" value="' + esc(p[c[0]] || '') + '">';
        h += '<div class="field"><label for="c_' + c[0] + '">' + c[1] + '</label>' + champ + '<span class="field-err" id="e_' + c[0] + '"></span></div>';
      });
      document.getElementById('p-struct').innerHTML = h + '</div><div class="acts"><button class="btn" type="submit">Enregistrer</button> <span class="muted" id="m-struct"></span></div></form>';
      document.getElementById('f-struct').addEventListener('submit', function (e) {
        e.preventDefault(); effacerErreurs();
        var corps = {}; CHAMPS.forEach(function (c) { corps[c[0]] = document.getElementById('c_' + c[0]).value; });
        appel('parametres.php', { method: 'PUT', body: JSON.stringify(corps) }).then(function (r) {
          if (r.ok) { document.getElementById('m-struct').textContent = 'Enregistré. Le nom s\'affiche à chaque nouvelle page.'; }
          else montrerErreurs(r);
        });
      });
    });
  }

  // 2. Secteurs
  function secteurs() {
    appel('secteurs.php').then(function (r) {
      var z = document.getElementById('p-sect'); if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var h = '<header><h2>Secteurs</h2></header>';
      if (!r.data.items.length) h += '<p class="empty">Aucun secteur.</p>';
      else {
        h += '<div class="table-wrap stack"><table><thead><tr><th>Secteur</th><th>Bénéficiaires</th><th>Intervenants</th><th></th></tr></thead><tbody>';
        r.data.items.forEach(function (s) {
          h += '<tr><td data-l="Secteur"><b>' + esc(s.libelle) + '</b></td><td data-l="Bénéficiaires">' + s.nb_beneficiaires + '</td><td data-l="Intervenants">' + s.nb_intervenants + '</td><td>' +
               btnIco('modifier', 'Renommer', 'data-ren="' + s.id + '" data-nom="' + esc(s.libelle) + '"') + ' ' + btnIco('retirer', 'Supprimer', 'data-sup="' + s.id + '"') + '</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      z.innerHTML = h + '<form id="f-sect" class="toolbar"><input type="text" id="s-nom" placeholder="Nouveau secteur" aria-label="Nouveau secteur"><button class="btn small" type="submit">Ajouter</button></form>' +
        '<p class="muted">Les bénéficiaires et les intervenants sont rattachés à leur secteur par le coordinateur, depuis leur fiche. Un secteur utilisé ne peut pas être supprimé.</p>';
      document.getElementById('f-sect').addEventListener('submit', function (e) {
        e.preventDefault();
        appel('secteurs.php', { method: 'POST', body: JSON.stringify({ libelle: document.getElementById('s-nom').value }) }).then(function (r) { maj(null, r, secteurs); });
      });
      z.onclick = function (e) {
        var b = e.target.closest('button,a'); if (!b) return;
        if (b.getAttribute('data-ren')) {
          var n = window.prompt('Nouveau nom du secteur :', b.getAttribute('data-nom'));
          if (n !== null) appel('secteurs.php?id=' + b.getAttribute('data-ren'), { method: 'PUT', body: JSON.stringify({ libelle: n }) }).then(function (r) { maj(null, r, secteurs); });
        } else if (b.getAttribute('data-sup') && window.confirm('Supprimer ce secteur ?')) {
          appel('secteurs.php?id=' + b.getAttribute('data-sup'), { method: 'DELETE' }).then(function (r) { maj(null, r, secteurs); });
        }
      };
    });
  }

  // 3. Référentiels
  function referentiels() {
    appel('referentiels.php').then(function (r) {
      var z = document.getElementById('p-ref');
      if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      if (r.data.table_absente) { z.innerHTML = '<section class="card"><p class="msg-err">Listes de valeurs indisponibles : exécutez d\'abord ajout-administration.sql.</p></section>'; return; }
      var h = '';
      r.data.groupes.forEach(function (g) {
        h += '<section class="card"><header><h2>' + esc(g.titre) + '</h2></header><ul class="ulist">';
        g.items.forEach(function (x) {
          h += '<li class="urow"><span class="uinfo">' + esc(x.libelle) + (x.actif ? '' : ' <span class="badge grey">Désactivé</span>') + (x.systeme ? '' : ' <span class="badge">Ajouté</span>') + '</span> <span class="acts">' +
               (x.systeme ? '' : '<button type="button" class="btn small secondary" data-rn="' + x.id + '" data-nom="' + esc(x.libelle) + '">Renommer</button> ') +
               '<button type="button" class="btn small secondary" data-act="' + x.id + '" data-v="' + (x.actif ? 0 : 1) + '">' + (x.actif ? 'Désactiver' : 'Réactiver') + '</button></span></li>';
        });
        h += '</ul><form class="toolbar" data-cat="' + esc(g.categorie) + '"><input type="text" placeholder="Nouvelle valeur" aria-label="Nouvelle valeur"><button class="btn small" type="submit">Ajouter</button></form></section>';
      });
      z.innerHTML = h + '<p class="muted">Une valeur désactivée n\'est plus proposée dans les formulaires, mais l\'historique reste lisible. Les valeurs d\'origine ne peuvent pas être renommées.</p>';
      z.onsubmit = function (e) {
        e.preventDefault(); var f = e.target;
        appel('referentiels.php', { method: 'POST', body: JSON.stringify({ categorie: f.getAttribute('data-cat'), libelle: f.querySelector('input').value }) }).then(function (r) { maj(null, r, referentiels); });
      };
      z.onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.getAttribute('data-rn')) {
          var n = window.prompt('Nouveau libellé :', b.getAttribute('data-nom'));
          if (n !== null) appel('referentiels.php?id=' + b.getAttribute('data-rn'), { method: 'PUT', body: JSON.stringify({ libelle: n }) }).then(function (r) { maj(null, r, referentiels); });
        } else if (b.getAttribute('data-act')) {
          appel('referentiels.php?id=' + b.getAttribute('data-act'), { method: 'PUT', body: JSON.stringify({ actif: b.getAttribute('data-v') === '1' }) }).then(function (r) { maj(null, r, referentiels); });
        }
      };
    });
  }
  structure(); secteurs(); referentiels();
});
