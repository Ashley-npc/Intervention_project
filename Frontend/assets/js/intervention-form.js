// Création / modification d'une intervention (coordinateur, administrateur). Le serveur vérifie les chevauchements d'horaires.
Shell.demarrer(function (contenu) {
  var id = param('id');
  document.title = (id ? 'Modifier' : 'Nouvelle') + ' intervention · Suivi à domicile';
  var TYPES = ['aide a la personne', 'soins', 'accompagnement', 'lien social'];

  function options(liste, choisi, vide) {
    var h = vide ? '<option value="">' + vide + '</option>' : '';
    for (var i = 0; i < liste.length; i++) h += '<option value="' + esc(liste[i][0]) + '"' + (String(liste[i][0]) === String(choisi) ? ' selected' : '') + '>' + esc(liste[i][1]) + '</option>';
    return h;
  }
  function personnes(items) { var l = []; for (var i = 0; i < items.length; i++) l.push([items[i].id, items[i].prenom + ' ' + items[i].nom]); return l; }

  function dessiner(x, benefs, intervs, medecins) {
    var verrou = x.validee;
    var h = '<div class="page-head"><div><h1>' + (id ? 'Modifier l\'intervention' : 'Nouvelle intervention') + '</h1><p><a href="' + FRONT + (id ? 'interventions/fiche.html?id=' + id : 'interventions/planning.html') + '">← Annuler</a></p></div></div>' +
      (verrou ? '<p class="msg-err">Cette intervention est validée : elle ne peut plus être modifiée.</p>' : '') +
      '<form id="f" novalidate><p class="msg-err" id="msg" hidden></p><section class="card"><header><h2>Qui et quand</h2></header><div class="form-grid">' +
      '<div class="field"><label for="c_id_beneficiaire">Bénéficiaire *</label><select id="c_id_beneficiaire" name="id_beneficiaire">' + options(personnes(benefs), x.id_beneficiaire, '— choisir —') + '</select><span class="field-err" id="e_id_beneficiaire"></span></div>' +
      '<div class="field"><label for="c_id_intervenant">Intervenant *</label><select id="c_id_intervenant" name="id_intervenant">' + options(personnes(intervs), x.id_intervenant, '— choisir —') + '</select><span class="field-err" id="e_id_intervenant"></span></div>' +
      '<div class="field"><label for="c_date">Date *</label><input id="c_date" name="date" type="date" value="' + esc(x.date || '') + '"><span class="field-err" id="e_date"></span></div>' +
      '<div class="field"><label for="c_type">Type *</label><select id="c_type" name="type">' + options(TYPES.map(function (t) { return [t, lib(t)]; }), x.type, '— choisir —') + '</select><span class="field-err" id="e_type"></span></div>' +
      '<div class="field"><label for="c_heure_debut">Début *</label><input id="c_heure_debut" name="heure_debut" type="time" value="' + esc(x.heure_debut || '') + '"><span class="field-err" id="e_heure_debut"></span></div>' +
      '<div class="field"><label for="c_heure_fin">Fin *</label><input id="c_heure_fin" name="heure_fin" type="time" value="' + esc(x.heure_fin || '') + '"><span class="field-err" id="e_heure_fin"></span></div>' +
      '</div></section><section class="card"><header><h2>Lieu et suivi</h2></header><div class="form-grid">' +
      (medecins ? '<div class="field large"><label for="c_id_medecin">Médecin prescripteur <small>(facultatif)</small></label><select id="c_id_medecin" name="id_medecin">' + options(medecins.map(function (m) { return [m.id, ((m.prenom || '') + ' ' + m.nom).replace(/^ /, '')]; }), x.id_medecin, '— aucun —') + '</select></div>' : '') +
      '<div class="field"><label for="c_lieu">Lieu</label><select id="c_lieu" name="lieu">' + options([['domicile', 'Au domicile'], ['exterieur', 'À l\'exterieur']], x.lieu || 'domicile') + '</select></div>' +
      '<div class="field" id="bloc-adresse"><label for="c_adresse_exterieur">Adresse (si extérieur) *</label><input id="c_adresse_exterieur" name="adresse_exterieur" type="text" value="' + esc(x.adresse_exterieur || '') + '"><span class="field-err" id="e_adresse_exterieur"></span></div>' +
      (id ? '<div class="field"><label for="c_statut">Statut</label><select id="c_statut" name="statut">' + options([['planifiee', 'Planifiée'], ['realisee', 'Réalisée'], ['annulee', 'Annulée']], x.statut) + '</select></div>' : '') +
      '<label class="chk field large"><input type="checkbox" id="c_urgente"' + (x.urgente ? ' checked' : '') + '> Intervention urgente</label>' +
      '</div></section><div class="actions"><button class="btn" type="submit" id="ok"' + (verrou ? ' disabled' : '') + '>Enregistrer</button></div></form>';
    contenu.innerHTML = h;
    var lieu = document.getElementById('c_lieu'), bloc = document.getElementById('bloc-adresse');
    function majLieu() { bloc.hidden = lieu.value !== 'exterieur'; }
    lieu.addEventListener('change', majLieu); majLieu();
    document.getElementById('f').addEventListener('submit', function (e) {
      e.preventDefault(); effacerErreurs();
      var corps = { urgente: document.getElementById('c_urgente').checked }, ch = this.elements;
      for (var i = 0; i < ch.length; i++) if (ch[i].name) corps[ch[i].name] = ch[i].value;
      if (corps.id_beneficiaire === '') delete corps.id_beneficiaire;
      if (corps.id_intervenant === '') delete corps.id_intervenant;
      if (corps.id_medecin === '') corps.id_medecin = 0;   // 0 = aucun médecin
      var b = document.getElementById('ok'); b.disabled = true;
      appel('interventions.php' + (id ? '?id=' + encodeURIComponent(id) : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(corps) }).then(function (r) {
        if (r.ok) { location.href = FRONT + 'interventions/fiche.html?id=' + (r.data.id || id); return; }
        b.disabled = false; montrerErreurs(r);
      }, function () { b.disabled = false; });
    });
  }

  var attente = [appel('beneficiaires.php'), appel('intervenants.php'), appel('medecins.php')];
  var rangId = attente.length;
  if (id) attente.push(appel('interventions.php?id=' + encodeURIComponent(id)));
  Promise.all(attente).then(function (rs) {
    if (!rs[0].ok || !rs[1].ok) { Shell.erreur(contenu, 'Impossible de charger les listes.'); return; }
    var x = {};
    if (id) { if (!rs[rangId].ok) { Shell.erreur(contenu, rs[rangId].data.message || 'Erreur.', FRONT + 'interventions/planning.html'); return; } x = rs[rangId].data.item; }
    else { x = { date: param('date') || aujourdhui(), id_intervenant: param('id_intervenant'), id_beneficiaire: param('id_beneficiaire'), id_medecin: param('id_medecin') }; }
    dessiner(x, rs[0].data.items, rs[1].data.items, rs[2].ok ? rs[2].data.items : null);
  });
});
