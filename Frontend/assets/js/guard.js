// Protège une page : vérifie la connexion auprès du backend, puis affiche la page.
// Si la personne n'est pas connectée, ou n'a pas le rôle de cette page, elle est renvoyée ailleurs.
(function () {
    var roleDeLaPage = null;
  // Pages hors PAGES : <html data-roles="coordinateur,administrateur"> liste les rôles autorisés.
  var rolesAutorises = (document.documentElement.getAttribute('data-roles') || '').split(',');
  // window.utilisateurPret : promesse résolue avec l'utilisateur une fois la vérification faite.
  var resoudre;
  window.utilisateurPret = new Promise(function (ok) { resoudre = ok; });
  for (var r in PAGES) { if (location.pathname.slice(-PAGES[r].length) === PAGES[r]) roleDeLaPage = r; }

  // Bouton « Déconnexion » : tout lien avec l'attribut data-logout
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-logout]') : null;
    if (!a) return;
    e.preventDefault();
    appel('logout.php', { method: 'POST', body: '{}' }).then(function () { aller('auth/login.html'); });
  });

  // Tiroir du menu sur mobile : bouton ☰ dans l'en-tête + fond cliquable. Sans effet s'il n'y a pas de menu latéral.
  window.initTiroir = function () {
    var menu = document.querySelector('.sidebar'), barre = document.querySelector('.topbar');
    if (!menu || !barre || document.getElementById('burger')) return;
    var b = document.createElement('button');
    b.id = 'burger'; b.type = 'button'; b.className = 'burger'; b.setAttribute('aria-label', 'Ouvrir le menu'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<span></span><span></span><span></span>';
    barre.insertBefore(b, barre.firstChild);
    var voile = document.createElement('div'); voile.className = 'voile'; document.body.appendChild(voile);
    function basculer(ouvert) {
      document.body.className = document.body.className.replace(/\s*menu-ouvert/, '') + (ouvert ? ' menu-ouvert' : '');
      b.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    }
    b.addEventListener('click', function () { basculer(!/menu-ouvert/.test(document.body.className)); });
    voile.addEventListener('click', function () { basculer(false); });
    menu.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) basculer(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') basculer(false); });
  };

  appel('me.php').then(function (r) {
    if (!r.ok || !r.data.ok) { aller('auth/login.html'); return; }
    var user = r.data.user;
    // Mot de passe temporaire : changement obligatoire avant tout le reste.
    if (user.doit_changer && location.pathname.indexOf('auth/mot-de-passe.html') < 0) { aller('auth/mot-de-passe.html'); return; }
    if (roleDeLaPage && roleDeLaPage !== user.role) {
      aller(PAGES[user.role] || 'auth/login.html');   // mauvaise page pour ce rôle
      return;
    }
    if (rolesAutorises[0] && rolesAutorises.indexOf(user.role) < 0) {
      aller(PAGES[user.role] || 'auth/login.html');
      return;
    }
    // Affiche le vrai nom de connexion dans l'en-tête
    var av = document.querySelector('.avatar'); if (av) av.textContent = user.identifiant.slice(0, 2).toUpperCase();
    var who = document.querySelector('.who');   if (who && who.firstChild) who.firstChild.nodeValue = user.identifiant;
    document.documentElement.classList.remove('verif');
    window.initTiroir();
    resoudre(user);
  }).catch(function () {
    document.documentElement.classList.remove('verif');
    document.body.insertAdjacentHTML('afterbegin', '<p style="margin:0;padding:10px;background:#fbe6e4;color:#7d1a14;text-align:center">Impossible de joindre le serveur.</p>');
  });
})();
