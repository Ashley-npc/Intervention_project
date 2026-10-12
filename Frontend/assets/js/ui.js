// Petites fonctions d'affichage partagées (ES5, compatible vieux navigateurs).
function esc(t) {
  return String(t === null || t === undefined ? '' : t).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
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

// ---------- Affichage commun ----------
function badgeStatut(i) {
  var s = i.statut, cls = /^r/.test(s) ? 'ok' : /^a/.test(s) ? 'grey' : '';
  var txt = s.charAt(0).toUpperCase() + s.slice(1);
  return '<span class="badge ' + cls + '">' + esc(txt) + '</span>' + (i.urgente ? ' <span class="badge danger">Urgent</span>' : '') + (i.validee ? ' <span class="badge ok">Validée</span>' : '');
}
// Liste défilante de cartes : voir .rail dans app.css (1 carte sur mobile … 4 sur grand écran).
function railHtml(cartes) {
  return '<div class="rail-nav"><button type="button" class="btn small" data-rail="-1" aria-label="Précédents">‹</button>' +
         '<span class="muted">Faites défiler pour voir la suite</span><button type="button" class="btn small" data-rail="1" aria-label="Suivants">›</button></div>' +
         '<div class="rail">' + cartes + '</div>';
}
function railInit(racine) {
  var rail = racine.querySelector('.rail'); if (!rail) return;
  var bs = racine.querySelectorAll('[data-rail]');
  for (var i = 0; i < bs.length; i++) bs[i].addEventListener('click', function () { rail.scrollLeft += rail.clientWidth * Number(this.getAttribute('data-rail')); });
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
