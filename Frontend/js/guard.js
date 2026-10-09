// Protège une page : vérifie la connexion auprès du backend, puis affiche la page.
// Si la personne n'est pas connectée, ou n'a pas le rôle de cette page, elle est renvoyée ailleurs.
(function () {
  var page = location.pathname.split('/').pop();
  var roleDeLaPage = null;
  for (var r in PAGES) { if (PAGES[r] === page) roleDeLaPage = r; }

  // Bouton « Déconnexion » : tout lien avec l'attribut data-logout
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-logout]') : null;
    if (!a) return;
    e.preventDefault();
    appel('logout.php', { method: 'POST', body: '{}' }).then(function () { location.replace('login.html'); });
  });

  appel('me.php').then(function (r) {
    if (!r.ok || !r.data.ok) { location.replace('login.html'); return; }
    var user = r.data.user;
    if (roleDeLaPage && roleDeLaPage !== user.role) {
      location.replace(PAGES[user.role] || 'login.html');   // mauvaise page pour ce rôle
      return;
    }
    // Affiche le vrai nom de connexion dans l'en-tête
    var av = document.querySelector('.avatar'); if (av) av.textContent = user.identifiant.slice(0, 2).toUpperCase();
    var who = document.querySelector('.who');   if (who && who.firstChild) who.firstChild.nodeValue = user.identifiant;
    document.documentElement.classList.remove('verif');
  }).catch(function () {
    document.documentElement.classList.remove('verif');
    document.body.insertAdjacentHTML('afterbegin', '<p style="margin:0;padding:10px;background:#fbe6e4;color:#7d1a14;text-align:center">Impossible de joindre le serveur.</p>');
  });
})();
