// Tableau de bord réel : coordinateur, administrateur, intervenant, qualité, direction (chiffres calculés par api/dashboard.php).
Shell.demarrer(function (contenu, user) {
  document.title = 'Tableau de bord · Suivi à domicile';
  var gestion = user.role === 'coordinateur';
  appel('dashboard.php').then(function (r) {
    if (!r.ok) { Shell.erreur(contenu, r.data.message || 'Erreur.'); return; }
    var d = r.data, h = '';
    function kpi(valeur, libelle, lien, alerte, teinte) {
      var b = '<b' + (alerte && valeur > 0 ? ' class="alerte"' : '') + '>' + valeur + '</b><span>' + libelle + '</span>';
      return '<div class="card kpi' + (teinte ? ' t-' + teinte : '') + (lien ? ' lien' : '') + '">' + (lien ? '<a href="' + FRONT + lien + '">' + b + '</a>' : '<div>' + b + '</div>') + '</div>';
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
          '<section class="kpis">' + kpi(argent(k.facture_mois), 'Facturé ce mois-ci', 'facturation/factures.html', false, 'brand').replace('<b>', '<b class="long">') + kpi(argent(k.encaisse_mois), 'Encaissé ce mois-ci', 'facturation/factures.html', false, 'ok').replace('<b>', '<b class="long">') +
          kpi(argent(k.reste_a_payer), 'Reste à payer', 'facturation/a-facturer.html?onglet=payer', false, 'warn').replace('<b>', '<b class="long">') + kpi(k.a_facturer, 'Interventions à facturer', 'facturation/a-facturer.html', true, 'violet') + '</section>' +
          '<div class="grid-2"><section class="card t-brand"><header><h2>Dernières factures</h2><a class="link" href="' + FRONT + 'facturation/factures.html">Tout voir</a></header>';
      if (!d.dernieres.length) h += '<p class="empty">Aucune facture pour le moment.</p>';
      else { var cf = ''; for (var f = 0; f < d.dernieres.length; f++) { var fa = d.dernieres[f]; cf += factureCarte({ id: fa.id, numero: fa.numero, benef: fa.prenom + ' ' + fa.nom, statut: fa.statut, total: fa.montant_total, restant: Math.max(0, fa.montant_total - fa.paye), date: fa.date_emission }); } h += '<div class="rail une">' + cf + '</div>'; }
      h += '</section><section class="card t-warn"><header><h2>À surveiller</h2></header><ul class="alerts">' + alerte(k.en_retard, 'Factures en retard', 'Non payées depuis plus de 30 jours.', 'Aucun retard de paiement.', 'facturation/a-facturer.html?onglet=payer') +
           alerte(k.a_facturer, 'Interventions à facturer', 'Validées, pas encore facturées.', 'Tout est facturé.', 'facturation/a-facturer.html') + '</ul></section></div>';
    } else if (user.role === 'administrateur') {
      var ka = d.kpis, ligne = '', NOMS_ROLES = { administrateur: 'Administrateur', coordinateur: 'Coordinateur', intervenant: 'Intervenant', beneficiaire: 'Bénéficiaire', proche_aidant: 'Proche aidant', responsable_qualite: 'Responsable qualité', facturation: 'Facturation', direction: 'Direction', maintenance: 'Maintenance', medecin: 'Médecin' };
      h = '<div class="page-head"><div><h1>Administration</h1><p>' + dateLongue(aujourdhui()) + '</p></div><a class="btn" href="' + FRONT + 'admin/utilisateurs.html">+ Créer un compte</a></div>' +
          '<p class="surtitre">Comptes</p><section class="kpis">' + kpi(ka.actifs, 'Comptes actifs', 'admin/utilisateurs.html', false, 'ok') + kpi(ka.desactives, 'Comptes désactivés', 'admin/utilisateurs.html', false, 'violet') +
          kpi(ka.connectes_7j, 'Connectés ces 7 jours', 'admin/utilisateurs.html', false, 'brand') + kpi(ka.mdp_temporaire, 'Mot de passe temporaire', 'admin/utilisateurs.html', false, 'warn') + '</section>' +
          '<div class="grid-2"><section class="card t-brand"><header><h2>Comptes par rôle</h2><span class="muted">Actifs</span></header><ul class="alerts">';
      for (var q = 0; q < d.par_role.length; q++) ligne += '<li><span class="badge">' + d.par_role[q].nb + '</span><div><b>' + esc(NOMS_ROLES[d.par_role[q].role] || d.par_role[q].role) + '</b></div></li>';
      h += ligne + '</ul></section><section class="card t-violet"><header><h2>Dernières actions</h2><a class="link" href="' + FRONT + 'admin/journal.html">Journal</a></header>';
      if (!d.actions.length) h += '<p class="empty">Aucune action enregistrée.</p>';
      else { h += '<ul class="alerts">'; for (q = 0; q < d.actions.length; q++) { var ac = d.actions[q]; h += '<li><div><b>' + esc(ac.action) + ' · ' + esc(ac.entite_concernee || '') + '</b><span>' + esc(ac.identifiant || '—') + ' · ' + esc(dateFr(ac.date_heure)) + ' ' + esc(String(ac.date_heure).slice(11, 16)) + (ac.detail ? ' · ' + esc(ac.detail) : '') + '</span></div></li>'; } h += '</ul>'; }
      h += '</section></div>' + (ka.jamais_connectes ? '<p class="muted">' + ka.jamais_connectes + ' compte(s) actif(s) ne se sont encore jamais connectés.</p>' : '');
    } else if (user.role === 'intervenant') {
      if (!d.lie) { contenu.innerHTML = '<div class="page-head"><div><h1>Bonjour</h1></div></div><p class="msg-err">Votre compte n\'est lié à aucune fiche intervenant. Demandez à l\'administrateur.</p>'; return; }
      h = '<div class="page-head"><div><h1>Bonjour ' + esc(d.prenom) + '</h1><p>' + dateLongue(aujourdhui()) + '</p></div></div>' +
          '<section class="kpis">' + kpi(d.kpis.aujourdhui, "Interventions aujourd'hui", 'espace-intervenant/planning.html', false, 'brand') + kpi(d.kpis.semaine, 'Interventions cette semaine', 'espace-intervenant/planning.html', false, 'violet') +
          kpi(d.kpis.a_saisir, 'Comptes rendus à saisir', 'espace-intervenant/planning.html', true, 'warn') + '</section>' +
          '<section class="card t-ok"><header><h2>Ma journée</h2><a class="link" href="' + FRONT + 'espace-intervenant/planning.html">Voir mon planning</a></header>' + agendaIntervenant(d.aujourdhui) + '</section>';
    } else {
      var k = d.kpis, CAPACITE = 35;   // capacite hebdomadaire d'un intervenant (heures), pour la barre de charge
      var JOURS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'], i2, jrs = d.jours || [];
      function jm(dt) { var t = dateLongue(dt).split(' '); return t[1] + ' ' + t[2]; }
      h = '<div class="page-head"><div><h1>Tableau de bord</h1><p>' + dateLongue(aujourdhui()) + '</p></div>' +
          (gestion ? '<a class="btn" href="' + FRONT + 'interventions/form.html">+ Nouvelle intervention</a>' : '') + '</div>';
      // 1) « A traiter » : une tuile par sujet (rouge/orange s'il y a une action a faire, verte sinon)
      function tuile(n, libelle, lien, rouge, sous) {
        var cl = 'tuile ' + (n > 0 ? (rouge ? 'rouge' : 'orange') : 'ok'), c = '<b>' + n + '</b><span class="tl">' + libelle + (sous ? '<small>' + sous + '</small>' : '') + '</span>';
        return n > 0 && lien ? '<a class="' + cl + '" href="' + FRONT + lien + '">' + c + '</a>' : '<div class="' + cl + '">' + c + '</div>';
      }
      var u = d.prochaine_urgence;
      h += '<p class="surtitre">À traiter</p><section class="tuiles">' + tuile(k.sans_cr, 'Comptes rendus manquants', gestion ? 'interventions/comptes-rendus.html?etat=sans' : '', true) +
           tuile(k.a_valider, 'À valider', gestion ? 'interventions/comptes-rendus.html' : '', false) + tuile(k.conflits, "Conflit d'horaire", '', true) +
           tuile(k.a_reaffecter, 'À réaffecter (absence)', gestion ? 'absences/liste.html' : '', true) + tuile(k.urgentes, 'Urgence à venir', gestion ? 'interventions/planning.html' : '', true) + '</section>';
      // 2) planning de la semaine (cliquer un jour affiche son resume) + prochaine urgence
      var tot = 0; for (i2 = 0; i2 < jrs.length; i2++) tot += jrs[i2].nb;
      var m1 = jrs.length ? jm(jrs[0].date).split(' ') : ['', ''], m2 = jrs.length ? jm(jrs[6].date).split(' ') : ['', ''];
      h += '<div' + (u ? ' class="grid-2 g-a"' : '') + '><section class="card t-brand"><header><div><h2>Planning de la semaine</h2><p class="soustitre">Du ' + m1[0] + (m1[1] !== m2[1] ? ' ' + m1[1] : '') + ' au ' + m2[0] + ' ' + m2[1] + ' · ' + tot + ' intervention' + (tot > 1 ? 's' : '') + '</p></div>' +
           (gestion ? '<a class="link" href="' + FRONT + 'interventions/planning.html">Planning complet</a>' : '') + '</header><div class="jours">';
      for (i2 = 0; i2 < jrs.length; i2++) {
        var j = jrs[i2], auj = j.date === aujourdhui();
        h += '<button type="button" class="jour' + (auj ? ' auj sel' : '') + (j.nb ? '' : ' vide') + '" data-i="' + i2 + '"><span>' + JOURS[i2] + '</span><b>' + j.date.slice(8, 10) + '</b><i>' + j.nb + '</i></button>';
      }
      h += '</div><div class="jour-detail" id="jd"></div></section>';
      if (u) h += '<section class="card t-danger"><header><h2>Prochaine urgence</h2>' + (gestion ? '<a class="link" href="' + FRONT + 'interventions/planning.html">Planning</a>' : '') + '</header>' +
                  '<p class="u-nom">' + esc(u.beneficiaire_prenom + ' ' + u.beneficiaire_nom) + '</p><p class="muted">' + dateFr(u.date).slice(0, 5) + ' à ' + u.heure_debut + '</p></section>';
      h += '</div>';
      // 3) interventions du jour + charge des intervenants
      h += '<div class="grid-2"><section class="card t-ok"><header><div><h2>Interventions du jour</h2><p class="soustitre">' + (d.aujourdhui.length ? d.aujourdhui.length + ' visite' + (d.aujourdhui.length > 1 ? 's planifiées' : ' planifiée') : "Rien de prévu aujourd'hui") + '</p></div>' +
           (gestion ? '<a class="link" href="' + FRONT + 'interventions/planning.html">Voir le planning</a>' : '') + '</header>' + agenda(d.aujourdhui, gestion ? 'interventions/fiche.html' : '') + '</section>' +
           '<section class="card t-violet"><header><div><h2>Charge des intervenants</h2><p class="soustitre">Cette semaine</p></div></header>';
      if (!d.charge.length) h += '<p class="empty">Aucune intervention cette semaine.</p>';
      else {
        h += '<ul class="charge">';
        for (var c = 0; c < d.charge.length; c++) {
          var hrs = d.charge[c].minutes / 60, pct = Math.min(100, Math.round(100 * hrs / CAPACITE));
          h += '<li' + (pct >= 90 ? ' class="haute"' : '') + ' title="' + pct + ' % de ' + CAPACITE + ' h"><div class="ln"><span>' + esc(d.charge[c].nom) + '</span><b>' + (Math.round(hrs * 10) / 10).toString().replace('.', ',') + ' h</b></div><div class="track"><i style="width:' + pct + '%"></i></div></li>';
        }
        h += '</ul>';
      }
      h += '</section></div>';
      // 4) vue d'ensemble : indicateurs principaux, en bas
      h += '<p class="surtitre">Vue d\'ensemble</p><section class="kpis' + (k.utilisateurs === undefined ? ' n3' : '') + '">' +
           kpi(k.semaine, 'Interventions cette semaine', gestion ? 'interventions/planning.html' : '', false, 'brand') + kpi(k.beneficiaires, 'Bénéficiaires actifs', gestion ? 'beneficiaires/liste.html' : '', false, 'ok') +
           kpi(k.intervenants, 'Intervenants actifs', gestion ? 'intervenants/liste.html' : '', false, 'violet') + (k.utilisateurs !== undefined ? kpi(k.utilisateurs, 'Comptes actifs', 'admin/utilisateurs.html', false, 'warn') : '') + '</section>';
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
