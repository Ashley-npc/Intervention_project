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
