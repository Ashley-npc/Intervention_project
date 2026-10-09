// Protège une page : vérifie la connexion auprès du backend, puis affiche la page.
// Si la personne n'est pas connectée, ou n'a pas le rôle de cette page, elle est renvoyée ailleurs.
(function () {
  var page = location.pathname.split('/').pop();
  var roleDeLaPage = null;
  // Pages hors PAGES : <html data-roles="coordinateur,administrateur"> liste les rôles autorisés.
  var rolesAutorises = (document.documentElement.getAttribute('data-roles') || '').split(',');
  // window.utilisateurPret : promesse résolue avec l'utilisateur une fois la vérification faite.
  var resoudre;
  window.utilisateurPret = new Promise(function (ok) { resoudre = ok; });
  for (var r in PAGES) { if (PAGES[r] === page) roleDeLaPage = r; }

  // Bouton « Déconnexion » : tout lien avec l'attribut data-logout
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-logout]') : null;
    if (!a) return;
    e.preventDefault();
    appel('logout.php', { method: 'POST', body: '{}' }).then(function () { location.replace('login.html'); });
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
    if (!r.ok || !r.data.ok) { location.replace('login.html'); return; }
    var user = r.data.user;
    if (roleDeLaPage && roleDeLaPage !== user.role) {
      location.replace(PAGES[user.role] || 'login.html');   // mauvaise page pour ce rôle
      return;
    }
    if (rolesAutorises[0] && rolesAutorises.indexOf(user.role) < 0) {
      location.replace(PAGES[user.role] || 'login.html');
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
