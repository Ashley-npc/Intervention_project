// Carte « Prise en charge » sur la fiche d'un bénéficiaire : organismes payeurs, droits ouverts, taux. Modifiable par le coordinateur.
(function () {
  var R = RESSOURCES.beneficiaires; if (!R) return;
  var avant = R.apresFiche;
  R.apresFiche = function (x, contenu, data) {
    if (avant) avant(x, contenu, data);
    window.utilisateurPret.then(function (user) {
      if (user.role !== 'coordinateur' && user.role !== 'facturation') return;
      var zone = document.createElement('section'); zone.className = 'card'; contenu.appendChild(zone);
      function charger() {
        appel('organismes.php?beneficiaire=' + x.id).then(function (r) {
          if (!r.ok) { zone.hidden = true; return; }
          var l = r.data.items, orgs = r.data.organismes, mod = r.data.modifiable, h = '<header><h2>Prise en charge</h2></header>', i;
          if (!l.length) h += '<p class="empty">Aucun organisme payeur associé.</p>';
          else {
            h += '<div class="table-wrap stack"><table><thead><tr><th>Organisme</th><th>Droits ouverts</th><th>Taux</th><th>Période</th>' + (mod ? '<th></th>' : '') + '</tr></thead><tbody>';
            for (i = 0; i < l.length; i++) {
              var p = l[i];
              h += '<tr><td data-l="Organisme"><b>' + esc(p.nom) + '</b></td><td data-l="Droits ouverts">' + esc(p.droits_ouverts || '—') + '</td><td data-l="Taux">' + (p.taux_prise_en_charge === null ? '—' : p.taux_prise_en_charge + ' %') +
                   '</td><td data-l="Période">' + (p.date_debut ? dateFr(p.date_debut) : '…') + ' → ' + (p.date_fin ? dateFr(p.date_fin) : '…') + '</td>' +
                   (mod ? '<td>' + btnIco('n_incidents', 'Retirer', 'data-retirer="' + p.id_organisme + '"') + '</td>' : '') + '</tr>';
            }
            h += '</tbody></table></div>';
          }
          if (mod) {
            if (!orgs.length) h += '<p class="muted">Aucun organisme enregistré : ajoutez-en dans « Organismes ».</p>';
            else {
              h += '<form id="pec-f" novalidate><p class="msg-err" id="pec-m" hidden></p><div class="form-grid"><div class="field"><label for="pec_o">Organisme *</label><select id="pec_o" name="id_organisme">';
              for (i = 0; i < orgs.length; i++) h += '<option value="' + orgs[i].id + '">' + esc(orgs[i].nom) + '</option>';
              h += '</select></div><div class="field"><label for="pec_t">Taux (%)</label><input id="pec_t" name="taux_prise_en_charge" type="text" inputmode="decimal"><span class="field-err" id="e_taux_prise_en_charge"></span></div>' +
                   '<div class="field large"><label for="pec_d">Droits ouverts</label><input id="pec_d" name="droits_ouverts" type="text" maxlength="255"><span class="field-err" id="e_droits_ouverts"></span></div>' +
                   '<div class="field"><label for="pec_db">Début</label><input id="pec_db" name="date_debut" type="date"><span class="field-err" id="e_date_debut"></span></div>' +
                   '<div class="field"><label for="pec_df">Fin</label><input id="pec_df" name="date_fin" type="date"><span class="field-err" id="e_date_fin"></span></div></div>' +
                   '<div class="actions"><button class="btn small" type="submit">Enregistrer</button></div><p class="muted">Choisir un organisme déjà associé met à jour sa ligne.</p></form>';
            }
          }
          zone.innerHTML = h;
          var f = document.getElementById('pec-f');
          if (f) f.addEventListener('submit', function (e) {
            e.preventDefault(); effacerErreurs();
            var corps = { action: 'prise_en_charge', id_beneficiaire: x.id }, ch = f.elements;
            for (var k = 0; k < ch.length; k++) if (ch[k].name && ch[k].value !== '') corps[ch[k].name] = ch[k].value;
            corps.id_organisme = Number(corps.id_organisme);
            appel('organismes.php', { method: 'POST', body: JSON.stringify(corps) }).then(function (r2) { if (r2.ok) charger(); else montrerErreurs(r2, 'pec-m'); });
          });
        });
      }
      zone.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-retirer]'); if (!b || !window.confirm('Retirer cet organisme de ce bénéficiaire ?')) return;
        appel('organismes.php', { method: 'POST', body: JSON.stringify({ action: 'retirer', id_beneficiaire: x.id, id_organisme: Number(b.getAttribute('data-retirer')) }) }).then(function (r) { if (r.ok) charger(); else window.alert(r.data.message || 'Erreur.'); });
      });
      charger();
    });
  };
})();
