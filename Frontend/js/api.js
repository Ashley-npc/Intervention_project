// Communication avec le backend. Tout le front passe par appel() : un seul endroit à modifier si l'adresse change.
var API = '../backend/api/';

// Rôle (libellé dans la table role) -> page d'accueil correspondante.
var PAGES = {
  administrateur: 'admin.html',
  coordinateur: 'coordinateur.html',
  intervenant: 'intervenant.html',
  responsable_qualite: 'qualite.html',
  facturation: 'facturation.html',
  direction: 'direction.html',
  maintenance: 'maintenance.html',
  proche_aidant: 'proche-aidant.html',
  beneficiaire: 'beneficiaire.html'
};

// appel('login.php', {method:'POST', body: JSON.stringify({...})}) -> {status, ok, data}
function appel(fichier, options) {
  options = options || {};
  options.credentials = 'same-origin';
  options.headers = { 'Content-Type': 'application/json' };
  return fetch(API + fichier, options).then(function (rep) {
    return rep.json().catch(function () { return {}; }).then(function (data) {
      return { status: rep.status, ok: rep.ok, data: data };
    });
  });
}
