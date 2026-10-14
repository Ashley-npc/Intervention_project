// Communication avec le backend. Tout le front passe par appel() : un seul endroit à modifier si l'adresse change.
// Adresses calculées à partir de l'emplacement de ce script (frontend/assets/js/api.js) :
// plus besoin de changer des chemins relatifs quand on déplace une page d'un dossier à l'autre.
var FRONT = new URL('../../', document.currentScript.src).href;      // .../frontend/
var API = new URL('../backend/api/', FRONT).href;                      // .../backend/api/
function aller(chemin) { location.replace(FRONT + chemin); }          // aller('auth/login.html')

// Rôle (libellé dans la table role) -> page d'accueil correspondante.
var PAGES = {
  administrateur: 'tableaux-de-bord/admin.html',
  coordinateur: 'tableaux-de-bord/coordinateur.html',
  intervenant: 'tableaux-de-bord/intervenant.html',
  responsable_qualite: 'tableaux-de-bord/qualite.html',
  facturation: 'tableaux-de-bord/facturation.html',
  direction: 'tableaux-de-bord/direction.html',
  maintenance: 'tableaux-de-bord/maintenance.html',
  proche_aidant: 'tableaux-de-bord/proche-aidant.html',
  beneficiaire: 'tableaux-de-bord/beneficiaire.html'
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
