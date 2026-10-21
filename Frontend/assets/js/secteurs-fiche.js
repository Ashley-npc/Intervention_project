// Carte « Secteur » sur la fiche d'un bénéficiaire (un secteur) ou d'un intervenant (plusieurs secteurs). Réservée au coordinateur.
(function () {
  ['beneficiaires', 'intervenants'].forEach(function (nom) {
    var R = RESSOURCES[nom]; if (!R) return;
    var avant = R.apresFiche;
    R.apresFiche = function (x, contenu, data) {
      if (avant) avant(x, contenu, data);
      window.utilisateurPret.then(function (user) {
        if (user.role !== 'coordinateur') return;
        var zone = document.createElement('section'); zone.className = 'card'; contenu.appendChild(zone);
        var multi = nom === 'intervenants';
        Promise.all([appel('secteurs.php'), appel('secteurs.php?' + (multi ? 'intervenant=' : 'beneficiaire=') + x.id)]).then(function (rs) {
          if (!rs[0].ok || !rs[1].ok) { zone.hidden = true; return; }
          var liste = rs[0].data.items, h = '<header><h2>' + (multi ? 'Secteurs' : 'Secteur') + '</h2></header>', i;
          if (!liste.length) { zone.innerHTML = h + '<p class="empty">Aucun secteur défini. L\'administrateur les crée dans « Paramètres ».</p>'; return; }
          var choisis = multi ? rs[1].data.secteurs : [rs[1].data.id_secteur];
          if (multi) {
            h += '<form id="sec-f" class="toolbar">';
            for (i = 0; i < liste.length; i++) h += '<label class="chk"><input type="checkbox" value="' + liste[i].id + '"' + (choisis.indexOf(liste[i].id) >= 0 ? ' checked' : '') + '> ' + esc(liste[i].libelle) + '</label>';
          } else {
            h += '<form id="sec-f" class="toolbar"><select id="sec-s" aria-label="Secteur"><option value="">— aucun —</option>';
            for (i = 0; i < liste.length; i++) h += '<option value="' + liste[i].id + '"' + (choisis[0] === liste[i].id ? ' selected' : '') + '>' + esc(liste[i].libelle) + '</option>';
            h += '</select>';
          }
          zone.innerHTML = h + '<button class="btn small" type="submit">Enregistrer</button> <span class="muted" id="sec-m"></span></form>' +
            '<p class="muted">Sert à proposer en priorité un remplaçant du même secteur en cas d\'absence.</p>';
          document.getElementById('sec-f').addEventListener('submit', function (e) {
            e.preventDefault();
            var corps = { action: nom === 'intervenants' ? 'intervenant' : 'beneficiaire', id: x.id };
            if (multi) corps.secteurs = Array.prototype.map.call(zone.querySelectorAll('input:checked'), function (c) { return Number(c.value); });
            else corps.id_secteur = Number(document.getElementById('sec-s').value) || 0;
            appel('secteurs.php', { method: 'POST', body: JSON.stringify(corps) }).then(function (r) {
              document.getElementById('sec-m').textContent = r.ok ? 'Enregistré.' : (r.data.message || 'Erreur.');
            });
          });
        });
      });
    };
  });
})();
