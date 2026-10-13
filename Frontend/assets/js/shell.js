// Structure commune des pages (menu latéral + en-tête), construite après vérification de la connexion.
// Usage dans une page :  Shell.demarrer(function (contenu, user) { contenu.innerHTML = '…'; });
// <body data-menu="planning"> indique l'entrée de menu à surligner.
var Shell = (function () {
  function liens(role) {
    var l = [['Tableau de bord', PAGES[role], 'accueil']];
    if (role === 'coordinateur' || role === 'administrateur') {
      l.push(['Planning', 'interventions/planning.html', 'planning'], ['Bénéficiaires', 'beneficiaires/liste.html', 'beneficiaires'],
             ['Intervenants', 'intervenants/liste.html', 'intervenants'], ['Comptes rendus', 'interventions/comptes-rendus.html', 'comptes-rendus']);
      l.push(['Proches aidants', 'aidants/liste.html', 'aidants']);
      if (role === 'administrateur') l.push(['Facturation', 'facturation/factures.html', 'factures'], ['Utilisateurs', 'admin/utilisateurs.html', 'utilisateurs']);
    } else if (role === 'facturation') {
      l.push(['Factures', 'facturation/factures.html', 'factures'], ['Nouvelle facture', 'facturation/nouvelle.html', 'nouvelle'], ['Tarifs', 'facturation/tarifs.html', 'tarifs']);
    } else if (role === 'intervenant') l.push(['Mon planning', 'espace-intervenant/planning.html', 'planning']);
    if (role !== 'beneficiaire' && role !== 'proche_aidant' && role !== 'facturation' && role !== 'maintenance') l.push(['Incidents', 'interventions/incidents.html', 'incidents']);
    if (role === 'administrateur' || role === 'direction' || role === 'responsable_qualite') l.push(['Journal', 'admin/journal.html', 'journal']);
    return l;
  }
  var NOMS = { administrateur: 'Administration', coordinateur: 'Coordination', intervenant: 'Intervenant', responsable_qualite: 'Qualité', direction: 'Direction', facturation: 'Facturation', maintenance: 'Maintenance', proche_aidant: 'Proche aidant', beneficiaire: 'Mes visites' };

  function coque(user) {
    var courant = document.body.getAttribute('data-menu') || document.body.getAttribute('data-ressource') || '', l = liens(user.role), nav = '';
    for (var i = 0; i < l.length; i++) nav += '<a href="' + FRONT + l[i][1] + '"' + (l[i][2] === courant ? ' aria-current="page"' : '') + '><span class="dot"></span>' + l[i][0] + '</a>';
    document.body.innerHTML =
      '<div class="app"><aside class="sidebar"><div class="brand">Suivi à domicile<small>' + esc(NOMS[user.role] || user.role) + '</small></div>' +
      '<nav class="nav" aria-label="Menu principal">' + nav + '<span class="group">Compte</span><a href="' + FRONT + 'auth/mot-de-passe.html"><span class="dot"></span>Mot de passe</a></nav></aside>' +
      '<div class="main"><header class="topbar"><span></span><div class="user"><div class="avatar">' + esc(user.identifiant.slice(0, 2).toUpperCase()) +
      '</div><div class="who">' + esc(user.identifiant) + '<span>' + esc(NOMS[user.role] || user.role) + '</span></div>' +
      '<a class="btn small" href="' + FRONT + 'auth/login.html" data-logout>Déconnexion</a></div></header><main class="content" id="contenu"></main></div></div>';
    window.initTiroir();
    return document.getElementById('contenu');
  }
  function demarrer(fn) {
    window.utilisateurPret.then(function (user) { fn(coque(user), user); });
  }
  function erreur(contenu, msg, retour) {
    contenu.innerHTML = '<p class="msg-err">' + esc(msg) + '</p>' + (retour ? '<p><a href="' + retour + '">← Retour</a></p>' : '');
  }
  return { demarrer: demarrer, erreur: erreur };
})();
