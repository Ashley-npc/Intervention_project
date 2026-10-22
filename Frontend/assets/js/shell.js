// Structure commune des pages (menu latéral + en-tête), construite après vérification de la connexion.
// Usage dans une page :  Shell.demarrer(function (contenu, user) { contenu.innerHTML = '…'; });
// <body data-menu="planning"> indique l'entrée de menu à surligner.
var Shell = (function () {
  function liens(role) {
    var l = [['Tableau de bord', PAGES[role], 'accueil']];
    if (role === 'coordinateur') {
      l.push(['Planning', 'interventions/planning.html', 'planning'], ['Bénéficiaires', 'beneficiaires/liste.html', 'beneficiaires'],
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
  function coque(user) {
    var courant = document.body.getAttribute('data-menu') || document.body.getAttribute('data-ressource') || '', l = liens(user.role), nav = '';
    var GROUPES = { accueil: 'Activité', planning: 'Activité', 'comptes-rendus': 'Activité', incidents: 'Activité', indicateurs: 'Activité', beneficiaires: 'Personnes', intervenants: 'Personnes', aidants: 'Personnes', medecins: 'Personnes', organismes: 'Gestion', documents: 'Gestion', disponibilites: 'Personnes',
                    factures: 'Gestion', nouvelle: 'Gestion', tarifs: 'Gestion', utilisateurs: 'Système', parametres: 'Système', journal: 'Système' }, ORDRE = ['Activité', 'Personnes', 'Gestion', 'Système'];
    for (var g = 0; g < ORDRE.length; g++) {
      var bloc = '';
      for (var i = 0; i < l.length; i++) if ((GROUPES[l[i][2]] || 'Activité') === ORDRE[g]) bloc += '<a href="' + FRONT + l[i][1] + '"' + (l[i][2] === courant ? ' aria-current="page"' : '') + '>' + ico('n_' + l[i][2].replace(/-/g, '_')) + l[i][0] + '</a>';
      if (bloc) nav += '<span class="group">' + ORDRE[g] + '</span>' + bloc;
    }
    document.body.innerHTML =
      '<div class="app"><aside class="sidebar"><div class="brand">' + esc(window.NOM_STRUCTURE || 'Suivi à domicile') + '<small>' + esc(NOMS[user.role] || user.role) + '</small></div>' +
      '<nav class="nav" aria-label="Menu principal">' + nav + '<span class="group compte">Compte</span><a href="' + FRONT + 'messages/liste.html"' + (courant === 'messages' ? ' aria-current="page"' : '') + '>' + ico('n_messages') + 'Messages</a><a href="' + FRONT + 'notifications/liste.html"' + (courant === 'notifications' ? ' aria-current="page"' : '') + '>' + ico('n_notifications') + 'Notifications</a><a href="' + FRONT + 'auth/mot-de-passe.html">' + ico('n_mdp') + 'Mot de passe</a></nav></aside>' +
      '<div class="main"><header class="topbar"><span></span><div class="user"><a class="cloche" id="cloche" href="' + FRONT + 'notifications/liste.html" title="Notifications" aria-label="Notifications">' + ico('cloche') + ' <span class="badge" id="cloche-n" hidden>0</span></a><div class="avatar">' + esc(user.identifiant.slice(0, 2).toUpperCase()) +
      '</div><div class="who">' + esc(user.identifiant) + '<span>' + esc(NOMS[user.role] || user.role) + '</span></div>' +
      '' + btnIco('deconnexion', 'Déconnexion', 'href="' + FRONT + 'auth/login.html" data-logout', 'a') + '</div></header><main class="content" id="contenu"></main></div></div>';
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
