// Petites fonctions d'affichage partagées (ES5, compatible vieux navigateurs).
function esc(t) {
  return String(t === null || t === undefined ? '' : t).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
// Icones SVG en ligne (trait simple, couleur du texte). ico('ouvrir','Ouvrir') -> <svg> ; le libelle va dans title/aria-label du bouton.
var ICONES = {
  ouvrir: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  voir: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  telecharger: '<path d="M12 4v10M8 10l4 4 4-4M5 19h14"/>',
  televerser: '<path d="M12 15V5M8 9l4-4 4 4M5 19h14"/>',
  n_documents: '<path d="M3 6h6l2 2h10v11H3z"/>',
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
  n_organismes: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  n_indicateurs: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  n_tarifs: '<path d="M3 12l9-9h8v8l-9 9z"/><circle cx="15.5" cy="8.5" r="1"/>',
  n_utilisateurs: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  n_incidents: '<path d="M12 4l9 16H3zM12 10v4M12 17v.5"/>',
  n_absences: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M10 13.5l4 4M14 13.5l-4 4"/>',
  n_disponibilites: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  n_parametres: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
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
// Duree ecoulee : "a l'instant", "il y a 5 min", "il y a 3 h", "il y a 4 jours"; au-dela de 7 jours : date complete.
function ilYA(d) {
  var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(d || ''); if (!m) return '';
  var t = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), mn = Math.floor((Date.now() - t.getTime()) / 60000);
  if (mn < 1) return "à l'instant";
  if (mn < 60) return 'il y a ' + mn + ' min';
  if (mn < 1440) return 'il y a ' + Math.floor(mn / 60) + ' h';
  if (mn < 10080) { var j = Math.floor(mn / 1440); return 'il y a ' + j + (j > 1 ? ' jours' : ' jour'); }
  return dateFr(d) + ' à ' + m[4] + ':' + m[5];
}
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
// Motifs d'absence
LIBELLES.conge = 'Congé'; LIBELLES.formation = 'Formation'; LIBELLES['arret maladie'] = 'Arrêt maladie'; LIBELLES.imprevue = 'Absence imprévue';
LIBELLES.hospitalisation = 'Hospitalisation'; LIBELLES.voyage = 'Voyage'; LIBELLES.refus = 'Refus'; if (!LIBELLES.autre) LIBELLES.autre = 'Autre';
function lib(v) { return LIBELLES.hasOwnProperty(v) ? LIBELLES[v] : (v === null || v === undefined ? '' : v); }

// ---------- Affichage commun ----------
function badgeStatut(i) {
  var s = i.statut, cls = /^r/.test(s) ? 'ok' : /^a/.test(s) ? 'grey' : '';
  var txt = lib(s);
  return '<span class="badge ' + cls + '">' + esc(txt) + '</span>' + (i.urgente ? ' <span class="badge danger">Urgent</span>' : '') + (i.validee ? ' <span class="badge ok">Validée</span>' : '');
}
// Liste de cartes en grille (1 à 4 colonnes selon l'écran), avec défilement vers le bas : voir .rail dans app.css.
function initiales(nom) {
  var p = String(nom || '').replace(/[^A-Za-z\u00C0-\u00FF ]/g, '').split(' ').filter(function (m) { return m; });
  return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
}
// Carte compacte : avatar (initiales) | titre + badges + infos sur une ligne | icone d'action. 'infos' = liste de textes deja echappes.
function persHtml(o) {
  var corps = o.corps || ('<div class="u1"><span class="nm"><b class="nmi">' + (o.lien ? '<a href="' + o.lien + '">' + esc(o.titre) + '</a>' : esc(o.titre)) + '</b></span>' +
    (o.badges ? ' ' + o.badges : '') + (o.cote ? '<span class="cote">' + o.cote + '</span>' : '') + '</div><div class="u2 wrap">' + o.infos.join(' <i class="sep">·</i> ') + '</div>');
  return '<article class="pers' + (o.off ? ' off' : '') + '"><span class="uav">' + esc(initiales(o.avatar || o.titre)) + '</span><div class="uinfo">' + corps + '</div>' + (o.action || '') + '</article>';
}
// Carte facture (admin, facturation, tableau de bord) : ligne 1 = beneficiaire (en evidence) + reference discrete | statut ; ligne 2 = montant | reste ; ligne 3 (facultative) = date.
function factureCarte(f) {
  var lien = FRONT + 'facturation/facture.html?id=' + f.id;
  return persHtml({ avatar: f.benef, action: btnIco('ouvrir', 'Ouvrir', 'href="' + lien + '"', 'a'),
    corps: '<div class="frows"><div class="frow"><span class="lft"><span class="nm"><b class="nmi"><a href="' + lien + '">' + esc(f.benef) + '</a></b></span><span class="fnum">' + esc(f.numero) + '</span></span>' +
           '<span class="fr">' + badgeFacture(f.statut) + '</span></div>' +
           '<div class="frow"><span class="fl"><span class="et">Montant :</span> ' + argent(f.total) + '</span><span class="fr"><span class="et">Reste :</span> <b>' + argent(f.restant) + '</b></span></div>' +
           (f.date ? '<div class="frow"><span class="fl et">Émise le ' + dateFr(f.date) + (f.retard ? ' · <b class="retard">En retard</b>' : '') + '</span></div>' : '') + '</div>' });
}
function railHtml(cartes) { return '<div class="rail">' + cartes + '</div>'; }
// Noms trop longs : ils defilent doucement (aller-retour) au lieu d'etre coupes. Sans effet si le nom tient.
function railInit() {
  setTimeout(function () {
    var l = document.querySelectorAll('.pers .nm');
    for (var i = 0; i < l.length; i++) {
      var d = l[i].firstChild.scrollWidth - l[i].clientWidth;
      if (d > 2) { l[i].style.setProperty('--d', d + 'px'); l[i].className = 'nm long'; l[i].title = l[i].textContent; }
    }
  }, 50);
}
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
