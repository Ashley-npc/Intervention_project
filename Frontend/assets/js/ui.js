// Petites fonctions d'affichage partagées (ES5, compatible vieux navigateurs).
function esc(t) {
  return String(t === null || t === undefined ? '' : t).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
// Icones SVG en ligne (trait simple, couleur du texte). ico('ouvrir','Ouvrir') -> <svg> ; le libelle va dans title/aria-label du bouton.
var ICONES = {
  ouvrir: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  modifier: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4"/>',
  retirer: '<path d="M6 6l12 12M18 6L6 18"/>',
  lue: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  nonlue: '<circle cx="12" cy="12" r="7"/>',
  reinit: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/>',
  desactiver: '<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
  reactiver: '<path d="M12 3v8M7 6.5a7 7 0 1 0 10 0"/>',
  deconnexion: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
  n_accueil: '<path d="M4 11l8-7 8 7M6 10v10h12V10"/>',
  n_planning: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  n_beneficiaires: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>',
  n_intervenants: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.8-6 6.5-6s6.5 2.5 6.5 6M16 5a3.5 3.5 0 0 1 0 6.5M18 14c2 .7 3.5 2.4 3.5 6"/>',
  n_comptes_rendus: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"/>',
  n_aidants: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  n_medecins: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
  n_factures: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
  n_nouvelle: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
  n_tarifs: '<path d="M3 12l9-9h8v8l-9 9z"/><circle cx="15.5" cy="8.5" r="1"/>',
  n_utilisateurs: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  n_incidents: '<path d="M12 4l9 16H3zM12 10v4M12 17v.5"/>',
  n_journal: '<path d="M7 3h10v18H7zM10 8h4M10 12h4M10 16h4"/>',
  n_notifications: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/>',
  n_mdp: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2"/>',
  cloche: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/>'
};
function ico(nom) {
  return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' + (ICONES[nom] || '') + '</svg>';
}
// Bouton/lien icone : tag 'a' ou 'button', libelle accessible (info-bulle + lecteurs d'ecran).
function btnIco(nom, libelle, attrs, tag) {
  return '<' + (tag || 'button') + (tag === 'a' ? '' : ' type="button"') + ' class="btn small ic" title="' + esc(libelle) + '" aria-label="' + esc(libelle) + '" ' + (attrs || '') + '>' + ico(nom) + '</' + (tag || 'button') + '>';
}
function param(nom) {
  var m = location.search.match(new RegExp('[?&]' + nom + '=([^&]*)'));
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
}
function dateFr(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function heure(h) { return h ? String(h).slice(0, 5) : ''; }
function age(d) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); if (!m) return '';
  var n = new Date(), a = n.getFullYear() - m[1];
  if (n.getMonth() + 1 < +m[2] || (n.getMonth() + 1 === +m[2] && n.getDate() < +m[3])) a--;
  return a + ' ans';
}

// ---------- Dates (en texte AAAA-MM-JJ, sans passer par les fuseaux horaires) ----------
function dateDe(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); return new Date(+m[1], +m[2] - 1, +m[3]); }
function isoDe(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function aujourdhui() { return isoDe(new Date()); }
function addJours(iso, n) { var d = dateDe(iso); d.setDate(d.getDate() + n); return isoDe(d); }
function lundiDe(iso) { var d = dateDe(iso), j = (d.getDay() + 6) % 7; d.setDate(d.getDate() - j); return isoDe(d); }
var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function jourLong(iso) { var d = dateDe(iso); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]; }
function dateLongue(iso) { var d = dateDe(iso); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear(); }

// ---------- Libellés : la base stocke des valeurs SANS accents, l'écran affiche les libellés avec accents ----------
var LIBELLES = { planifiee: 'Planifiée', realisee: 'Réalisée', annulee: 'Annulée', exterieur: 'Extérieur', domicile: 'Au domicile',
  salarie: 'Salarié', benevole: 'Bénévole', prestataire: 'Prestataire', 'aide a la personne': 'Aide à la personne', soins: 'Soins',
  accompagnement: 'Accompagnement', 'lien social': 'Lien social', bon: 'Bon', moyen: 'Moyen', preoccupant: 'Préoccupant',
  emise: 'Émise', payee: 'Payée', impayee: 'Impayée', relancee: 'Relancée', espece: 'Espèces', banque: 'Banque', operateur: 'Opérateur mobile' };
function lib(v) { return LIBELLES.hasOwnProperty(v) ? LIBELLES[v] : (v === null || v === undefined ? '' : v); }

// ---------- Affichage commun ----------
function badgeStatut(i) {
  var s = i.statut, cls = /^r/.test(s) ? 'ok' : /^a/.test(s) ? 'grey' : '';
  var txt = lib(s);
  return '<span class="badge ' + cls + '">' + esc(txt) + '</span>' + (i.urgente ? ' <span class="badge danger">Urgent</span>' : '') + (i.validee ? ' <span class="badge ok">Validée</span>' : '');
}
// Liste de cartes en grille (1 à 4 colonnes selon l'écran), avec défilement vers le bas : voir .rail dans app.css.
function railHtml(cartes) { return '<div class="rail">' + cartes + '</div>'; }
function railInit() {}   // plus rien à brancher (conservé pour compatibilité)
// Affiche les erreurs de champs renvoyées par l'API (422/409) sous chaque champ #e_<nom>.
function montrerErreurs(r, msgId) {
  var m = document.getElementById(msgId || 'msg'); m.textContent = r.data.message || 'Erreur.'; m.hidden = false;
  var er = r.data.erreurs || {};
  for (var k in er) { var s = document.getElementById('e_' + k); if (s) { s.textContent = er[k]; if (s.parentNode.className.indexOf('invalide') < 0) s.parentNode.className += ' invalide'; } }
  window.scrollTo(0, 0);
}
function effacerErreurs(msgId) {
  var spans = document.querySelectorAll('.field-err'); for (var i = 0; i < spans.length; i++) spans[i].textContent = '';
  var f = document.querySelectorAll('.invalide'); for (i = 0; i < f.length; i++) f[i].className = f[i].className.replace(' invalide', '');
  document.getElementById(msgId || 'msg').hidden = true;
}

// Montants en Ariary : 1 250 000 Ar (les centimes ne s'affichent que s'il y en a).
function argent(n) {
  n = Number(n) || 0;
  var t = (Math.round(n * 100) / 100).toFixed(Math.round(n * 100) % 100 === 0 ? 0 : 2).replace('.', ',');
  var p = t.split(','); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  return p.join(',') + '\u00a0Ar';
}
function badgeFacture(s) { return '<span class="badge ' + (s === 'payee' ? 'ok' : s === 'impayee' ? 'danger' : s === 'relancee' ? 'warn' : '') + '">' + esc(lib(s)) + '</span>'; }
