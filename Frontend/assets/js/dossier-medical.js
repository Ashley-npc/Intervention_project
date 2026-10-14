// Carte « Dossier médical » réutilisable : DossierMedical.afficher(zone, idBeneficiaire).
// Le serveur décide de ce qui est visible (selon le rôle) : si l'accès est refusé, la carte reste cachée.
var DossierMedical = (function () {
  var NIVEAUX = { autonome: 'Autonome', partielle: 'Aide partielle', dependant: 'Dépendant' };
  var LIBELLES_CHAMPS = { niveau_autonomie: 'Niveau d\'autonomie', allergies: 'Allergies', pathologies: 'Pathologies', traitements: 'Traitements', observations: 'Observations (internes)' };
  function afficher(zone, id) {
    appel('dossier-medical.php?id_beneficiaire=' + encodeURIComponent(id)).then(function (r) {
      if (!r.ok) { zone.hidden = true; return; }       // pas d'accès : on n'affiche rien
      var d = r.data.dossier || {}, champs = r.data.champs, i, c, h = '<header><h2>Dossier médical</h2><span class="badge grey">Confidentiel</span></header>';
      zone.hidden = false;
      if (!r.data.modifiable) {
        var rien = true;
        h += '<dl class="facts">';
        for (i = 0; i < champs.length; i++) {
          c = champs[i];
          if (d[c]) rien = false;
          h += '<div><dt>' + LIBELLES_CHAMPS[c] + '</dt><dd>' + (d[c] ? esc(c === 'niveau_autonomie' ? (NIVEAUX[d[c]] || d[c]) : d[c]) : '—') + '</dd></div>';
        }
        zone.innerHTML = h + '</dl>' + (rien ? '<p class="muted">Aucune information médicale enregistrée.</p>' : '');
        return;
      }
      h += '<p class="msg-err" id="dm-msg" hidden></p><form id="dm-f" novalidate><div class="form-grid">';
      for (i = 0; i < champs.length; i++) {
        c = champs[i];
        if (c === 'niveau_autonomie') {
          h += '<div class="field"><label for="dm_' + c + '">' + LIBELLES_CHAMPS[c] + '</label><select id="dm_' + c + '" name="' + c + '"><option value="">—</option>';
          for (var k = 0; k < r.data.niveaux.length; k++) h += '<option value="' + r.data.niveaux[k] + '"' + (d[c] === r.data.niveaux[k] ? ' selected' : '') + '>' + NIVEAUX[r.data.niveaux[k]] + '</option>';
          h += '</select><span class="field-err" id="e_' + c + '"></span></div>';
        } else h += '<div class="field large"><label for="dm_' + c + '">' + LIBELLES_CHAMPS[c] + '</label><textarea id="dm_' + c + '" name="' + c + '" rows="2" maxlength="2000">' + esc(d[c] || '') + '</textarea><span class="field-err" id="e_' + c + '"></span></div>';
      }
      zone.innerHTML = h + '</div><div class="actions"><button class="btn" type="submit" id="dm-ok">Enregistrer le dossier</button></div><p class="muted">Visible par le bénéficiaire (sauf les observations internes), par les intervenants qui le suivent et par ses proches autorisés (autonomie, allergies, traitements). Chaque consultation est enregistrée dans le journal.</p></form>';
      document.getElementById('dm-f').addEventListener('submit', function (e) {
        e.preventDefault();
        var corps = {}, ch = this.elements, j, b = document.getElementById('dm-ok'), m = document.getElementById('dm-msg');
        for (j = 0; j < ch.length; j++) if (ch[j].name) corps[ch[j].name] = ch[j].value;
        b.disabled = true; m.hidden = true;
        appel('dossier-medical.php?id_beneficiaire=' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(corps) }).then(function (r2) {
          b.disabled = false;
          if (r2.ok) { b.textContent = 'Enregistré ✓'; setTimeout(function () { b.textContent = 'Enregistrer le dossier'; }, 1800); }
          else { m.textContent = r2.data.message || 'Erreur.'; m.hidden = false; }
        }, function () { b.disabled = false; });
      });
    });
  }
  return { afficher: afficher };
})();
