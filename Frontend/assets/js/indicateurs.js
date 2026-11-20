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
  function nf(x) { return String(x).replace('.', ','); }
  var COUL = { brand: '#1f6f8b', ok: '#1d7a4b', warn: '#b9770e', violet: '#6b4fb0', danger: '#b3261e', rose: '#e0897f', gris: '#c4ced7' };
  // Un chiffre clé avec, dessous, la comparaison à la période précédente.
  function kpi(v, l, t, cmp) { return '<div class="card kpi-i t-' + t + '"><span>' + l + '</span><b>' + v + '</b>' + (cmp || '<small class="delta">&nbsp;</small>') + '</div>'; }
  // mode : 'rel' (variation en %), 'pts' (écart en points), 'j' (écart en jours) ; haut : true si une hausse est une bonne chose.
  function delta(cour, prec, mode, haut) {
    if (cour === null || cour === undefined || prec === null || prec === undefined) return '<small class="delta">&nbsp;</small>';
    var ecart = cour - prec, txt, arr;
    if (mode === 'rel') { if (!prec) return '<small class="delta">&nbsp;</small>'; ecart = (cour - prec) * 100 / prec; arr = Math.round(ecart); txt = Math.abs(arr) + ' %'; }
    else { arr = Math.round(ecart * 10) / 10; txt = nf(Math.abs(arr)) + (mode === 'j' ? ' j' : ' pt' + (Math.abs(arr) >= 2 ? 's' : '')); }
    if (arr === 0) return '<small class="delta eq">= stable vs période préc.</small>';
    var bon = (arr > 0) === haut;
    return '<small class="delta ' + (bon ? 'up' : 'dn') + '">' + (arr > 0 ? '▲ ' : '▼ ') + txt + ' vs période préc.</small>';
  }
  function donut(p, couleur, taille, texte) {
    var r = 40, c = 2 * Math.PI * r, v = p === null || p === undefined ? 0 : Math.max(0, Math.min(100, p));
    return '<svg class="graph" width="' + taille + '" height="' + taille + '" viewBox="0 0 100 100" role="img" aria-label="' + esc(texte) + '"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="#e6ecf1" stroke-width="13"/>' +
      '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + couleur + '" stroke-width="13" stroke-linecap="' + (v < 10 ? 'butt' : 'round') + '" stroke-dasharray="' + (c * v / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 50 50)"/>' +
      '<text x="50" y="55" text-anchor="middle" font-size="15" font-weight="700" fill="#1f2d3a">' + esc(texte) + '</text></svg>';
  }
  function jauge(p, couleur, texte) {
    var c = Math.PI * 70, v = p === null || p === undefined ? 0 : Math.max(0, Math.min(100, p));
    return '<svg class="graph" width="210" height="122" viewBox="0 0 180 105" role="img" aria-label="' + esc(texte) + '"><path d="M20 90A70 70 0 0 1 160 90" fill="none" stroke="#e6ecf1" stroke-width="16" stroke-linecap="round"/>' +
      '<path d="M20 90A70 70 0 0 1 160 90" fill="none" stroke="' + couleur + '" stroke-width="16" stroke-linecap="round" stroke-dasharray="' + (c * v / 100).toFixed(1) + ' ' + c.toFixed(1) + '"/>' +
      '<text x="90" y="88" text-anchor="middle" font-size="26" font-weight="700" fill="#1f2d3a">' + esc(texte) + '</text></svg>';
  }
  // Une ligne « libellé — barre — valeur » ; fond = part prévue (facultatif), barre = part réalisée.
  function ligneBarre(lib, pct, couleur, val, fond) {
    return '<div class="hb"><span>' + lib + '</span><u>' + (fond ? '<i class="fond" style="width:' + fond + '%;background:' + couleur + '"></i>' : '') + '<i style="width:' + Math.max(0, Math.min(100, pct)) + '%;background:' + couleur + '"></i></u><em>' + val + '</em></div>';
  }
  function etoiles(m) { var h = ''; for (var k = 1; k <= 5; k++) h += '<span class="' + (k <= Math.round(m) ? 'etoile' : 'etoile off') + '">★</span>'; return h; }
  function histogramme(serie) {
    var max = 0, h = '', k;
    for (k = 0; k < serie.length; k++) max = Math.max(max, serie[k].realisees, serie[k].annulees);
    if (!max) return '<p class="empty">Aucune intervention réalisée ou annulée sur la période.</p>';
    h = '<div class="histo' + (serie.length > 8 ? ' dense' : '') + '">';
    for (k = 0; k < serie.length; k++) {
      h += '<div class="col"><div class="paire"><i class="r" style="height:' + Math.round(serie[k].realisees / max * 100) + '%" title="' + serie[k].realisees + ' réalisée(s)"></i><i class="a" style="height:' + Math.round(serie[k].annulees / max * 100) + '%" title="' + serie[k].annulees + ' annulée(s)"></i></div><span>' + serie[k].libelle + '</span></div>';
    }
    return h + '</div><div class="legende"><span><b style="background:' + COUL.brand + '"></b>Réalisées</span><span><b style="background:' + COUL.rose + '"></b>Annulées</span></div>';
  }
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
    var a = d.activite, b = d.absenteisme, p = d.delais, q = d.qualite, c = d.couts, cr = q.comptes_rendus, pr = d.precedent || {}, sa = d.satisfaction, h = '', i;
    document.getElementById('periode').textContent = 'Du ' + d.du.split('-').reverse().join('/') + ' au ' + d.au.split('-').reverse().join('/') + ' (' + d.nb_jours + ' jours)';

    // 1. Quatre chiffres clés + comparaison à la période précédente
    h += '<section class="kpis n4">' +
      kpi(a.realisees, 'Interventions réalisées', 'brand', delta(a.realisees, pr.realisees, 'rel', true)) +
      kpi(pct(a.taux_realisation), 'Taux de réalisation', 'ok', delta(a.taux_realisation, pr.taux_realisation, 'pts', true)) +
      kpi(pct(b.taux), 'Taux d\'absentéisme', 'warn', delta(b.taux, pr.taux_absenteisme, 'pts', false)) +
      kpi(num(p.delai_moyen_jours, ' j'), 'Délai moyen de prise en charge', 'violet', delta(p.delai_moyen_jours, pr.delai_moyen_jours, 'j', false)) + '</section>' +
      (pr.du ? '<p class="muted comp">Comparaison avec la période précédente, du ' + pr.du.split('-').reverse().join('/') + ' au ' + pr.au.split('-').reverse().join('/') + '.</p>' : '');

    // 2. Réalisation, absentéisme, satisfaction
    h += '<div class="ind-g ' + (sa ? 'g3' : 'g2') + '">' +
      '<section class="card t-brand centre"><h2>Réalisation</h2>' + jauge(a.taux_realisation, COUL.brand, pct(a.taux_realisation)) +
        '<p class="muted">' + a.realisees + ' réalisées · ' + a.annulees + ' annulées (' + pct(a.taux_annulation) + ') · ' + a.non_realisees + ' échue(s) non réalisée(s)</p><p class="muted">' + num(a.heures_realisees, ' h') + ' réalisées · ' + a.a_venir + ' à venir</p></section>' +
      '<section class="card t-warn"><h2>Absentéisme</h2><div class="don">' + donut(b.taux, COUL.warn, 120, pct(b.taux)) +
        '<ul class="i-lg"><li><b style="background:' + COUL.warn + '"></b>Planifiées : ' + b.jours_planifiees + ' j</li><li><b style="background:' + COUL.rose + '"></b>Imprévues : ' + b.jours_imprevues + ' j</li><li class="muted">' + b.jours_absence + ' jour(s) d\'absence au total</li><li class="muted">' + b.absences_beneficiaires + ' absence(s) de bénéficiaires</li></ul></div>' +
        '<p class="muted">Taux = jours d\'absence ÷ (' + b.intervenants_actifs + ' intervenant(s) actif(s) × ' + d.nb_jours + ' jours).</p></section>';
    if (sa) {
      h += '<section class="card t-ok"><h2>Satisfaction</h2><div class="i-note"><b>' + (sa.moyenne === null ? 'n/a' : nf(sa.moyenne)) + '</b><span class="muted"> / 5</span><div>' + (sa.moyenne === null ? '' : etoiles(sa.moyenne)) + '<div class="muted">' + sa.nb_avis + ' avis · ' + sa.notes_basses + ' note(s) ≤ 2</div></div></div>';
      var mx = 0, nn; for (nn = 1; nn <= 5; nn++) mx = Math.max(mx, sa.repartition[nn]);
      for (nn = 5; nn >= 1; nn--) h += ligneBarre(nn + ' ★', mx ? sa.repartition[nn] * 100 / mx : 0, nn <= 2 ? COUL.rose : nn === 3 ? COUL.gris : COUL.ok, sa.repartition[nn]);
      h += '<p class="muted">Visites notées : ' + pct(sa.taux_reponse) + ' des visites réalisées.</p></section>';
    }
    h += '</div>';
    if (sa) h += '<section class="card t-warn"><header><h2>Derniers commentaires</h2></header><div id="avis"><p class="empty">Chargement…</p></div></section>';

    // 3. Interventions par semaine / mois + qualité
    var gr = '', col = { faible: '#e0a100', moyenne: '#e07a1f', grave: COUL.danger, critique: COUL.danger }, tot = q.incidents.total || 1;
    for (i = 0; i < q.incidents.par_gravite.length; i++) gr += ligneBarre(esc(LIBELLES[q.incidents.par_gravite[i].gravite] || q.incidents.par_gravite[i].gravite), q.incidents.par_gravite[i].nb * 100 / tot, col[q.incidents.par_gravite[i].gravite] || COUL.gris, q.incidents.par_gravite[i].nb);
    h += '<div class="ind-g g21"><section class="card t-brand"><h2>Interventions par ' + (d.serie_par === 'mois' ? 'mois' : 'semaine') + '</h2>' + histogramme(d.serie || []) + '</section>' +
      '<section class="card t-ok"><h2>Qualité</h2>' + ligneBarre('Comptes rendus saisis', cr.taux_saisie || 0, COUL.ok, pct(cr.taux_saisie)) + ligneBarre('Comptes rendus validés', cr.taux_validation || 0, COUL.ok, pct(cr.taux_validation)) +
        '<p class="muted i-sep">Incidents : ' + q.incidents.total + ' (' + q.incidents.non_traites + ' non traité(s))</p>' + (gr || '<p class="empty">Aucun incident sur la période.</p>') +
        '<p class="muted">' + cr.sans + ' intervention(s) échue(s) sans compte rendu, ' + cr.a_valider + ' compte(s) rendu(s) à valider.</p></section></div>';

    // 4. Délais + par type d'intervention
    var mt = 0, t; for (t = 0; t < d.par_type.length; t++) mt = Math.max(mt, d.par_type[t].prevues);
    var ty = ''; for (t = 0; t < d.par_type.length; t++) ty += ligneBarre(esc(LIBELLES[d.par_type[t].type] || d.par_type[t].type), mt ? d.par_type[t].realisees * 100 / mt : 0, COUL.brand, d.par_type[t].realisees + ' / ' + d.par_type[t].prevues, mt ? d.par_type[t].prevues * 100 / mt : 0);
    h += '<div class="ind-g g2"><section class="card t-violet"><h2>Délais de prise en charge</h2><div class="mini">' +
      '<div><b>' + p.dossiers + '</b><span>Nouveaux dossiers</span></div><div><b>' + num(p.delai_moyen_jours, ' j') + '</b><span>Délai moyen</span></div><div><b>' + num(p.delai_max_jours, ' j') + '</b><span>Délai maximum</span></div><div><b>' + p.en_attente + '</b><span>En attente d\'intervention</span></div></div>' +
      '<p class="muted">Délai = jours entre la création du dossier et la première intervention non annulée.</p></section>' +
      '<section class="card t-violet"><h2>Par type d\'intervention</h2>' + (ty || '<p class="empty">Aucune donnée sur la période.</p>') + '<p class="muted">Barre pleine = réalisées ; fond clair = prévues (hors annulées). Valeur : réalisées / prévues.</p></section></div>';

    // 5. Par intervenant
    var li = [], mr = 0, v; for (v = 0; v < d.par_intervenant.length; v++) mr = Math.max(mr, d.par_intervenant[v].realisees);
    for (v = 0; v < d.par_intervenant.length; v++) li.push([esc(d.par_intervenant[v].nom), d.par_intervenant[v].realisees, '<div class="i-piste"><i style="width:' + (mr ? Math.round(d.par_intervenant[v].realisees * 100 / mr) : 0) + '%"></i></div>', d.par_intervenant[v].annulees, num(d.par_intervenant[v].heures, ' h')]);
    h += '<section class="card t-violet"><header><h2>Par intervenant</h2></header><div class="table-wrap stack">' + tableau(['Intervenant', 'Réalisées', 'Charge', 'Annulées', 'Heures'], li) + '</div></section>';

    // 6. Coûts (direction)
    if (c) h += '<h2 class="sect s-warn">Coûts</h2><section class="kpis couts">' + '<div class="card kpi-i t-warn"><span>Facturé (' + c.nb_factures + ' facture' + (c.nb_factures > 1 ? 's' : '') + ')</span><b>' + argent(c.facture) + '</b></div>' +
      '<div class="card kpi-i t-ok"><span>Encaissé</span><b>' + argent(c.encaisse) + '</b></div><div class="card kpi-i t-danger"><span>Reste à payer</span><b>' + argent(c.reste_a_payer) + '</b></div><div class="card kpi-i t-brand"><span>Coût moyen / intervention</span><b>' + argent(c.cout_moyen_intervention) + '</b></div></section>' +
      '<p class="muted">Dont part des organismes payeurs : ' + argent(c.part_organismes) + ' ; reste à charge des bénéficiaires : ' + argent(c.reste_a_charge_beneficiaires) + '.</p>';

    document.getElementById('res').innerHTML = h;
    chargerAvis();
    document.getElementById('export').href = API + 'indicateurs.php?export=csv&' + params();
    if (!rempli) {
      rempli = true;
      var so = ''; for (var x = 0; x < d.secteurs.length; x++) so += '<option value="' + d.secteurs[x].id + '">' + esc(d.secteurs[x].libelle) + '</option>';
      document.getElementById('sec').insertAdjacentHTML('beforeend', so);
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
