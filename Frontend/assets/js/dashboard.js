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
             esc(x.type) + ' · ' + esc(x.intervenant_prenom + ' ' + x.intervenant_nom) + '</span></div>' + badgeStatut(x) +
             (lien ? ' <a class="btn small" href="' + FRONT + lien + '?id=' + x.id + '">Ouvrir</a>' : '') + '</li>';
      }
      return s + '</ul>';
    }
    if (user.role === 'intervenant') {
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
      s += '<li><time>' + x.heure_debut + '<span>' + x.heure_fin + '</span></time><div><b>' + esc(x.beneficiaire_prenom + ' ' + x.beneficiaire_nom) + '</b><span>' + esc(x.type) + ' · ' + esc(x.lieu) + '</span></div>' +
           badgeStatut(x) + ' <a class="btn small" href="' + FRONT + 'espace-intervenant/compte-rendu.html?id=' + x.id + '">' + (x.a_compte_rendu ? 'Voir' : 'Ouvrir') + '</a></li>';
    }
    return s + '</ul>';
  }
});
