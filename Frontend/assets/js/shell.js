// Structure commune des pages (menu latéral + en-tête), construite après vérification de la connexion.
// Usage dans une page :  Shell.demarrer(function (contenu, user) { contenu.innerHTML = '…'; });
// <body data-menu="planning"> indique l'entrée de menu à surligner.
var Shell = (function () {
  function liens(role) {
    var l = [['Tableau de bord', PAGES[role], 'accueil']];
    if (role === 'coordinateur') {
      l.push(['Planning', 'interventions/planning.html', 'planning'], ['Interventions', 'interventions/liste.html', 'interventions'], ['Bénéficiaires', 'beneficiaires/liste.html', 'beneficiaires'],
             ['Intervenants', 'intervenants/liste.html', 'intervenants'], ['Comptes rendus', 'interventions/comptes-rendus.html', 'comptes-rendus']);
      l.push(['Proches aidants', 'aidants/liste.html', 'aidants'], ['Médecins', 'medecins/liste.html', 'medecins'], ['Organismes', 'organismes/liste.html', 'organismes'], ['Absences', 'absences/liste.html', 'absences'], ['Disponibilités', 'absences/disponibilites.html', 'disponibilites']);
    } else if (role === 'administrateur') l.push(['Utilisateurs', 'admin/utilisateurs.html', 'utilisateurs'], ['Paramètres', 'admin/parametres.html', 'parametres']);
    else if (role === 'facturation') {
      l.push(['Factures', 'facturation/factures.html', 'factures'], ['Nouvelle facture', 'facturation/nouvelle.html', 'nouvelle'], ['Tarifs', 'facturation/tarifs.html', 'tarifs'], ['Organismes', 'organismes/liste.html', 'organismes']);
    } else if (role === 'intervenant') l.push(['Mon planning', 'espace-intervenant/planning.html', 'planning'], ['Mes absences', 'absences/liste.html', 'absences'], ['Mes disponibilités', 'absences/disponibilites.html', 'disponibilites']);
    else if (role === 'beneficiaire') l.push(['Mes absences', 'absences/liste.html', 'absences']);
    if (['coordinateur', 'direction', 'responsable_qualite'].indexOf(role) >= 0) l.push(['Indicateurs', 'indicateurs/tableau.html', 'indicateurs']);
    if (['coordinateur', 'administrateur', 'facturation', 'responsable_qualite'].indexOf(role) >= 0) l.push(['Documents', 'documents/liste.html', 'documents']);
    if (role !== 'administrateur' && role !== 'beneficiaire' && role !== 'proche_aidant' && role !== 'facturation' && role !== 'maintenance') l.push(['Incidents', 'interventions/incidents.html', 'incidents']);
    if (role === 'administrateur' || role === 'direction' || role === 'responsable_qualite') l.push(['Journal', 'admin/journal.html', 'journal']);
    return l;
  }
  var NOMS = { administrateur: 'Administration', coordinateur: 'Coordination', intervenant: 'Intervenant', responsable_qualite: 'Qualité', direction: 'Direction', facturation: 'Facturation', maintenance: 'Maintenance', proche_aidant: 'Proche aidant', beneficiaire: 'Mes visites' };

  // Cloche : nombre de notifications non lues (rouge s'il y a une alerte critique). Silencieux si l'appel echoue.
  function majCloche(user) {
    if (user.doit_changer) return;
    appel('notifications.php?compte=1').then(function (r) {
      var n = document.getElementById('cloche-n'); if (!r.ok || !n) return;
      n.textContent = r.data.non_lues; n.hidden = !r.data.non_lues;
      n.className = 'badge ' + (r.data.critiques ? 'danger' : 'warn');
    });
  }
  // Recherche rapide (barre du haut) : les roles qui ont au moins une liste a chercher (voir api/recherche.php).
  var RECH_ROLES = ['coordinateur', 'intervenant', 'administrateur', 'facturation', 'direction'];
  function rechercheHtml() {
    var court = window.innerWidth <= 820;
    return '<form class="rech" role="search" autocomplete="off"><input type="search" id="rech-q" placeholder="' + (court ? 'Rechercher…' : 'Rechercher un nom, un dossier, une facture…') + '" aria-label="Recherche" aria-controls="rech-res" aria-expanded="false" maxlength="60">' +
           '<kbd aria-hidden="true">/</kbd><button type="submit" aria-label="Rechercher"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button>' +
           '<div class="rech-res" id="rech-res" role="listbox" aria-label="Résultats" hidden></div></form>';
  }
  function brancherRecherche() {
    var form = document.querySelector('.rech'), champ = document.getElementById('rech-q'), zone = document.getElementById('rech-res'), minuteur = null, numero = 0, actif = -1;
    function fermer() { zone.hidden = true; champ.setAttribute('aria-expanded', 'false'); actif = -1; }
    function liens() { return zone.querySelectorAll('a'); }
    function marquer(n) {
      var ls = liens(); if (!ls.length) return;
      actif = (n + ls.length) % ls.length;
      for (var i = 0; i < ls.length; i++) ls[i].className = i === actif ? 'on' : '';
      ls[actif].scrollIntoView && ls[actif].scrollIntoView({ block: 'nearest' });
    }
    function afficher(groupes, q) {
      var h = '';
      for (var g = 0; g < groupes.length; g++) {
        h += '<div class="rg"><p>' + esc(groupes[g].titre) + '</p>';
        for (var i = 0; i < groupes[g].items.length; i++) { var x = groupes[g].items[i]; h += '<a role="option" href="' + FRONT + x.lien + '"><b>' + esc(x.titre) + '</b><span>' + esc(x.sous) + '</span></a>'; }
        h += '</div>';
      }
      zone.innerHTML = h || '<p class="vide">Aucun résultat pour « ' + esc(q) + ' ».</p>';
      zone.hidden = false; champ.setAttribute('aria-expanded', 'true'); actif = -1;
    }
    function chercher() {
      var q = champ.value.replace(/^\s+|\s+$/g, '');
      if (q.length < 2) { fermer(); return; }
      var mon = ++numero;   // une reponse plus ancienne que la derniere frappe est ignoree
      appel('recherche.php?q=' + encodeURIComponent(q)).then(function (r) { if (mon === numero && r.ok) afficher(r.data.groupes, q); });
    }
    champ.addEventListener('input', function () { clearTimeout(minuteur); minuteur = setTimeout(chercher, 250); });
    champ.addEventListener('focus', function () { if (champ.value.length >= 2 && zone.innerHTML) zone.hidden = false; });
    champ.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); marquer(actif + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); marquer(actif - 1); }
      else if (e.key === 'Escape') { fermer(); champ.blur(); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ls = liens(); if (!ls.length) { clearTimeout(minuteur); chercher(); return; }
      window.location.href = ls[actif >= 0 ? actif : 0].href;
    });
    document.addEventListener('click', function (e) { if (!form.contains(e.target)) fermer(); });
    document.addEventListener('keydown', function (e) {   // « / » place le curseur dans la recherche (sauf quand on ecrit deja ailleurs)
      var t = e.target && e.target.tagName;
      if (e.key === '/' && t !== 'INPUT' && t !== 'TEXTAREA' && t !== 'SELECT') { e.preventDefault(); champ.focus(); }
    });
  }
  function coque(user) {
    var courant = document.body.getAttribute('data-menu') || document.body.getAttribute('data-ressource') || '', l = liens(user.role), nav = '';
    var GROUPES = { accueil: 'Activité', planning: 'Activité', interventions: 'Activité', 'comptes-rendus': 'Activité', incidents: 'Activité', indicateurs: 'Activité', beneficiaires: 'Personnes', intervenants: 'Personnes', aidants: 'Personnes', medecins: 'Personnes', organismes: 'Gestion', documents: 'Gestion', disponibilites: 'Personnes',
                    factures: 'Gestion', nouvelle: 'Gestion', tarifs: 'Gestion', utilisateurs: 'Système', parametres: 'Système', journal: 'Système' }, ORDRE = ['Activité', 'Personnes', 'Gestion', 'Système'];
    // Menu en groupes repliables : un bouton par groupe (Activité, Personnes…), ses liens ne s'affichent qu'au clic.
    // Le groupe de la page en cours est ouvert d'office, pour qu'on voie où l'on est.
    var SLUG = { 'Activité': 'activite', 'Personnes': 'personnes', 'Gestion': 'gestion', 'Système': 'systeme', 'Compte': 'compte' };
    var actif = (courant === 'messages' || courant === 'notifications') ? 'Compte' : '';
    for (var a = 0; a < l.length; a++) if (l[a][2] === courant) actif = GROUPES[l[a][2]] || 'Activité';
    function groupe(nom, bloc) {
      var ouvert = nom === actif;
      return '<div class="nav-groupe" data-g="' + SLUG[nom] + '"><button type="button" class="nav-titre" aria-expanded="' + ouvert + '" aria-controls="ng-' + SLUG[nom] + '">' + nom + '</button>' +
             '<div class="nav-liste" id="ng-' + SLUG[nom] + '"' + (ouvert ? '' : ' hidden') + '>' + bloc + '</div></div>';
    }
    for (var g = 0; g < ORDRE.length; g++) {
      var bloc = '';
      for (var i = 0; i < l.length; i++) if ((GROUPES[l[i][2]] || 'Activité') === ORDRE[g]) bloc += '<a href="' + FRONT + l[i][1] + '"' + (l[i][2] === courant ? ' aria-current="page"' : '') + '>' + ico('n_' + l[i][2].replace(/-/g, '_')) + l[i][0] + '</a>';
      if (bloc) nav += groupe(ORDRE[g], bloc);
    }
    nav += groupe('Compte', '<a href="' + FRONT + 'messages/liste.html"' + (courant === 'messages' ? ' aria-current="page"' : '') + '>' + ico('n_messages') + 'Messages</a><a href="' + FRONT + 'notifications/liste.html"' + (courant === 'notifications' ? ' aria-current="page"' : '') + '>' + ico('n_notifications') + 'Notifications</a><a href="' + FRONT + 'auth/mot-de-passe.html">' + ico('n_mdp') + 'Mot de passe</a>');
    document.body.innerHTML =
      '<div class="app"><aside class="sidebar"><div class="brand">' + esc(window.NOM_STRUCTURE || 'Suivi à domicile') + '<small>' + esc(NOMS[user.role] || user.role) + '</small></div>' +
      '<nav class="nav" aria-label="Menu principal">' + nav + '</nav></aside>' +
      '<div class="main"><header class="topbar">' + (RECH_ROLES.indexOf(user.role) >= 0 ? rechercheHtml() : '<span></span>') + '<div class="user"><a class="cloche" id="cloche" href="' + FRONT + 'notifications/liste.html" title="Notifications" aria-label="Notifications">' + ico('cloche') + ' <span class="badge" id="cloche-n" hidden>0</span></a><div class="avatar">' + esc(user.identifiant.slice(0, 2).toUpperCase()) +
      '</div><div class="who">' + esc(user.identifiant) + '<span>' + esc(NOMS[user.role] || user.role) + '</span></div>' +
      '' + btnIco('deconnexion', 'Déconnexion', 'href="' + FRONT + 'auth/login.html" data-logout', 'a') + '</div></header><main class="content" id="contenu"></main></div></div>';
    document.body.setAttribute('data-groupe', SLUG[actif || 'Activité']);   // couleur de la section (cartes des pages)
    if (RECH_ROLES.indexOf(user.role) >= 0) brancherRecherche();
    // Un clic sur le titre d'un groupe ouvre ou ferme sa liste (un seul écouteur pour tout le menu).
    document.querySelector('.nav').addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('.nav-titre') : null; if (!t) return;
      var ouvre = t.getAttribute('aria-expanded') !== 'true';
      t.setAttribute('aria-expanded', ouvre ? 'true' : 'false');
      document.getElementById(t.getAttribute('aria-controls')).hidden = !ouvre;
    });
    window.initTiroir();
    majCloche(user);
    return document.getElementById('contenu');
  }
  // Nom de la structure et référentiels (types, motifs…) : chargés une fois par page. Silencieux si l'appel échoue.
  function charger_config(user) {
    if (user.doit_changer) return Promise.resolve();
    return Promise.all([appel('parametres.php'), appel('referentiels.php?libelles=1')]).then(function (rs) {
      if (rs[0].ok && rs[0].data.parametres) window.NOM_STRUCTURE = rs[0].data.parametres.nom_structure;
      window.REFERENTIELS = {};
      if (rs[1].ok && rs[1].data.items) rs[1].data.items.forEach(function (x) {
        if (!LIBELLES.hasOwnProperty(x.valeur)) LIBELLES[x.valeur] = x.libelle;   // les libellés d'origine (avec accents) gardent la priorité
        if (Number(x.actif)) (window.REFERENTIELS[x.categorie] = window.REFERENTIELS[x.categorie] || []).push(x.valeur);
      });
    }).catch(function () {});
  }
  function demarrer(fn) {
    window.utilisateurPret.then(function (user) { charger_config(user).then(function () { fn(coque(user), user); }); });
  }
  function erreur(contenu, msg, retour) {
    contenu.innerHTML = '<p class="msg-err">' + esc(msg) + '</p>' + (retour ? '<p><a href="' + retour + '">← Retour</a></p>' : '');
  }
  return { demarrer: demarrer, erreur: erreur };
})();
