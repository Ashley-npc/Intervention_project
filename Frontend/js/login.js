// Page de connexion : envoie l'identifiant et le mot de passe au backend, puis redirige selon le rôle.
(function () {
  var form = document.getElementById('form-login');
  var erreur = document.getElementById('erreur');
  var bouton = form.querySelector('button');

  function afficher(msg) { erreur.textContent = msg; erreur.hidden = false; }

  // Déjà connecté : on va directement à sa page.
  appel('me.php').then(function (r) {
    if (r.ok && r.data.ok && PAGES[r.data.user.role]) location.replace(PAGES[r.data.user.role]);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    erreur.hidden = true;
    bouton.disabled = true;
    appel('login.php', {
      method: 'POST',
      body: JSON.stringify({
        identifiant: document.getElementById('identifiant').value,
        mot_de_passe: document.getElementById('mot_de_passe').value
      })
    }).then(function (r) {
      if (r.ok && r.data.ok) {
        if (PAGES[r.data.role]) { location.replace(PAGES[r.data.role]); return; }
        afficher('Ce compte a un rôle non géré par l\'application.');
        appel('logout.php', { method: 'POST', body: '{}' });
      } else {
        afficher(r.data.message || 'Connexion impossible.');
      }
      bouton.disabled = false;
    }).catch(function () { afficher('Impossible de joindre le serveur.'); bouton.disabled = false; });
  });
})();
