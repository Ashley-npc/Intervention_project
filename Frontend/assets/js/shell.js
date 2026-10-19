// Structure commune des pages (menu latéral + en-tête), construite après vérification de la connexion.
// Usage dans une page :  Shell.demarrer(function (contenu, user) { contenu.innerHTML = '…'; });
// <body data-menu="planning"> indique l'entrée de menu à surligner.
var Shell = (function () {
  function liens(role) {
    var l = [['Tableau de bord', PAGES[role], 'accueil']];
    if (role === 'coordinateur' || role === 'administrateur') {
      l.push(['Planning', 'interventions/planning.html', 'planning'], ['Bénéficiaires', 'beneficiaires/liste.html', 'beneficiaires'],
             ['Intervenants', 'intervenants/liste.html', 'intervenants'], ['Comptes rendus', 'interventions/comptes-rendus.html', 'comptes-rendus']);
      l.push(['Proches aidants', 'aidants/liste.html', 'aidants'], ['Médecins', 'medecins/liste.html', 'medecins'], ['Absences', 'absences/liste.html', 'absences'], ['Disponibilités', 'absences/disponibilites.html', 'disponibilites']);
      if (role === 'administrateur') l.push(['Facturation', 'facturation/factures.html', 'factures'], ['Utilisateurs', 'admin/utilisateurs.html', 'utilisateurs']);
    } else if (role === 'facturation') {
      l.push(['Factures', 'facturation/factures.html', 'factures'], ['Nouvelle facture', 'facturation/nouvelle.html', 'nouvelle'], ['Tarifs', 'facturation/tarifs.html', 'tarifs']);
    } else if (role === 'intervenant') l.push(['Mon planning', 'espace-intervenant/planning.html', 'planning'], ['Mes absences', 'absences/liste.html', 'absences'], ['Mes disponibilités', 'absences/disponibilites.html', 'disponibilites']);
    else if (role === 'beneficiaire') l.push(['Mes absences', 'absences/liste.html', 'absences']);
    if (role !== 'beneficiaire' && role !== 'proche_aidant' && role !== 'facturation' && role !== 'maintenance') l.push(['Incidents', 'interventions/incidents.html', 'incidents']);
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
  function coque(user) {
    var courant = document.body.getAttribute('data-menu') || document.body.getAttribute('data-ressource') || '', l = liens(user.role), nav = '';
    var GROUPES = { accueil: 'Activité', planning: 'Activité', 'comptes-rendus': 'Activité', incidents: 'Activité', beneficiaires: 'Personnes', intervenants: 'Personnes', aidants: 'Personnes', medecins: 'Personnes', disponibilites: 'Personnes',
                    factures: 'Gestion', nouvelle: 'Gestion', tarifs: 'Gestion', utilisateurs: 'Système', journal: 'Système' }, ORDRE = ['Activité', 'Personnes', 'Gestion', 'Système'];
    for (var g = 0; g < ORDRE.length; g++) {
      var bloc = '';
      for (var i = 0; i < l.length; i++) if ((GROUPES[l[i][2]] || 'Activité') === ORDRE[g]) bloc += '<a href="' + FRONT + l[i][1] + '"' + (l[i][2] === courant ? ' aria-current="page"' : '') + '>' + ico('n_' + l[i][2].replace(/-/g, '_')) + l[i][0] + '</a>';
      if (bloc) nav += '<span class="group">' + ORDRE[g] + '</span>' + bloc;
    }
    document.body.innerHTML =
      '<div class="app"><aside class="sidebar"><div class="brand">Suivi à domicile<small>' + esc(NOMS[user.role] || user.role) + '</small></div>' +
      '<nav class="nav" aria-label="Menu principal">' + nav + '<span class="group compte">Compte</span><a href="' + FRONT + 'notifications/liste.html"' + (courant === 'notifications' ? ' aria-current="page"' : '') + '>' + ico('n_notifications') + 'Notifications</a><a href="' + FRONT + 'auth/mot-de-passe.html">' + ico('n_mdp') + 'Mot de passe</a></nav></aside>' +
      '<div class="main"><header class="topbar"><span></span><div class="user"><a class="cloche" id="cloche" href="' + FRONT + 'notifications/liste.html" title="Notifications" aria-label="Notifications">' + ico('cloche') + ' <span class="badge" id="cloche-n" hidden>0</span></a><div class="avatar">' + esc(user.identifiant.slice(0, 2).toUpperCase()) +
      '</div><div class="who">' + esc(user.identifiant) + '<span>' + esc(NOMS[user.role] || user.role) + '</span></div>' +
      '' + btnIco('deconnexion', 'Déconnexion', 'href="' + FRONT + 'auth/login.html" data-logout', 'a') + '</div></header><main class="content" id="contenu"></main></div></div>';
    window.initTiroir();
    majCloche(user);
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
