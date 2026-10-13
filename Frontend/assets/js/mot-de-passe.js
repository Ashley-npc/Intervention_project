// Changement du mot de passe (obligatoire après un mot de passe temporaire).
(function () {
  var form = document.getElementById("form"),
    erreur = document.getElementById("erreur"),
    bouton = form.querySelector("button");
  function afficher(m) {
    erreur.textContent = m;
    erreur.hidden = false;
  }
  window.utilisateurPret.then(function (user) {
    if (user.doit_changer) document.getElementById("info").hidden = false;
    else {
      document.getElementById("retour").hidden = false;
      document.getElementById("lien-retour").href = FRONT + PAGES[user.role];
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      erreur.hidden = true;
      var n = document.getElementById("nouveau").value;
      if (n !== document.getElementById("confirmation").value) {
        afficher("La confirmation est différente du nouveau mot de passe.");
        return;
      }
      bouton.disabled = true;
      appel("mot-de-passe.php", {
        method: "POST",
        body: JSON.stringify({
          ancien: document.getElementById("ancien").value,
          nouveau: n,
        }),
      }).then(
        function (r) {
          if (r.ok && r.data.ok) {
            aller(PAGES[user.role] || "auth/login.html");
            return;
          }
          afficher(r.data.message || "Impossible de changer le mot de passe.");
          bouton.disabled = false;
        },
        function () {
          afficher("Impossible de joindre le serveur.");
          bouton.disabled = false;
        },
      );
    });
  });
})();
