// Indicateurs de pilotage (CDC 5.11) : direction, responsable qualité, coordinateur. Lecture seule + export CSV.
Shell.demarrer(function (contenu, user) {
  document.title = 'Indicateurs · Suivi à domicile';
  var debutMois = new Date(), fin = new Date(debutMois.getFullYear(), debutMois.getMonth() + 1, 0);
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  contenu.innerHTML = '<div class="page-head"><div><h1>Indicateurs</h1><p id="periode"></p></div><div class="actions"><a class="btn secondary" id="export" href="#">Exporter (CSV)</a></div></div>' +
    '<section class="card"><form id="f" novalidate><div class="form-grid">' +
    '<div class="field"><label for="du">Du</label><input id="du" type="date" value="' + iso(new Date(debutMois.getFullYear(), debutMois.getMonth(), 1)) + '"></div>' +
    '<div class="field"><label for="au">Au</label><input id="au" type="date" value="' + iso(fin) + '"></div>' +
    '<div class="field"><label for="sec">Secteur</label><select id="sec"><option value="">Tous</option></select></div>' +
    '<div class="field"><label for="inter">Intervenant</label><select id="inter"><option value="">Tous</option></select></div>' +
    '</div><p class="msg-err" id="msg" hidden></p><div class="actions"><button class="btn" type="submit">Afficher</button></div></form></section>' +
    '<div id="res"></div>';
  var rempli = false;
  function pct(x) { return x === null || x === undefined ? 'n/a' : String(x).replace('.', ',') + ' %'; }
  function num(x, u) { return x === null || x === undefined ? 'n/a' : String(x).replace('.', ',') + (u || ''); }
  function argent(x) { return x === null || x === undefined ? 'n/a' : Number(x).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
  function kpi(v, l, t) { return '<div class="card kpi t-' + t + '"><div><b class="long">' + v + '</b><span>' + l + '</span></div></div>'; }
  function params() {
    var p = 'du=' + encodeURIComponent(document.getElementById('du').value) + '&au=' + encodeURIComponent(document.getElementById('au').value);
    var s = document.getElementById('sec').value, v = document.getElementById('inter').value;
    if (s) p += '&id_secteur=' + s; if (v) p += '&id_intervenant=' + v;
    return p;
  }
  function tableau(entetes, lignes) {
    if (!lignes.length) return '<p class="empty">Aucune donnée sur la période.</p>';
    var h = '<table><thead><tr>'; for (var i = 0; i < entetes.length; i++) h += '<th>' + entetes[i] + '</th>'; h += '</tr></thead><tbody>';
    for (var j = 0; j < lignes.length; j++) { h += '<tr>'; for (var k = 0; k < lignes[j].length; k++) h += '<td data-l="' + entetes[k] + '">' + lignes[j][k] + '</td>'; h += '</tr>'; }
    return h + '</tbody></table>';
  }
  function afficher(d) {
    var a = d.activite, b = d.absenteisme, p = d.delais, q = d.qualite, c = d.couts, cr = q.comptes_rendus;
    document.getElementById('periode').textContent = 'Du ' + d.du.split('-').reverse().join('/') + ' au ' + d.au.split('-').reverse().join('/') + ' (' + d.nb_jours + ' jours)';
    var h = '<h2 class="sect s-brand">Activité</h2><section class="kpis">' + kpi(a.realisees, 'Interventions réalisées', 'brand') + kpi(pct(a.taux_realisation), 'Taux de réalisation', 'brand') +
      kpi(a.annulees + ' (' + pct(a.taux_annulation) + ')', 'Annulées', 'brand') + kpi(num(a.heures_realisees, ' h'), 'Heures réalisées', 'brand') + '</section>' +
      '<p class="muted">Taux de réalisation = réalisées ÷ interventions échues (réalisées + annulées + passées non réalisées). ' + a.non_realisees + ' échue(s) non réalisée(s), ' + a.a_venir + ' à venir.</p>';
    h += '<h2 class="sect s-warn">Absentéisme</h2><section class="kpis">' + kpi(pct(b.taux), "Taux d'absentéisme (intervenants)", 'warn') + kpi(b.jours_absence, "Jours d'absence", 'warn') +
      kpi(b.jours_planifiees + ' / ' + b.jours_imprevues, 'Planifiées / imprévues (jours)', 'warn') + kpi(b.absences_beneficiaires, 'Absences de bénéficiaires', 'warn') + '</section>' +
      '<p class="muted">Taux = jours d\'absence ÷ (' + b.intervenants_actifs + ' intervenant(s) actif(s) × ' + d.nb_jours + ' jours). Le filtre intervenant ne s\'applique pas aux délais ni aux coûts.</p>';
    h += '<h2 class="sect s-violet">Délais de prise en charge</h2><section class="kpis">' + kpi(p.dossiers, 'Nouveaux dossiers', 'violet') + kpi(num(p.delai_moyen_jours, ' j'), 'Délai moyen', 'violet') +
      kpi(num(p.delai_max_jours, ' j'), 'Délai maximum', 'violet') + kpi(p.en_attente, 'En attente d\'intervention', 'violet') + '</section>' +
      '<p class="muted">Délai = jours entre la création du dossier et la première intervention non annulée.</p>';
    var gr = ''; for (var i = 0; i < q.incidents.par_gravite.length; i++) gr += (gr ? ', ' : '') + esc(LIBELLES[q.incidents.par_gravite[i].gravite] || q.incidents.par_gravite[i].gravite) + ' : ' + q.incidents.par_gravite[i].nb;
    h += '<h2 class="sect s-ok">Qualité</h2><section class="kpis">' + kpi(q.incidents.total, 'Incidents', 'ok') + kpi(q.incidents.non_traites, 'Incidents non traités', 'ok') +
      kpi(pct(cr.taux_saisie), 'Comptes rendus saisis', 'ok') + kpi(pct(cr.taux_validation), 'Comptes rendus validés', 'ok') + '</section>' +
      '<p class="muted">' + (gr ? 'Gravité : ' + gr + '. ' : '') + cr.sans + ' intervention(s) échue(s) sans compte rendu, ' + cr.a_valider + ' compte(s) rendu(s) à valider.</p>';
    var sa = d.satisfaction;
    if (sa) h += '<h2 class="sect s-brand">Satisfaction des bénéficiaires</h2><section class="kpis">' + kpi(sa.moyenne === null ? 'n/a' : num(sa.moyenne, ' / 5'), 'Note moyenne', 'brand') + kpi(sa.nb_avis, 'Avis reçus', 'brand') +
      kpi(pct(sa.taux_reponse), 'Visites notées', 'brand') + kpi(sa.notes_basses, 'Notes de 2 ou moins', 'brand') + '</section>' +
      '<p class="muted">Répartition des notes : ' + [5, 4, 3, 2, 1].map(function (n) { return n + ' : ' + sa.repartition[n]; }).join(' · ') + '. Visites notées = avis reçus ÷ visites réalisées de la période.</p>' +
      '<section class="card t-warn"><header><h2>Derniers commentaires</h2></header><div id="avis"><p class="empty">Chargement…</p></div></section>';
    if (c) h += '<h2 class="sect s-warn">Coûts</h2><section class="kpis">' + kpi(argent(c.facture), 'Facturé (' + c.nb_factures + ' facture' + (c.nb_factures > 1 ? 's' : '') + ')', 'warn') + kpi(argent(c.encaisse), 'Encaissé', 'warn') +
      kpi(argent(c.reste_a_payer), 'Reste à payer', 'warn') + kpi(argent(c.cout_moyen_intervention), 'Coût moyen / intervention', 'warn') + '</section>' +
      '<p class="muted">Dont part des organismes payeurs : ' + argent(c.part_organismes) + ' ; reste à charge des bénéficiaires : ' + argent(c.reste_a_charge_beneficiaires) + '.</p>';
    var lt = []; for (var t = 0; t < d.par_type.length; t++) lt.push([esc(LIBELLES[d.par_type[t].type] || d.par_type[t].type), d.par_type[t].prevues, d.par_type[t].realisees, d.par_type[t].annulees]);
    var li = []; for (var v = 0; v < d.par_intervenant.length; v++) li.push([esc(d.par_intervenant[v].nom), d.par_intervenant[v].realisees, d.par_intervenant[v].annulees, num(d.par_intervenant[v].heures, ' h')]);
    h += '<section class="card t-violet"><header><h2>Par type d\'intervention</h2></header><div class="table-wrap stack">' + tableau(['Type', 'Prévues', 'Réalisées', 'Annulées'], lt) + '</div></section>' +
         '<section class="card t-ok"><header><h2>Par intervenant</h2></header><div class="table-wrap stack">' + tableau(['Intervenant', 'Réalisées', 'Annulées', 'Heures'], li) + '</div></section>';
    document.getElementById('res').innerHTML = h;
    chargerAvis();
    document.getElementById('export').href = API + 'indicateurs.php?export=csv&' + params();
    if (!rempli) {
      rempli = true;
      var s = ''; for (var x = 0; x < d.secteurs.length; x++) s += '<option value="' + d.secteurs[x].id + '">' + esc(d.secteurs[x].libelle) + '</option>';
      document.getElementById('sec').insertAdjacentHTML('beforeend', s);
      var n = ''; for (var y = 0; y < d.intervenants.length; y++) n += '<option value="' + d.intervenants[y].id + '">' + esc(d.intervenants[y].prenom + ' ' + d.intervenants[y].nom) + '</option>';
      document.getElementById('inter').insertAdjacentHTML('beforeend', n);
    }
  }
  // Derniers commentaires des bénéficiaires (sans leur nom), sur la même période et les mêmes filtres.
  function chargerAvis() {
    var u = 'evaluations.php?avec_commentaire=1&taille=5&' + params();
    appel(u).then(function (r) {
      var z = document.getElementById('avis'); if (!z) return;
      if (!r.ok) { z.innerHTML = '<p class="muted">Commentaires non disponibles.</p>'; return; }
      if (!r.data.items.length) { z.innerHTML = '<p class="empty">Aucun commentaire sur la période.</p>'; return; }
      var h = '<ul class="avis">';
      r.data.items.forEach(function (a) {
        h += '<li><span class="badge ' + (a.note <= 2 ? 'danger' : a.note >= 4 ? 'ok' : '') + '">' + a.note + ' / 5</span> <span class="muted">' + dateFr(a.date) + ' · ' + esc(a.intervenant_prenom + ' ' + a.intervenant_nom) + '</span><p>' + esc(a.commentaire) + '</p></li>';
      });
      z.innerHTML = h + '</ul>';
    });
  }
  function charger() {
    var m = document.getElementById('msg'); m.hidden = true;
    appel('indicateurs.php?' + params()).then(function (r) {
      if (!r.ok) { m.textContent = r.data.message || 'Erreur.'; m.hidden = false; return; }
      afficher(r.data);
    });
  }
  document.getElementById('f').addEventListener('submit', function (e) { e.preventDefault(); charger(); });
  charger();
});
