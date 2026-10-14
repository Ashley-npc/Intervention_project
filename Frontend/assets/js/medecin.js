// Espace du medecin prescripteur : ses patients (dossier medical autorise, lecture seule), ses prescriptions, et le formulaire pour prescrire.
Shell.demarrer(function (contenu) {
  document.title = 'Espace médecin · Suivi à domicile';
  var STATUTS = { en_attente: ['En attente', 'warn'], prise_en_compte: ['Prise en compte', 'ok'], refusee: ['Refusée', 'danger'] }, donnees = null;
  function dl(libelle, valeur) { return '<div><dt>' + libelle + '</dt><dd>' + (valeur ? esc(valeur) : '—') + '</dd></div>'; }
  function dessiner() {
    var d = donnees, i, h = '<div class="page-head"><div><h1>Bonjour Dr ' + esc(((d.medecin.prenom || '') + ' ' + d.medecin.nom).replace(/^ /, '')) + '</h1><p id="compte">' + d.patients.length + ' patient' + (d.patients.length > 1 ? 's' : '') + '</p></div></div>' +
      '<section class="card"><header><h2>Comment ça marche ?</h2></header><p class="muted"><b>Prescrire</b>, c\'est indiquer quel soin votre patient doit recevoir et à quelle fréquence (par exemple « soins, 3 fois par semaine pendant un mois »). ' +
      'Cette ordonnance est <b>transmise au coordinateur</b> : il la prend en compte (ou la refuse avec un motif), puis il planifie les interventions avec un intervenant. ' +
      'Vous ne gérez pas le planning vous-même ; vous suivez ici l\'état de vos prescriptions et le dossier médical de vos patients (lecture seule).</p></section>';
    if (d.patients.length) {
      var op = '<option value="">— choisir —</option>', ot = '<option value="">— choisir —</option>';
      for (i = 0; i < d.patients.length; i++) op += '<option value="' + d.patients[i].id + '">' + esc(d.patients[i].prenom + ' ' + d.patients[i].nom) + '</option>';
      for (i = 0; i < d.types.length; i++) ot += '<option value="' + esc(d.types[i]) + '">' + esc(lib(d.types[i])) + '</option>';
      h += '<section class="card" id="bloc-prescrire"><header><h2>Prescrire des soins</h2></header><p class="msg-err" id="msg" hidden></p><form id="f" novalidate><div class="form-grid">' +
        '<div class="field"><label for="p_patient">Patient *</label><select id="p_patient">' + op + '</select><span class="field-err" id="e_id_beneficiaire"></span></div>' +
        '<div class="field"><label for="p_type">Type de soin *</label><select id="p_type">' + ot + '</select><span class="field-err" id="e_type_intervention"></span></div>' +
        '<div class="field large"><label for="p_freq">Fréquence et durée <small>(facultatif)</small></label><input id="p_freq" type="text" maxlength="100" placeholder="ex. 3 fois par semaine pendant 1 mois"><span class="field-err" id="e_frequence"></span></div>' +
        '<div class="field large"><label for="p_ind">Consignes médicales *</label><textarea id="p_ind" rows="3" maxlength="2000"></textarea><span class="field-err" id="e_indications"></span></div>' +
        '</div><div class="actions"><button class="btn" type="submit" id="ok">Transmettre au coordinateur</button></div></form></section>';
    }
    h += '<section class="card"><header><h2>Mes patients</h2></header>';
    if (!d.patients.length) h += '<p class="empty">Aucun patient ne vous est rattaché pour le moment. Le coordinateur doit les rattacher à votre fiche.</p>';
    else {
      var c = '';
      for (i = 0; i < d.patients.length; i++) {
        var p = d.patients[i];
        c += '<article class="pers"><h3>' + esc(p.prenom + ' ' + p.nom) + '</h3><dl>' + dl('Âge', age(p.date_naissance)) + dl('Autonomie', p.niveau_autonomie) + dl('Allergies', p.allergies) + dl('Pathologies', p.pathologies) +
             dl('Traitements', p.traitements) + dl('Observations', p.observations) + dl('Prochaine intervention', p.prochaine_intervention ? dateFr(p.prochaine_intervention) : '') +
             '</dl><button type="button" class="btn small" data-patient="' + p.id + '">Prescrire</button></article>';
      }
      h += railHtml(c);
    }
    h += '</section><section class="card"><header><h2>Mes prescriptions</h2></header>';
    if (!d.prescriptions.length) h += '<p class="empty">Aucune prescription pour le moment.</p>';
    else {
      h += '<div class="table-wrap stack"><table><thead><tr><th>Date</th><th>Patient</th><th>Soin</th><th>Consignes</th><th>Statut</th></tr></thead><tbody>';
      for (i = 0; i < d.prescriptions.length; i++) {
        var r = d.prescriptions[i], s = STATUTS[r.statut] || [r.statut, ''];
        h += '<tr><td data-l="Date">' + dateFr(r.date_prescription) + '</td><td data-l="Patient"><b>' + esc(r.b_prenom + ' ' + r.b_nom) + '</b></td><td data-l="Soin">' + esc(lib(r.type_intervention)) + (r.frequence ? '<br><span class="muted">' + esc(r.frequence) + '</span>' : '') +
             '</td><td data-l="Consignes">' + esc(r.indications) + (r.reponse ? '<br><span class="muted">Réponse : ' + esc(r.reponse) + '</span>' : '') + '</td><td data-l="Statut"><span class="badge ' + s[1] + '">' + s[0] + '</span></td></tr>';
      }
      h += '</tbody></table></div>';
    }
    contenu.innerHTML = h + '</section>';
  }
  function charger() {
    appel('medecin-espace.php').then(function (r) {
      if (!r.ok) { Shell.erreur(contenu, r.data.message || 'Erreur.'); return; }
      donnees = r.data; dessiner();
    });
  }
  contenu.addEventListener('click', function (e) {
    var p = e.target.getAttribute && e.target.getAttribute('data-patient'); if (!p) return;
    document.getElementById('p_patient').value = p;
    document.getElementById('bloc-prescrire').scrollIntoView();
    document.getElementById('p_type').focus();
  });
  contenu.addEventListener('submit', function (e) {
    e.preventDefault(); effacerErreurs();
    var b = document.getElementById('ok'); b.disabled = true;
    appel('prescriptions.php', { method: 'POST', body: JSON.stringify({ id_beneficiaire: Number(document.getElementById('p_patient').value) || 0, type_intervention: document.getElementById('p_type').value,
      frequence: document.getElementById('p_freq').value, indications: document.getElementById('p_ind').value }) }).then(function (r) {
      b.disabled = false;
      if (r.ok) charger(); else montrerErreurs(r);
    }, function () { b.disabled = false; });
  });
  charger();
});
