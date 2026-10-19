// Tableau de bord réel : coordinateur, administrateur, intervenant, qualité, direction (chiffres calculés par api/dashboard.php).
Shell.demarrer(function (contenu, user) {
  document.title = 'Tableau de bord · Suivi à domicile';
  var gestion = user.role === 'coordinateur' || user.role === 'administrateur';
  appel('dashboard.php').then(function (r) {
    if (!r.ok) { Shell.erreur(contenu, r.data.message || 'Erreur.'); return; }
    var d = r.data, h = '';
    function kpi(valeur, libelle, lien, alerte) {
      var b = '<b' + (alerte && valeur > 0 ? ' class="alerte"' : '') + '>' + valeur + '</b><span>' + libelle + '</span>';
      return '<div class="card kpi' + (lien ? ' lien' : '') + '">' + (lien ? '<a href="' + FRONT + lien + '">' + b + '</a>' : '<div>' + b + '</div>') + '</div>';
    }
    function agenda(items, lien) {
      if (!items.length) return '<p class="empty">Aucune intervention aujourd\'hui.</p>';
      var s = '<ul class="agenda">';
      for (var i = 0; i < items.length; i++) {
        var x = items[i];
        s += '<li><time>' + x.heure_debut + '<span>' + x.heure_fin + '</span></time><div><b>' + esc(x.beneficiaire_prenom + ' ' + x.beneficiaire_nom) + '</b><span>' +
             esc(lib(x.type)) + ' · ' + esc(x.intervenant_prenom + ' ' + x.intervenant_nom) + '</span></div><aside class="cote"><span class="tags">' + badgeStatut(x) + '</span>' +
             (lien ? btnIco('ouvrir', 'Ouvrir', 'href="' + FRONT + lien + '?id=' + x.id + '"', 'a') : '') + '</aside></li>';
      }
      return s + '</ul>';
    }
    if (user.role === 'facturation') {
      var k = d.kpis;
      h = '<div class="page-head"><div><h1>Facturation</h1><p>' + dateLongue(aujourdhui()) + '</p></div><a class="btn" href="' + FRONT + 'facturation/nouvelle.html">+ Nouvelle facture</a></div>' +
          '<section class="kpis">' + kpi(argent(k.facture_mois), 'Facturé ce mois-ci', 'facturation/factures.html').replace('<b>', '<b class="long">') + kpi(argent(k.encaisse_mois), 'Encaissé ce mois-ci', 'facturation/factures.html').replace('<b>', '<b class="long">') +
          kpi(argent(k.reste_a_payer), 'Reste à payer', 'facturation/a-facturer.html?onglet=payer').replace('<b>', '<b class="long">') + kpi(k.a_facturer, 'Interventions à facturer', 'facturation/a-facturer.html', true) + '</section>' +
          '<div class="grid-2"><section class="card"><header><h2>Dernières factures</h2><a class="link" href="' + FRONT + 'facturation/factures.html">Tout voir</a></header>';
      if (!d.dernieres.length) h += '<p class="empty">Aucune facture pour le moment.</p>';
      else { var cf = ''; for (var f = 0; f < d.dernieres.length; f++) { var fa = d.dernieres[f]; cf += factureCarte({ id: fa.id, numero: fa.numero, benef: fa.prenom + ' ' + fa.nom, statut: fa.statut, total: fa.montant_total, restant: Math.max(0, fa.montant_total - fa.paye), date: fa.date_emission }); } h += '<div class="rail une">' + cf + '</div>'; }
      h += '</section><section class="card"><header><h2>À surveiller</h2></header><ul class="alerts">' + alerte(k.en_retard, 'Factures en retard', 'Non payées depuis plus de 30 jours.', 'Aucun retard de paiement.', 'facturation/a-facturer.html?onglet=payer') +
           alerte(k.a_facturer, 'Interventions à facturer', 'Validées, pas encore facturées.', 'Tout est facturé.', 'facturation/a-facturer.html') + '</ul></section></div>';
    } else if (user.role === 'intervenant') {
      if (!d.lie) { contenu.innerHTML = '<div class="page-head"><div><h1>Bonjour</h1></div></div><p class="msg-err">Votre compte n\'est lié à aucune fiche intervenant. Demandez à l\'administrateur.</p>'; return; }
      h = '<div class="page-head"><div><h1>Bonjour ' + esc(d.prenom) + '</h1><p>' + dateLongue(aujourdhui()) + '</p></div></div>' +
          '<section class="kpis">' + kpi(d.kpis.aujourdhui, "Interventions aujourd'hui", 'espace-intervenant/planning.html') + kpi(d.kpis.semaine, 'Interventions cette semaine', 'espace-intervenant/planning.html') +
          kpi(d.kpis.a_saisir, 'Comptes rendus à saisir', 'espace-intervenant/planning.html', true) + '</section>' +
          '<section class="card"><header><h2>Ma journée</h2><a class="link" href="' + FRONT + 'espace-intervenant/planning.html">Voir mon planning</a></header>' + agendaIntervenant(d.aujourdhui) + '</section>';
    } else {
      var k = d.kpis, CAPACITE = 35;   // capacite hebdomadaire d'un intervenant (heures), pour la barre de charge
      var JOURS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'], i2, jrs = d.jours || [];
      function jm(dt) { var t = dateLongue(dt).split(' '); return t[1] + ' ' + t[2]; }
      h = '<div class="page-head"><div><h1>Tableau de bord</h1><p>' + dateLongue(aujourdhui()) + '</p></div>' +
          (gestion ? '<a class="btn" href="' + FRONT + 'interventions/form.html">+ Nouvelle intervention</a>' : '') + '</div>';
      // 1) vue d'ensemble : indicateurs principaux
      h += '<p class="surtitre">Vue d\'ensemble</p><section class="kpis' + (k.utilisateurs === undefined ? ' n3' : '') + '">' +
           kpi(k.semaine, 'Interventions cette semaine', gestion ? 'interventions/planning.html' : '') + kpi(k.beneficiaires, 'Bénéficiaires actifs', gestion ? 'beneficiaires/liste.html' : '') +
           kpi(k.intervenants, 'Intervenants actifs', gestion ? 'intervenants/liste.html' : '') + (k.utilisateurs !== undefined ? kpi(k.utilisateurs, 'Comptes actifs', 'admin/utilisateurs.html') : '') + '</section>';
      // 2) bande « a surveiller » : 4 pastilles (colorees seulement s'il y a une action a faire)
      function pastille(n, libelle, lien, rouge, sous) {
        var cl = 'pastille' + (n > 0 ? (rouge ? ' rouge' : ' orange') : ''), c = '<span class="badge">' + n + '</span><span class="pl">' + libelle + (sous ? '<small>' + sous + '</small>' : '') + '</span>';
        return n > 0 && lien ? '<a class="' + cl + '" href="' + FRONT + lien + '">' + c + '</a>' : '<div class="' + cl + '">' + c + '</div>';
      }
      var u = d.prochaine_urgence;
      h += '<section class="card surv"><div class="pastilles">' + pastille(k.sans_cr, 'Comptes rendus manquants', gestion ? 'interventions/comptes-rendus.html?etat=sans' : '', true) +
           pastille(k.a_valider, 'À valider', gestion ? 'interventions/comptes-rendus.html' : '', false) + pastille(k.conflits, "Conflit d'horaire", '', true) + pastille(k.a_reaffecter, 'À réaffecter (absence)', gestion ? 'absences/liste.html' : '', true) +
           pastille(k.urgentes, 'Urgence à venir', gestion ? 'interventions/planning.html' : '', true, u ? esc(u.beneficiaire_prenom + ' ' + u.beneficiaire_nom) + ' · ' + dateFr(u.date).slice(0, 5) + ' ' + u.heure_debut : '') + '</div></section>';
      // 3) interventions du jour + charge des intervenants
      h += '<div class="grid-2"><section class="card"><header><div><h2>Interventions du jour</h2><p class="soustitre">' + (d.aujourdhui.length ? d.aujourdhui.length + ' visite' + (d.aujourdhui.length > 1 ? 's planifiées' : ' planifiée') : "Rien de prévu aujourd'hui") + '</p></div>' +
           (gestion ? '<a class="link" href="' + FRONT + 'interventions/planning.html">Voir le planning</a>' : '') + '</header>' + agenda(d.aujourdhui, gestion ? 'interventions/fiche.html' : '') + '</section>' +
           '<section class="card"><header><div><h2>Charge des intervenants</h2><p class="soustitre">Cette semaine</p></div></header>';
      if (!d.charge.length) h += '<p class="empty">Aucune intervention cette semaine.</p>';
      else {
        h += '<ul class="charge">';
        for (var c = 0; c < d.charge.length; c++) {
          var hrs = d.charge[c].minutes / 60, pct = Math.min(100, Math.round(100 * hrs / CAPACITE));
          h += '<li title="' + pct + ' % de ' + CAPACITE + ' h"><div class="ln"><span>' + esc(d.charge[c].nom) + '</span><b>' + (Math.round(hrs * 10) / 10).toString().replace('.', ',') + ' h</b></div><div class="track"><i style="width:' + pct + '%"></i></div></li>';
        }
        h += '</ul>';
      }
      h += '</section></div>';
      // 4) planning de la semaine (cliquer un jour affiche son resume)
      var tot = 0; for (i2 = 0; i2 < jrs.length; i2++) tot += jrs[i2].nb;
      var m1 = jrs.length ? jm(jrs[0].date).split(' ') : ['', ''], m2 = jrs.length ? jm(jrs[6].date).split(' ') : ['', ''];
      h += '<section class="card"><header><div><h2>Planning de la semaine</h2><p class="soustitre">Du ' + m1[0] + (m1[1] !== m2[1] ? ' ' + m1[1] : '') + ' au ' + m2[0] + ' ' + m2[1] + ' · ' + tot + ' intervention' + (tot > 1 ? 's' : '') + '</p></div>' +
           (gestion ? '<a class="link" href="' + FRONT + 'interventions/planning.html">Planning complet</a>' : '') + '</header><div class="jours">';
      for (i2 = 0; i2 < jrs.length; i2++) {
        var j = jrs[i2], auj = j.date === aujourdhui();
        h += '<button type="button" class="jour' + (auj ? ' auj sel' : '') + (j.nb ? '' : ' vide') + '" data-i="' + i2 + '"><span>' + JOURS[i2] + '</span><b>' + j.date.slice(8, 10) + '</b><i>' + j.nb + '</i></button>';
      }
      h += '</div><div class="jour-detail" id="jd"></div></section>';
    }
    contenu.innerHTML = h;
    // Listes limitees : 2 interventions du jour et 3 intervenants visibles, le reste se fait defiler.
    function limiter(ul, n) {
      if (!ul || ul.children.length <= n) return;
      var h2 = 0, gap = parseFloat(window.getComputedStyle(ul).rowGap || window.getComputedStyle(ul).gap) || 0;
      for (var z = 0; z < n; z++) h2 += ul.children[z].offsetHeight + (z ? gap : 0);
      ul.style.maxHeight = Math.ceil(h2 + 2) + 'px'; ul.className += ' defile-y';
    }
    limiter(contenu.querySelector('.grid-2 .agenda'), 2);
    limiter(contenu.querySelector('.charge'), 3);
    var jd = document.getElementById('jd');
    if (jd && d.jours) {
      var montrer = function (i) {
        var j = d.jours[i], t = dateLongue(j.date).split(' '), ti = t[0].charAt(0).toUpperCase() + t[0].slice(1) + ' ' + t[1] + ' ' + t[2];
        jd.innerHTML = '<div><b>' + ti + '</b><span>' + (j.nb ? 'Première intervention à ' + j.premiere + ' · Dernière à ' + j.derniere : 'Aucune intervention ce jour-là') + '</span></div>' +
                       '<span class="puce"><i></i>' + (j.nb ? j.nb + ' intervention' + (j.nb > 1 ? 's planifiées' : ' planifiée') : 'Libre') + '</span>';
        var bs = contenu.querySelectorAll('.jour');
        for (var n = 0; n < bs.length; n++) bs[n].className = bs[n].className.replace(' sel', '') + (n === i ? ' sel' : '');
      };
      for (var q = 0; q < d.jours.length; q++) if (d.jours[q].date === aujourdhui()) montrer(q);
      contenu.addEventListener('click', function (e) { var el = e.target; while (el && el !== contenu && !(el.getAttribute && el.getAttribute('data-i') !== null && /jour/.test(el.className))) el = el.parentNode; if (el && el !== contenu) montrer(Number(el.getAttribute('data-i'))); });
    }
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
           '<aside class="cote"><span class="tags">' + badgeStatut(x) + '</span>' + btnIco(x.a_compte_rendu ? 'ouvrir' : 'modifier', x.a_compte_rendu ? 'Voir le compte rendu' : 'Saisir le compte rendu', 'href="' + FRONT + 'espace-intervenant/compte-rendu.html?id=' + x.id + '"', 'a') + '</aside></li>';
    }
    return s + '</ul>';
  }
});
