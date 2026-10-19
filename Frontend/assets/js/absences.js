// Absences : intervenants (conge, formation, arret maladie...) et beneficiaires (hospitalisation, voyage, refus...).
// Coordinateur/administrateur : tout, remplacants, etat. Intervenant / beneficiaire : ses propres absences.
Shell.demarrer(function (contenu, user) {
  document.title = 'Absences · Suivi à domicile';
  var gestion = user.role === 'coordinateur' || user.role === 'administrateur', soi = !gestion;
  var donnees = null, edition = 0, ouverte = 0;
  var titre = soi ? 'Mes absences' : 'Absences';

  contenu.innerHTML = '<div class="page-head"><div><h1>' + titre + '</h1><p>' + (soi ? 'Déclarez une absence : votre coordinateur est prévenu.' : 'Déclarer, suivre et réorganiser les interventions touchées.') + '</p></div></div>' +
    '<p class="msg-ok" id="info" hidden></p>' +
    '<section class="card"><header><h2 id="f-titre">Déclarer une absence</h2></header><p class="msg-err" id="msg" hidden></p><form id="f" novalidate><div class="form-grid">' +
    (gestion ? '<div class="field"><label for="c_cible">Qui est absent ? *</label><select id="c_cible" name="cible"><option value="intervenant">Un intervenant</option><option value="beneficiaire">Un bénéficiaire</option></select><span class="field-err" id="e_cible"></span></div>' +
      '<div class="field"><label for="c_personne">Personne *</label><select id="c_personne"></select><span class="field-err" id="e_id_personne"></span></div>' : '') +
    '<div class="field"><label for="c_motif">Motif *</label><select id="c_motif" name="motif"></select><span class="field-err" id="e_motif"></span></div>' +
    '<div class="field"><label for="c_date_debut">Du *</label><input id="c_date_debut" name="date_debut" type="date" value="' + aujourdhui() + '"><span class="field-err" id="e_date_debut"></span></div>' +
    '<div class="field"><label for="c_date_fin">Au (inclus) *</label><input id="c_date_fin" name="date_fin" type="date" value="' + aujourdhui() + '"><span class="field-err" id="e_date_fin"></span></div>' +
    '<div class="field large"><label for="c_commentaire">Commentaire</label><input id="c_commentaire" name="commentaire" type="text" maxlength="500"><span class="field-err" id="e_commentaire"></span></div>' +
    '<div class="field large"><label for="c_justificatif">Justificatif (référence du document, facultatif)</label><input id="c_justificatif" name="justificatif" type="text" maxlength="255"><span class="field-err" id="e_justificatif"></span></div>' +
    '</div><div class="actions"><button class="btn" type="submit" id="ok">Enregistrer l\'absence</button><button class="btn secondary" type="button" id="annule-edit" hidden>Annuler la modification</button></div></form></section>' +
    '<section class="card" id="detail" hidden></section>' +
    '<section class="card"><header><h2>' + (soi ? 'Mes absences' : 'Absences en cours et à venir') + '</h2>' +
    (gestion ? '<span class="filtres"><select id="f-cible" aria-label="Filtrer"><option value="">Tout le monde</option><option value="intervenant">Intervenants</option><option value="beneficiaire">Bénéficiaires</option></select> ' : '<span class="filtres">') +
    '<label class="check"><input type="checkbox" id="f-tout"> Passées et annulées</label></span></header><div id="liste"></div></section>' +
    (gestion ? '<section class="card" id="etat"></section>' : '');

  function motifs() {
    var cible = gestion ? document.getElementById('c_cible').value : (user.role === 'intervenant' ? 'intervenant' : 'beneficiaire');
    var m = cible === 'intervenant' ? donnees.motifs_intervenant : donnees.motifs_beneficiaire, o = '';
    for (var i = 0; i < m.length; i++) o += '<option value="' + esc(m[i]) + '">' + esc(lib(m[i])) + '</option>';
    document.getElementById('c_motif').innerHTML = o;
  }
  function personnes() {
    if (!gestion) return;
    var l = document.getElementById('c_cible').value === 'intervenant' ? donnees.intervenants : donnees.beneficiaires, o = '<option value="">— choisir —</option>';
    for (var i = 0; i < l.length; i++) o += '<option value="' + l[i].id + '">' + esc(l[i].prenom + ' ' + l[i].nom) + '</option>';
    document.getElementById('c_personne').innerHTML = o;
  }
  function periode(a) { return a.date_debut === a.date_fin ? 'Le ' + dateFr(a.date_debut) : 'Du ' + dateFr(a.date_debut) + ' au ' + dateFr(a.date_fin); }

  function charger() {
    var q = [];
    if (!document.getElementById('f-tout').checked) q.push('du=' + aujourdhui()); else q.push('annulees=1');
    if (gestion && document.getElementById('f-cible').value) q.push('cible=' + document.getElementById('f-cible').value);
    appel('absences.php?' + q.join('&')).then(function (r) {
      var zone = document.getElementById('liste');
      if (!r.ok) { zone.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var premiere = !donnees; donnees = r.data;
      if (premiere) { motifs(); personnes(); if (gestion) etat(); }
      if (!r.data.items.length) { zone.innerHTML = '<p class="empty">Aucune absence.</p>'; return; }
      var h = '';
      for (var i = 0; i < r.data.items.length; i++) {
        var a = r.data.items[i], badges = '<span class="badge">' + esc(lib(a.motif)) + '</span>' + (a.annulee ? ' <span class="badge grey">Annulée</span>' : '') +
          (a.cible === 'beneficiaire' && gestion ? ' <span class="badge grey">Bénéficiaire</span>' : '') +
          (a.impactees ? ' <button type="button" class="badge danger bt" data-det="' + a.id + '">' + a.impactees + ' intervention' + (a.impactees > 1 ? 's' : '') + ' touchée' + (a.impactees > 1 ? 's' : '') + '</button>' : '');
        var infos = [badges, periode(a)]; if (a.commentaire) infos.push(esc(a.commentaire)); if (a.justificatif) infos.push('Justificatif : ' + esc(a.justificatif));
        var acts = a.annulee ? '' : '<span class="acts">' + btnIco('modifier', "Modifier l'absence", 'data-edit="' + a.id + '"') + btnIco('retirer', "Annuler l'absence", 'data-annuler="' + a.id + '"') + '</span>';
        h += persHtml({ titre: a.nom, infos: infos, avatar: a.nom, off: a.annulee, action: acts });
      }
      zone.innerHTML = railHtml(h); railInit();
    });
  }

  // ---------- Detail : interventions touchees, remplacants ----------
  function detail(id) {
    var zone = document.getElementById('detail'); ouverte = id;
    appel('absences.php?id=' + id).then(function (r) {
      if (!r.ok) { zone.hidden = true; return; }
      var a = r.data.item, l = r.data.impactees, h = '<header><h2>' + esc(a.nom) + ' · ' + esc(lib(a.motif)) + '</h2><button type="button" class="btn small secondary" id="det-x">Fermer</button></header><p class="muted">' + periode(a) + '</p>';
      if (!l.length) { zone.innerHTML = h + '<p class="empty">Aucune intervention prévue sur cette période.</p>'; zone.hidden = false; zone.querySelector('#det-x').onclick = function () { zone.hidden = true; ouverte = 0; }; return; }
      h += '<div class="table-wrap stack"><table><thead><tr><th>Date</th><th>Horaire</th><th>' + (a.cible === 'intervenant' ? 'Bénéficiaire' : 'Intervenant') + '</th><th>Action</th></tr></thead><tbody>';
      for (var i = 0; i < l.length; i++) {
        var x = l[i];
        h += '<tr data-i="' + x.id + '"><td data-l="Date">' + dateFr(x.date) + '</td><td data-l="Horaire">' + x.heure_debut + '–' + x.heure_fin + (x.urgente ? ' <span class="badge danger">Urgent</span>' : '') + '</td>' +
          '<td data-l="' + (a.cible === 'intervenant' ? 'Bénéficiaire' : 'Intervenant') + '">' + esc(a.cible === 'intervenant' ? x.beneficiaire_prenom + ' ' + x.beneficiaire_nom : x.intervenant_prenom + ' ' + x.intervenant_nom) + '</td>' +
          '<td data-l="Action" class="rempl">' + (gestion ? (a.cible === 'intervenant' ? '<span class="muted">Recherche…</span>' :
            '<button type="button" class="btn small secondary" data-annuler-i="' + x.id + '">Annuler l\'intervention</button> <a class="link" href="' + FRONT + 'interventions/form.html?id=' + x.id + '">Reporter</a>') : '') + '</td></tr>';
      }
      zone.innerHTML = h + '</tbody></table></div><p class="msg-err" id="det-msg" hidden></p>' + (gestion && a.cible === 'intervenant' ? '<p class="muted">Remplaçants proposés : intervenants présents, libres et disponibles sur le créneau ; ceux du même secteur que le bénéficiaire en premier.</p>' : '');
      zone.hidden = false;
      zone.querySelector('#det-x').onclick = function () { zone.hidden = true; ouverte = 0; };
      if (gestion && a.cible === 'intervenant') for (var j = 0; j < l.length; j++) remplacants(l[j].id);
    });
  }
  function remplacants(idInterv) {
    appel('absences.php?remplacants=' + idInterv).then(function (r) {
      var cel = document.querySelector('#detail tr[data-i="' + idInterv + '"] .rempl'); if (!cel) return;
      if (!r.ok || !r.data.items.length) { cel.innerHTML = '<span class="badge danger">Non pourvue</span> <span class="muted">aucun remplaçant disponible</span> <a class="link" href="' + FRONT + 'interventions/fiche.html?id=' + idInterv + '">Ouvrir</a>'; return; }
      var o = '';
      for (var i = 0; i < r.data.items.length; i++) { var c = r.data.items[i]; o += '<option value="' + c.id + '">' + esc(c.nom) + (c.meme_secteur ? ' · même secteur' : '') + ' (' + c.charge_jour + ' ce jour-là)</option>'; }
      cel.innerHTML = '<select aria-label="Remplaçant">' + o + '</select> <button type="button" class="btn small" data-reaff="' + idInterv + '">Réaffecter</button>';
    });
  }

  // ---------- Etat des absences ----------
  function etat() {
    var zone = document.getElementById('etat'), du = (document.getElementById('e-du') || {}).value || aujourdhui().slice(0, 8) + '01', au = (document.getElementById('e-au') || {}).value || '';
    if (!au) { var d = dateDe(du); au = isoDe(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
    appel('absences.php?etat=1&du=' + du + '&au=' + au).then(function (r) {
      if (!r.ok) { zone.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var e = r.data, h = '<header><h2>État des absences</h2><button type="button" class="btn small secondary" id="csv">Exporter en CSV</button></header>' +
        '<div class="form-grid"><div class="field"><label for="e-du">Du</label><input type="date" id="e-du" value="' + e.du + '"></div><div class="field"><label for="e-au">Au</label><input type="date" id="e-au" value="' + e.au + '"></div></div>' +
        '<section class="kpis"><div class="kpi"><b>' + String(e.taux_absenteisme).replace('.', ',') + ' %</b><span>Taux d\'absentéisme</span></div><div class="kpi"><b>' + e.jours_intervenants + '</b><span>Jours d\'absence (intervenants)</span></div>' +
        '<div class="kpi"><b>' + e.jours_beneficiaires + '</b><span>Jours d\'absence (bénéficiaires)</span></div></section>';
      if (!e.par_personne.length) h += '<p class="empty">Aucune absence sur cette période.</p>';
      else {
        h += '<div class="table-wrap stack"><table><thead><tr><th>Personne</th><th>Absences</th><th>Jours</th></tr></thead><tbody>';
        for (var i = 0; i < e.par_personne.length; i++) { var p = e.par_personne[i]; h += '<tr><td data-l="Personne">' + esc(p.nom) + (p.cible === 'beneficiaire' ? ' <span class="badge grey">Bénéficiaire</span>' : '') + '</td><td data-l="Absences">' + p.nb + '</td><td data-l="Jours"><b>' + p.jours + '</b></td></tr>'; }
        h += '</tbody></table></div><p class="muted">Par motif : ' + e.par_motif.map(function (m) { return esc(lib(m.motif)) + ' ' + m.jours + ' j'; }).join(' · ') + '. Taux = jours d\'absence ÷ (intervenants actifs × jours de la période).</p>';
      }
      zone.innerHTML = h;
      document.getElementById('e-du').onchange = document.getElementById('e-au').onchange = etat;
      document.getElementById('csv').onclick = function () { exporter(e.du, e.au); };
    });
  }
  function exporter(du, au) {
    appel('absences.php?du=' + du + '&au=' + au).then(function (r) {
      if (!r.ok) return;
      var l = [['Personne', 'Type', 'Motif', 'Du', 'Au', 'Interventions touchees', 'Commentaire']];
      r.data.items.forEach(function (a) { l.push([a.nom, a.cible, lib(a.motif), a.date_debut, a.date_fin, a.impactees, a.commentaire || '']); });
      var csv = '﻿' + l.map(function (x) { return x.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'absences-' + du + '-' + au + '.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
  }

  // ---------- Formulaire ----------
  function quitterEdition() {
    edition = 0; document.getElementById('f-titre').textContent = 'Déclarer une absence'; document.getElementById('annule-edit').hidden = true;
    document.getElementById('ok').textContent = "Enregistrer l'absence";
    if (gestion) { document.getElementById('c_cible').disabled = false; document.getElementById('c_personne').disabled = false; }
    document.getElementById('f').reset(); document.getElementById('c_date_debut').value = document.getElementById('c_date_fin').value = aujourdhui();
  }
  function info(t) { var m = document.getElementById('info'); m.textContent = t; m.hidden = !t; }
  contenu.addEventListener('change', function (e) { if (e.target.id === 'c_cible') { motifs(); personnes(); } if (e.target.id === 'f-cible' || e.target.id === 'f-tout') charger(); });
  document.getElementById('annule-edit').onclick = quitterEdition;
  document.getElementById('f').addEventListener('submit', function (ev) {
    ev.preventDefault(); effacerErreurs(); info('');
    var corps = {}, ch = this.elements, i;
    for (i = 0; i < ch.length; i++) if (ch[i].name) corps[ch[i].name] = ch[i].value;
    if (gestion && !edition) { var pid = document.getElementById('c_personne').value; corps[corps.cible === 'intervenant' ? 'id_intervenant' : 'id_beneficiaire'] = Number(pid) || 0; }
    var b = document.getElementById('ok'); b.disabled = true;
    appel('absences.php' + (edition ? '?id=' + edition : ''), { method: edition ? 'PUT' : 'POST', body: JSON.stringify(corps) }).then(function (r) {
      b.disabled = false;
      if (!r.ok) { montrerErreurs(r); return; }
      var n = (r.data.impactees || []).length, nouvelle = !edition;
      quitterEdition(); charger(); if (gestion) etat();
      info((nouvelle ? 'Absence enregistrée.' : 'Absence modifiée.') + (n ? ' ' + n + ' intervention(s) à réorganiser.' : (soi ? ' Votre coordinateur est prévenu.' : '')));
      if (n) detail(r.data.id);
      window.scrollTo(0, 0);
    }, function () { b.disabled = false; });
  });

  contenu.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-det],[data-edit],[data-annuler],[data-reaff],[data-annuler-i]') : null; if (!t) return;
    if (t.hasAttribute('data-det')) { detail(Number(t.getAttribute('data-det'))); document.getElementById('detail').scrollIntoView(); }
    else if (t.hasAttribute('data-edit')) {
      var id = Number(t.getAttribute('data-edit'));
      appel('absences.php?id=' + id).then(function (r) {
        if (!r.ok) return; var a = r.data.item; edition = id;
        document.getElementById('f-titre').textContent = "Modifier l'absence de " + a.nom; document.getElementById('annule-edit').hidden = false; document.getElementById('ok').textContent = 'Enregistrer les modifications';
        if (gestion) { document.getElementById('c_cible').value = a.cible; motifs(); document.getElementById('c_cible').disabled = true; document.getElementById('c_personne').innerHTML = '<option>' + esc(a.nom) + '</option>'; document.getElementById('c_personne').disabled = true; }
        document.getElementById('c_motif').value = a.motif; document.getElementById('c_date_debut').value = a.date_debut; document.getElementById('c_date_fin').value = a.date_fin;
        document.getElementById('c_commentaire').value = a.commentaire || ''; document.getElementById('c_justificatif').value = a.justificatif || '';
        window.scrollTo(0, 0);
      });
    } else if (t.hasAttribute('data-annuler')) {
      if (!window.confirm("Annuler cette absence ? Les interventions déjà annulées ou réaffectées ne seront pas rétablies.")) return;
      appel('absences.php?id=' + t.getAttribute('data-annuler'), { method: 'PUT', body: JSON.stringify({ annuler: true }) }).then(function (r) { if (r.ok) { document.getElementById('detail').hidden = true; charger(); if (gestion) etat(); } else info(r.data.message || 'Erreur.'); });
    } else if (t.hasAttribute('data-reaff')) {
      var ligne = t.closest('tr'), idI = Number(t.getAttribute('data-reaff')), nv = Number(ligne.querySelector('select').value);
      t.disabled = true;
      appel('interventions.php?id=' + idI, { method: 'PUT', body: JSON.stringify({ id_intervenant: nv }) }).then(function (r) {
        if (r.ok) { info('Intervention réaffectée : les personnes concernées sont notifiées.'); detail(ouverte); charger(); if (gestion) etat(); }
        else { t.disabled = false; var m = document.getElementById('det-msg'); m.textContent = r.data.message || 'Erreur.'; m.hidden = false; }
      });
    } else if (t.hasAttribute('data-annuler-i')) {
      if (!window.confirm("Annuler cette intervention ? Le bénéficiaire et ses proches autorisés seront notifiés.")) return;
      appel('interventions.php?id=' + t.getAttribute('data-annuler-i'), { method: 'PUT', body: JSON.stringify({ statut: 'annulee' }) }).then(function (r) {
        if (r.ok) { info('Intervention annulée.'); detail(ouverte); charger(); } else { var m = document.getElementById('det-msg'); m.textContent = r.data.message || 'Erreur.'; m.hidden = false; }
      });
    }
  });
  charger();
});
