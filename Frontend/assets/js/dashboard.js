// Tableau de bord réel : coordinateur, administrateur, intervenant, qualité, direction (chiffres calculés par api/dashboard.php).
Shell.demarrer(function (contenu, user) {
  document.title = 'Tableau de bord · Suivi à domicile';
  var gestion = user.role === 'coordinateur';
  appel('dashboard.php').then(function (r) {
    if (!r.ok) { Shell.erreur(contenu, r.data.message || 'Erreur.'); return; }
    var d = r.data, h = '', vueEnsemble = false;
    function kpi(valeur, libelle, lien, alerte, teinte) {
      var b = '<b' + (alerte && valeur > 0 ? ' class="alerte"' : '') + '>' + valeur + '</b><span>' + libelle + '</span>';
      return '<div class="card kpi' + (teinte ? ' t-' + teinte : '') + (lien ? ' lien' : '') + '">' + (lien ? '<a href="' + FRONT + lien + '">' + b + '</a>' : '<div>' + b + '</div>') + '</div>';
    }
    function agenda(items, lien) {
      if (!items.length) return '<p class="empty">Aucune intervention aujourd\'hui.</p>';
      var s = '<ul class="agenda">';
      for (var i = 0; i < items.length; i++) {
        var x = items[i];
        s += '<li class="' + classeStatut(x) + '"><time>' + x.heure_debut + '<span>' + x.heure_fin + '</span></time><div><b>' + esc(x.beneficiaire_prenom + ' ' + x.beneficiaire_nom) + '</b><span>' +
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
      var k = d.kpis;
      h = '<div class="page-head"><div><h1>Tableau de bord</h1><p>' + dateLongue(aujourdhui()) + '</p></div>' +
          (gestion ? '<a class="btn" href="' + FRONT + 'interventions/form.html">+ Nouvelle intervention</a>' : '') + '</div>';
      // 1) « A traiter » : une barre fine, une pastille par sujet (rouge/orange s'il y a une action, grise a zero)
      function pastille(n, libelle, lien, rouge, sous) {
        var cl = 'pz ' + (n > 0 ? (rouge ? 'rouge' : 'orange') : 'zero'), c = '<b>' + n + '</b> ' + libelle, t = sous ? ' title="' + sous + '"' : '';
        return n > 0 && lien ? '<a class="' + cl + '" href="' + FRONT + lien + '"' + t + '>' + c + '</a>' : '<span class="' + cl + '"' + t + '>' + c + '</span>';
      }
      var u = d.prochaine_urgence;
      h += '<section class="barre" aria-label="À traiter"><span class="tt">À traiter</span>' +
           pastille(k.sans_cr, 'Comptes rendus manquants', gestion ? 'interventions/comptes-rendus.html?etat=sans' : '', true) + pastille(k.a_valider, 'À valider', gestion ? 'interventions/comptes-rendus.html' : '', false) +
           pastille(k.conflits, "Conflit d'horaire", '', true) + pastille(k.a_reaffecter, 'À réaffecter (absence)', gestion ? 'absences/liste.html' : '', true) +
           pastille(k.urgentes, 'Urgence à venir', gestion ? 'interventions/planning.html' : '', true, u ? esc(u.beneficiaire_prenom + ' ' + u.beneficiaire_nom) + ' · ' + dateFr(u.date).slice(0, 5) + ' ' + u.heure_debut : '') + '</section>';
      // 2) planning defilant (la date du milieu est la date choisie) + avancement de la semaine
      h += '<div class="grid-2 g-a"><section class="card t-brand"><header><div><h2>Planning</h2><p class="soustitre" id="pl-mois"></p></div><div class="entete-d"><span class="chiffres"><b>' + k.semaine + '</b> cette semaine</span>' +
           (gestion ? '<a class="link" href="' + FRONT + 'interventions/planning.html">Planning complet</a>' : '') + '</div></header>' +
           '<div class="bande"><button type="button" class="nv g" id="pl-g" aria-label="Jours précédents">' + CHEV_G + '</button><div class="jours" id="pl-jours" role="group" aria-label="Jours du planning"></div><button type="button" class="nv d" id="pl-d" aria-label="Jours suivants">' + CHEV_D + '</button></div>' +
           '<div class="jour-detail" id="jd" aria-live="polite"></div></section>' +
           '<section class="card t-ok"><header><div><h2>Avancement de la semaine</h2><p class="soustitre">Interventions planifiées déjà réalisées</p></div></header>' + donutHtml(d.avancement) + '</section></div>';
      // 3) interventions du jour + charge des intervenants (barres ou graphique)
      h += '<div class="grid-2"><section class="card"><header><div><h2>Interventions du jour</h2><p class="soustitre">' + (d.aujourdhui.length ? d.aujourdhui.length + ' visite' + (d.aujourdhui.length > 1 ? 's planifiées' : ' planifiée') : "Rien de prévu aujourd'hui") + ' · <b>' + k.beneficiaires + '</b> bénéficiaires actifs</p></div>' +
           (gestion ? '<a class="link" href="' + FRONT + 'interventions/planning.html">Voir le planning</a>' : '') + '</header>' + agenda(d.aujourdhui, gestion ? 'interventions/fiche.html' : '') + '</section>' +
           '<section class="card t-violet" id="chg"><header><div><h2>Charge des intervenants</h2><p class="soustitre">Cette semaine · <b>' + k.intervenants + '</b> intervenants actifs</p></div>' +
           '<div class="seg" role="group" aria-label="Affichage de la charge"><button type="button" data-m="b" aria-pressed="true">Barres</button><button type="button" data-m="g" aria-pressed="false">Graphique</button></div></header><div id="chg-corps"></div></section></div>';
      vueEnsemble = true;
    }
    contenu.innerHTML = h;
    if (vueEnsemble) { planning(contenu, d); chargeVue(d); }
  });
  var CHEV_G = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  var CHEV_D = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  var CAPACITE = 35;   // capacite hebdomadaire d'un intervenant (heures)
  function classeStatut(x) { return x.statut === 'realisee' ? 's-ok' : (x.urgente ? 's-ur' : 's-pl'); }

  // Donut « avancement » : part des interventions planifiees de la semaine deja realisees.
  function donutHtml(av) {
    if (!av || !av.total) return '<p class="empty">Aucune intervention planifiée cette semaine.</p>';
    var r = 62, c = 2 * Math.PI * r, fait = Math.min(av.realisees, av.total), pct = Math.round(100 * fait / av.total);
    return '<div class="donut"><svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label="' + pct + ' % des interventions de la semaine sont réalisées">' +
           '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="#e8edf1" stroke-width="18"/>' +
           '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="#1d7a4b" stroke-width="18" stroke-linecap="' + (fait && fait < av.total ? 'round' : 'butt') + '" stroke-dasharray="' + (c * fait / av.total).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 85 85)"/>' +
           '<text x="85" y="88" text-anchor="middle" font-size="30" font-weight="700" fill="#1f2d3a">' + pct + ' %</text><text x="85" y="110" text-anchor="middle" font-size="12" fill="#5b6b7a">réalisées</text></svg>' +
           '<div class="lg"><span><i class="c-ok"></i>Réalisées <b>' + fait + '</b></span><span><i class="c-rest"></i>Restantes <b>' + (av.total - fait) + '</b></span><span class="muted">sur ' + av.total + ' planifiées</span></div></div>';
  }

  // Planning defilant : une piste de 25 jours qui glisse (animation) derriere une fenetre de 7 jours ; le jour du milieu est le jour choisi.
  // On peut faire glisser a la souris ou au doigt, utiliser la molette / le pave tactile, les fleches du clavier ou les deux boutons.
  // Les jours non encore connus sont demandes au serveur (?du=&au=), une seule fois, sans boucle en cas d'erreur.
  function planning(contenu, d) {
    var vue = document.getElementById('pl-jours'), jd = document.getElementById('jd'), mois = document.getElementById('pl-mois');
    var N = 25, MID = 12, jours = {}, centre = aujourdhui(), origine = centre, echec = false, enCours = false, deplace = false, NOMS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'], i, piste, items;
    for (i = 0; i < d.jours.length; i++) jours[d.jours[i].date] = d.jours[i];
    vue.innerHTML = '<div class="piste"></div>'; piste = vue.firstChild; piste.style.width = (N * 100 / 7) + '%';
    function dt(x) { return new Date(x + 'T12:00:00'); }
    function plus(x, n) { var t = dt(x); t.setDate(t.getDate() + n); return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }
    function ecart(a, b) { return Math.round((dt(b) - dt(a)) / 86400000); }
    function idx() { return ecart(origine, centre) + MID; }
    function placer(sans) {
      if (sans) piste.className = 'piste sans';
      piste.style.transform = 'translateX(' + (-(idx() - 3) * 100 / N) + '%)';
      if (sans) { piste.offsetWidth; piste.className = 'piste'; }
    }
    function maj() {   // met a jour les classes et les chiffres sans reconstruire (c'est ce qui permet la transition)
      var c = idx(), today = aujourdhui(), k, j, nb, ab, b;
      for (k = 0; k < items.length; k++) {
        var s = items[k].getAttribute('data-d'); j = jours[s]; nb = j ? j.nb : null; ab = Math.abs(k - c); b = items[k].firstChild;
        b.className = 'jour' + (ab === 0 ? ' sel' : '') + (s === today ? ' auj' : '') + (nb === 0 ? ' vide' : '') + (ab === 3 ? ' e1' : ab === 2 ? ' e2' : ab > 3 ? ' hors' : '');
        b.setAttribute('tabindex', ab <= 3 ? '0' : '-1');
        if (ab === 0) b.setAttribute('aria-current', 'date'); else b.removeAttribute('aria-current');
        b.lastChild.textContent = nb === null ? '·' : nb;
      }
    }
    function monter() {   // (re)construit la piste autour de « origine »
      var h = '', k, s;
      for (k = 0; k < N; k++) { s = plus(origine, k - MID); h += '<div class="jw" data-d="' + s + '"><button type="button" class="jour" data-d="' + s + '"><span>' + NOMS[dt(s).getDay()] + '</span><b>' + s.slice(8, 10) + '</b><i></i></button></div>'; }
      piste.innerHTML = h; items = piste.children; maj(); placer(true);
    }
    function detail() {
      var t = dateLongue(centre).split(' '), j0 = jours[centre];
      mois.textContent = t[2] + ' ' + t[3];
      jd.innerHTML = '<div><b>' + t[0].charAt(0).toUpperCase() + t[0].slice(1) + ' ' + t[1] + ' ' + t[2] + '</b><span>' + (!j0 ? 'Chargement…' : j0.nb ? 'Première intervention à ' + j0.premiere + ' · Dernière à ' + j0.derniere : 'Aucune intervention ce jour-là') + '</span></div>' +
                    '<span class="puce"><i></i>' + (!j0 ? '…' : j0.nb ? j0.nb + ' intervention' + (j0.nb > 1 ? 's planifiées' : ' planifiée') : 'Libre') + '</span>';
      jd.className = 'jour-detail'; jd.offsetWidth; jd.className = 'jour-detail anim';
    }
    function charger() {
      if (echec || enCours) return;
      var manque = false, k;
      for (k = -10; k <= 10; k++) if (!jours[plus(centre, k)]) { manque = true; break; }
      if (!manque) return;
      enCours = true;
      appel('dashboard.php?du=' + plus(centre, -14) + '&au=' + plus(centre, 14)).then(function (r) {
        enCours = false;
        if (!r.ok) { echec = true; return; }
        for (var q = 0; q < r.data.jours.length; q++) jours[r.data.jours[q].date] = r.data.jours[q];
        maj(); detail();
      });
    }
    function aller(x, focus) {
      if (x === centre) { placer(false); return; }
      if (Math.abs(idx() + ecart(centre, x) - MID) > 9) { origine = centre; monter(); }   // on recentre la piste avant de glisser (identique a l'ecran)
      centre = x; maj(); placer(false); detail(); charger();
      if (focus) { var b = piste.children[idx()].firstChild; if (b.focus) b.focus({ preventScroll: true }); vue.scrollLeft = 0; }
    }
    // Clic sur un jour
    vue.addEventListener('click', function (e) {
      if (deplace) { deplace = false; return; }
      var b = e.target.closest ? e.target.closest('.jour') : null; if (b) aller(b.getAttribute('data-d'), true);
    });
    vue.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); aller(plus(centre, -1), true); }
      if (e.key === 'ArrowRight') { e.preventDefault(); aller(plus(centre, 1), true); }
    });
    // Molette / pave tactile (defilement horizontal) : un jour par cran, avec un petit delai pour garder la fluidite
    var derniereRoue = 0;
    vue.addEventListener('wheel', function (e) {
      var dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (!dx) return;
      e.preventDefault();
      var t = new Date().getTime(); if (t - derniereRoue < 140) return; derniereRoue = t;
      aller(plus(centre, dx > 0 ? 1 : -1), false);
    }, { passive: false });
    // Glisser (souris ou doigt) : la piste suit le pointeur, puis se cale sur le jour le plus proche
    var x0 = null, base = 0, largeur = 1;
    vue.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      x0 = e.clientX; largeur = vue.clientWidth / 7; base = -(idx() - 3) * largeur; deplace = false;
    });
    vue.addEventListener('pointermove', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0;
      if (!deplace && Math.abs(dx) > 6) { deplace = true; piste.className = 'piste sans'; vue.className += ' prise'; if (vue.setPointerCapture) { try { vue.setPointerCapture(e.pointerId); } catch (err) {} } }
      if (deplace) piste.style.transform = 'translateX(' + (base + dx) + 'px)';
    });
    function lacher(e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      vue.className = vue.className.replace(' prise', '');
      if (!deplace) return;
      piste.className = 'piste';
      var n = -Math.round(dx / largeur); piste.style.transform = 'translateX(' + (base) + 'px)'; piste.offsetWidth;
      if (n === 0) { placer(false); } else aller(plus(centre, n), false);
      setTimeout(function () { deplace = false; }, 0);
    }
    vue.addEventListener('pointerup', lacher); vue.addEventListener('pointercancel', lacher);
    document.getElementById('pl-g').addEventListener('click', function () { aller(plus(centre, -1), false); });
    document.getElementById('pl-d').addEventListener('click', function () { aller(plus(centre, 1), false); });
    monter(); detail(); charger();
  }

  // Charge des intervenants : barres (total de la semaine) ou graphique (heures par jour, une courbe par intervenant).
  function chargeVue(d) {
    var corps = document.getElementById('chg-corps'), boutons = document.querySelectorAll('#chg .seg button'), mode = 'b', i;
    try { if (window.localStorage.getItem('suivi-charge') === 'g') mode = 'g'; } catch (e) {}
    function barres() {
      if (!d.charge.length) return '<p class="empty">Aucune intervention cette semaine.</p>';
      var h = '<ul class="charge">';
      for (var c = 0; c < d.charge.length; c++) {
        var hrs = d.charge[c].minutes / 60, pct = Math.min(100, Math.round(100 * hrs / CAPACITE));
        h += '<li' + (pct >= 90 ? ' class="haute"' : '') + ' title="' + pct + ' % de ' + CAPACITE + ' h"><div class="ln"><span>' + esc(d.charge[c].nom) + '</span><b>' + (Math.round(hrs * 10) / 10).toString().replace('.', ',') + ' h</b></div><div class="track"><i style="width:' + pct + '%"></i></div></li>';
      }
      return h + '</ul>';
    }
    function graphe() {
      var top = d.charge.slice(0, 5), JN = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'], COUL = ['#1f6f8b', '#6a56b3', '#1d7a4b', '#c47f00', '#b3532a'];
      if (!top.length) return '<p class="empty">Aucune intervention cette semaine.</p>';
      var max = 0, a, b; for (a = 0; a < top.length; a++) for (b = 0; b < 7; b++) max = Math.max(max, top[a].par_jour[b] / 60);
      var ymax = Math.max(8, Math.ceil(max / 2) * 2), W = 560, H = 230, L = 40, T = 14, Bm = 30;
      function X(n) { return L + n * (W - L - 16) / 6; } function Y(v) { return T + (H - T - Bm) * (1 - v / ymax); }
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Heures par jour pour les ' + top.length + ' intervenants les plus chargés">', t;
      for (t = 0; t <= 4; t++) { var v = ymax * t / 4; s += '<line x1="' + L + '" x2="' + (W - 10) + '" y1="' + Y(v).toFixed(0) + '" y2="' + Y(v).toFixed(0) + '" stroke="#e8edf1"/><text x="' + (L - 8) + '" y="' + (Y(v) + 4).toFixed(0) + '" text-anchor="end" font-size="11" fill="#5b6b7a">' + (Math.round(v * 10) / 10).toString().replace('.', ',') + ' h</text>'; }
      var lim = CAPACITE / 5;
      if (lim < ymax) s += '<line x1="' + L + '" x2="' + (W - 10) + '" y1="' + Y(lim).toFixed(0) + '" y2="' + Y(lim).toFixed(0) + '" stroke="#c47f00" stroke-dasharray="4 4"/><text x="' + (W - 12) + '" y="' + (Y(lim) - 5).toFixed(0) + '" text-anchor="end" font-size="11" fill="#8a5a00">limite ' + lim + ' h par jour</text>';
      for (a = 0; a < 7; a++) s += '<text x="' + X(a).toFixed(0) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#5b6b7a">' + JN[a] + '</text>';
      var leg = '';
      for (a = 0; a < top.length; a++) {
        var pts = '', pc = '';
        for (b = 0; b < 7; b++) { var hh = top[a].par_jour[b] / 60; pts += X(b).toFixed(0) + ',' + Y(hh).toFixed(0) + ' '; pc += '<circle cx="' + X(b).toFixed(0) + '" cy="' + Y(hh).toFixed(0) + '" r="3.5" fill="#fff" stroke="' + COUL[a] + '" stroke-width="2"><title>' + esc(top[a].nom) + ' · ' + JN[b] + ' : ' + (Math.round(hh * 10) / 10).toString().replace('.', ',') + ' h</title></circle>'; }
        s += '<polyline points="' + pts + '" fill="none" stroke="' + COUL[a] + '" stroke-width="2.5" stroke-linejoin="round"/>' + pc;
        leg += '<span><i style="background:' + COUL[a] + '"></i>' + esc(top[a].nom) + '</span>';
      }
      return s + '</svg><div class="leg">' + leg + '</div>' + (d.charge.length > 5 ? '<p class="muted note">Les 5 intervenants les plus chargés, sur ' + d.charge.length + '.</p>' : '');
    }
    function limiter(ul, n) {
      if (!ul || ul.children.length <= n) return;
      var h2 = 0, gap = parseFloat(window.getComputedStyle(ul).rowGap || window.getComputedStyle(ul).gap) || 0;
      for (var z = 0; z < n; z++) h2 += ul.children[z].offsetHeight + (z ? gap : 0);
      ul.style.maxHeight = Math.ceil(h2 + 2) + 'px'; ul.className += ' defile-y';
    }
    function afficher() {
      corps.innerHTML = mode === 'g' ? graphe() : barres();
      for (var q = 0; q < boutons.length; q++) boutons[q].setAttribute('aria-pressed', boutons[q].getAttribute('data-m') === mode ? 'true' : 'false');
      if (mode === 'b') limiter(corps.querySelector('.charge'), 3);
    }
    for (i = 0; i < boutons.length; i++) boutons[i].addEventListener('click', function () {
      mode = this.getAttribute('data-m');
      try { window.localStorage.setItem('suivi-charge', mode); } catch (e) {}
      afficher();
    });
    afficher();
    // Interventions du jour : 2 visibles, le reste defile.
    var ag = document.querySelector('.grid-2 .agenda'); if (ag) limiter(ag, 2);
  }
  function alerte(n, titre, si, sinon, lien) {
    var t = '<b>' + titre + '</b><span>' + (n > 0 ? si : sinon) + '</span>';
    return '<li><span class="badge ' + (n > 0 ? 'warn' : 'ok') + '">' + n + '</span><div>' + (n > 0 && lien ? '<a href="' + FRONT + lien + '">' + t + '</a>' : t) + '</div></li>';
  }
  function agendaIntervenant(items) {
    if (!items.length) return '<p class="empty">Aucune intervention aujourd\'hui.</p>';
    var s = '<ul class="agenda">';
    for (var i = 0; i < items.length; i++) {
      var x = items[i];
      s += '<li class="' + classeStatut(x) + '"><time>' + x.heure_debut + '<span>' + x.heure_fin + '</span></time><div><b>' + esc(x.beneficiaire_prenom + ' ' + x.beneficiaire_nom) + '</b><span>' + esc(lib(x.type)) + ' · ' + esc(lib(x.lieu)) + '</span></div>' +
           '<aside class="cote"><span class="tags">' + badgeStatut(x) + '</span>' + btnIco(x.a_compte_rendu ? 'ouvrir' : 'modifier', x.a_compte_rendu ? 'Voir le compte rendu' : 'Saisir le compte rendu', 'href="' + FRONT + 'espace-intervenant/compte-rendu.html?id=' + x.id + '"', 'a') + '</aside></li>';
    }
    return s + '</ul>';
  }
});
