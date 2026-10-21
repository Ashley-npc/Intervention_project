// Page « Documents » : recherche dans tous les documents autorisés pour votre rôle, et dépôt.
Shell.demarrer(function (contenu) {
  document.title = 'Documents · Suivi à domicile';
  contenu.innerHTML = '<div class="page-head"><div><h1>Documents</h1><p id="doc-compte"></p></div></div><section class="card" id="doc-carte"></section>';
  Documents.carte(document.getElementById('doc-carte'), null);
});
