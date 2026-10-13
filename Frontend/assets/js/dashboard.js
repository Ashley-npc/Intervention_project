// Tableau de bord réel : coordinateur, administrateur, intervenant, qualité, direction (chiffres calculés par api/dashboard.php).
Shell.demarrer(function (contenu, user) {
  document.title = 'Tableau de bord · Suivi à domicile';
  var gestion = user.role === 'coordinateur' || user.role === 'administrateur';
  appel('dashboard.php').then(function (r) {
    if (!r.ok) { Shell.erreur(contenu, r.data.message || 'Erreur.'); return; }
    var d = r.data, h = '';
    function kpi(valeur, libelle, lien, alerte) {
      var b = '<b' + (alerte && valeur > 0 ? ' class="alerte"' : '') + '>' + valeur + '</b><span>' + libelle + '</span>';
      return '<div class="card kpi">' + (lien ? '<a href="' + FRONT + lien + '">' + b + '</a>' : '<div>' + b + '</div>') + '</div>';
    }
    function agenda(items, lien) {
      if (!items.length) return '<p class="empty">Aucune intervention aujourd\'hui.</p>';
      var s = '<ul class="agenda">';
      for (var i = 0; i < items.length; i++) {
        var x = items[i];
        s += '<li><time>' + x.heure_debut + '<span>' + x.heure_fin + '</span></time><div><b>' + esc(x.beneficiaire_prenom + ' ' + x.beneficiaire_nom) + '</b><span>' +
             esc(lib(x.type)) + ' · ' + esc(x.intervenant_prenom + ' ' + x.intervenant_nom) + '</span></div><aside class="cote"><span class="tags">' + badgeStatut(x) + '</span>' +
             (lien ? '<a class="btn small" href="' + FRONT + lien + '?id=' + x.id + '">Ouvrir</a>' : '') + '</aside></li>';
      }
      return s + '</ul>';
    }
    if (user.role === 'facturation') {
      var k = d.kpis;
      h = '<div class="page-head"><div><h1>Facturation</h1><p>' + dateLongue(aujourdhui()) + '</p></div><a class="btn" href="' + FRONT + 'facturation/nouvelle.html">+ Nouvelle facture</a></div>' +
          '<section class="kpis">' + kpi(argent(k.facture_mois), 'Facturé ce mois-ci', 'facturation/factures.html').replace('<b>', '<b class="long">') + kpi(argent(k.encaisse_mois), 'Encaissé ce mois-ci', 'facturation/factures.html').replace('<b>', '<b class="long">') +
          kpi(argent(k.reste_a_payer), 'Reste à payer', 'facturation/factures.html?statut=impayee').replace('<b>', '<b class="long">') + kpi(k.a_facturer, 'Interventions à facturer', 'facturation/nouvelle.html', true) + '</section>' +
          '<div class="grid-2"><section class="card"><header><h2>Dernières factures</h2><a class="link" href="' + FRONT + 'facturation/factures.html">Tout voir</a></header>';
      if (!d.dernieres.length) h += '<p class="empty">Aucune facture pour le moment.</p>';
      else { h += '<ul class="agenda">'; for (var f = 0; f < d.dernieres.length; f++) { var fa = d.dernieres[f]; h += '<li><div><b><a href="' + FRONT + 'facturation/facture.html?id=' + fa.id + '">' + esc(fa.numero) + '</a></b><span>' + esc(fa.prenom + ' ' + fa.nom) + ' · ' + argent(fa.montant_total) + '</span></div>' + badgeFacture(fa.statut) + '</li>'; } h += '</ul>'; }
      h += '</section><section class="card"><header><h2>À surveiller</h2></header><ul class="alerts">' + alerte(k.en_retard, 'Factures en retard', 'Non payées depuis plus de 30 jours.', 'Aucun retard de paiement.', 'facturation/factures.html?statut=impayee') +
           alerte(k.a_facturer, 'Interventions à facturer', 'Validées, pas encore facturées.', 'Tout est facturé.', 'facturation/nouvelle.html') + '</ul></section></div>';
    } else if (user.role === 'intervenant') {
      if (!d.lie) { contenu.innerHTML = '<div class="page-head"><div><h1>Bonjour</h1></div></div><p class="msg-err">Votre compte n\'est lié à aucune fiche intervenant. Demandez à l\'administrateur.</p>'; return; }
      h = '<div class="page-head"><div><h1>Bonjour ' + esc(d.prenom) + '</h1><p>' + dateLongue(aujourdhui()) + '</p></div></div>' +
          '<section class="kpis">' + kpi(d.kpis.aujourdhui, "Interventions aujourd'hui", 'espace-intervenant/planning.html') + kpi(d.kpis.semaine, 'Interventions cette semaine', 'espace-intervenant/planning.html') +
          kpi(d.kpis.a_saisir, 'Comptes rendus à saisir', 'espace-intervenant/planning.html', true) + '</section>' +
          '<section class="card"><header><h2>Ma journée</h2><a class="link" href="' + FRONT + 'espace-intervenant/planning.html">Voir mon planning</a></header>' + agendaIntervenant(d.aujourdhui) + '</section>';
    } else {
      var k = d.kpis;
      h = '<div class="page-head"><div><h1>Tableau de bord</h1><p>' + dateLongue(aujourdhui()) + '</p></div>' +
          (gestion ? '<a class="btn" href="' + FRONT + 'interventions/form.html">+ Nouvelle intervention</a>' : '') + '</div>' +
          '<section class="kpis">' + kpi(k.semaine, 'Interventions cette semaine', gestion ? 'interventions/planning.html' : '') +
          kpi(k.beneficiaires, 'Bénéficiaires actifs', gestion ? 'beneficiaires/liste.html' : '') +
          kpi(k.a_valider, 'Comptes rendus à valider', gestion ? 'interventions/comptes-rendus.html' : '', true) +
          kpi(k.conflits, "Conflits d'horaires", '', true) + '</section>';
      if (user.role === 'administrateur') h += '<section class="kpis">' + kpi(k.utilisateurs, 'Comptes actifs', 'admin/utilisateurs.html') + kpi(k.intervenants, 'Intervenants actifs', 'intervenants/liste.html') +
          kpi(k.sans_cr, 'Interventions sans compte rendu', 'interventions/comptes-rendus.html?etat=sans', true) + kpi(k.urgentes, 'Interventions urgentes à venir', 'interventions/planning.html', true) + '</section>';
      h += '<div class="grid-2"><section class="card"><header><h2>Interventions du jour</h2>' + (gestion ? '<a class="link" href="' + FRONT + 'interventions/planning.html">Voir le planning</a>' : '') + '</header>' +
           agenda(d.aujourdhui, gestion ? 'interventions/fiche.html' : '') + '</section>' +
           '<section class="card"><header><h2>Charge des intervenants (semaine)</h2></header>';
      if (!d.charge.length) h += '<p class="empty">Aucune intervention cette semaine.</p>';
      else {
        var max = d.charge[0].minutes || 1; h += '<ul class="bars">';
        for (var i = 0; i < d.charge.length; i++) h += '<li><span>' + esc(d.charge[i].nom) + '</span><div class="track"><i style="width:' + Math.round(100 * d.charge[i].minutes / max) + '%"></i></div><b>' + (Math.round(d.charge[i].minutes / 6) / 10).toString().replace('.', ',') + ' h</b></li>';
        h += '</ul>';
      }
      h += '</section></div>';
      if (gestion) h += '<section class="card"><header><h2>À surveiller</h2></header><ul class="alerts">' +
          alerte(k.conflits, "Conflits d'horaires", 'Chevauchements détectés dans le planning à venir.', 'Aucun chevauchement détecté.') +
          alerte(k.sans_cr, 'Interventions sans compte rendu', 'Interventions passées sans compte rendu.', 'Toutes les interventions passées sont documentées.', 'interventions/comptes-rendus.html?etat=sans') +
          alerte(k.a_valider, 'Comptes rendus à valider', 'En attente de validation par le coordinateur.', 'Rien à valider.', 'interventions/comptes-rendus.html') + '</ul></section>';
    }
    contenu.innerHTML = h;
  });
  function alerte(n, titre, si, sinon, lien) {
    var t = '<b>' + titre + '</b><span>' + (n > 0 ? si : sinon) + '</span>';
    return '<li><span class="badge ' + (n > 0 ? 'warn' : 'ok') + '">' + n + '</span><div>' + (n > 0 && lien ? '<a href="' + FRONT + lien + '">' + t + '</a>' : t) + '</div></li>';
  }
  function agendaIntervenant(items) {
    if (!items.length) return '<p class="empty">Aucune intervention aujourd\'hui.</p>';
    var s = '<ul class="agenda">';
    for (var i = 0; i < items.length; i++) {
      var x = items[i];
      s += '<li><time>' + x.heure_debut + '<span>' + x.heure_fin + '</span></time><div><b>' + esc(x.beneficiaire_prenom + ' ' + x.beneficiaire_nom) + '</b><span>' + esc(lib(x.type)) + ' · ' + esc(lib(x.lieu)) + '</span></div>' +
           '<aside class="cote"><span class="tags">' + badgeStatut(x) + '</span><a class="btn small" href="' + FRONT + 'espace-intervenant/compte-rendu.html?id=' + x.id + '">' + (x.a_compte_rendu ? 'Voir' : 'Ouvrir') + '</a></aside></li>';
    }
    return s + '</ul>';
  }
});
