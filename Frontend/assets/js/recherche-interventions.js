// Recherche d'interventions avec filtres combinables, tri et pagination (CDC 5.12).
// Utilisé par la page « Interventions » et par la page « Comptes rendus » (coordinateur).
//   RechercheInterventions.demarrer(contenu, { titre, api, onglets?, statut?, type?, urgente?, tris, tri, sens, vide, action(x) })
var RechercheInterventions = (function () {
  function opt(liste, vide) {
    var o = vide ? '<option value="">' + vide + '</option>' : '';
    for (var i = 0; i < liste.length; i++) o += '<option value="' + esc(liste[i][0]) + '">' + esc(liste[i][1]) + '</option>';
    return o;
  }
  function demarrer(contenu, C) {
    var page = 1, dernier = 0, minuteur, onglet = C.onglets ? C.onglets[0][0] : '';
    if (C.onglets && C.ongletInitial) onglet = C.ongletInitial;
    var types = [], tv = (window.REFERENTIELS && window.REFERENTIELS.type_intervention) || ['aide a la personne', 'soins', 'accompagnement', 'lien social'];
    for (var t = 0; t < tv.length; t++) types.push([tv[t], lib(tv[t])]);
    var h = '<div class="page-head"><div><h1>' + C.titre + '</h1><p id="compte"></p></div></div><section class="card">';
    if (C.onglets) { h += '<div class="toolbar">'; for (var o = 0; o < C.onglets.length; o++) h += '<button type="button" class="btn small onglet" data-onglet="' + C.onglets[o][0] + '">' + C.onglets[o][1] + '</button>'; h += '</div>'; }
    h += '<div class="filtres">' +
      '<div class="field"><label for="r-q">Recherche</label><input type="text" id="r-q" placeholder="Nom du bénéficiaire ou de l\'intervenant"></div>' +
      '<div class="field"><label for="r-du">Du</label><input type="date" id="r-du"></div>' +
      '<div class="field"><label for="r-au">Au</label><input type="date" id="r-au"></div>' +
      '<div class="field"><label for="r-benef">Bénéficiaire</label><select id="r-benef"><option value="">Tous</option></select></div>' +
      '<div class="field"><label for="r-interv">Intervenant</label><select id="r-interv"><option value="">Tous</option></select></div>' +
      '<div class="field"><label for="r-secteur">Secteur</label><select id="r-secteur"><option value="">Tous</option></select></div>' +
      (C.statut ? '<div class="field"><label for="r-statut">Statut</label><select id="r-statut">' + opt(C.statut, 'Tous') + '</select></div>' : '') +
      (C.type ? '<div class="field"><label for="r-type">Type</label><select id="r-type">' + opt(types, 'Tous') + '</select></div>' : '') +
      '<div class="field"><label for="r-tri">Trier par</label><select id="r-tri">' + opt(C.tris) + '</select></div>' +
      '<div class="field"><label for="r-sens">Ordre</label><select id="r-sens">' + opt([['asc', 'Croissant'], ['desc', 'Décroissant']]) + '</select></div>' +
      (C.urgente ? '<label class="chk field"><input type="checkbox" id="r-urgente"> Urgentes seulement</label>' : '') +
      '</div><div class="actions"><button type="button" class="btn small secondary" id="r-raz">Réinitialiser les filtres</button></div>' +
      '<div id="zone"><p class="empty">Chargement…</p></div><div id="pag"></div></section>';
    contenu.innerHTML = h;
    document.getElementById('r-tri').value = C.tri; document.getElementById('r-sens').value = C.sens;
    function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
    function charger() {
      var n = ++dernier, u = C.api + (C.api.indexOf('?') < 0 ? '?' : '&') + 'page=' + page;
      if (C.onglets) u += '&etat=' + encodeURIComponent(onglet);
      var cles = { q: 'r-q', du: 'r-du', au: 'r-au', id_beneficiaire: 'r-benef', id_intervenant: 'r-interv', id_secteur: 'r-secteur', statut: 'r-statut', type: 'r-type', tri: 'r-tri', sens: 'r-sens' };
      for (var k in cles) if (val(cles[k]) !== '') u += '&' + k + '=' + encodeURIComponent(val(cles[k]));
      if (C.urgente && document.getElementById('r-urgente').checked) u += '&urgente=1';
      if (C.onglets) { var bs = document.querySelectorAll('.onglet'); for (var i = 0; i < bs.length; i++) bs[i].className = 'btn small onglet' + (bs[i].getAttribute('data-onglet') === onglet ? ' actif' : ''); }
      appel(u).then(function (r) {
        if (n !== dernier) return;
        var z = document.getElementById('zone');
        if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
        var items = r.data.items, meta = r.data.meta, s = '';
        page = meta.page;
        document.getElementById('compte').textContent = meta.total + ' résultat' + (meta.total > 1 ? 's' : '');
        document.getElementById('pag').innerHTML = pagination(meta);
        if (!items.length) { z.innerHTML = '<p class="empty">' + (C.vide ? C.vide(onglet) : 'Aucun résultat.') + '</p>'; return; }
        for (var j = 0; j < items.length; j++) {
          var x = items[j];
          s += persHtml({ titre: x.beneficiaire_prenom + ' ' + x.beneficiaire_nom, badges: badgeStatut(x),
                infos: [dateFr(x.date) + ' ' + x.heure_debut + '–' + x.heure_fin, esc(x.intervenant_prenom + ' ' + x.intervenant_nom), esc(lib(x.type))],
                action: C.action(x, onglet) });
        }
        z.innerHTML = railHtml(s); railInit(z);
      });
    }
    function zero() { page = 1; charger(); }
    document.getElementById('r-q').addEventListener('input', function () { clearTimeout(minuteur); minuteur = setTimeout(zero, 250); });
    ['r-du', 'r-au', 'r-benef', 'r-interv', 'r-secteur', 'r-statut', 'r-type', 'r-tri', 'r-sens', 'r-urgente'].forEach(function (id) { var e = document.getElementById(id); if (e) e.addEventListener('change', zero); });
    document.getElementById('r-raz').addEventListener('click', function () {
      ['r-q', 'r-du', 'r-au', 'r-benef', 'r-interv', 'r-secteur', 'r-statut', 'r-type'].forEach(function (id) { var e = document.getElementById(id); if (e) e.value = ''; });
      var u = document.getElementById('r-urgente'); if (u) u.checked = false;
      document.getElementById('r-tri').value = C.tri; document.getElementById('r-sens').value = C.sens; zero();
    });
    contenu.addEventListener('click', function (e) { var b = e.target.getAttribute && e.target.getAttribute('data-onglet'); if (b) { onglet = b; zero(); } });
    lierPagination(document.getElementById('pag'), function (p) { page = p; charger(); window.scrollTo(0, 0); });
    appel('beneficiaires.php?tout=1&statut=tous').then(function (r) { if (r.ok) { var o = ''; r.data.items.forEach(function (b) { o += '<option value="' + b.id + '">' + esc(b.prenom + ' ' + b.nom) + '</option>'; }); document.getElementById('r-benef').insertAdjacentHTML('beforeend', o); } });
    appel('intervenants.php?tout=1&statut_actif=tous').then(function (r) { if (r.ok) { var o = ''; r.data.items.forEach(function (b) { o += '<option value="' + b.id + '">' + esc(b.prenom + ' ' + b.nom) + '</option>'; }); document.getElementById('r-interv').insertAdjacentHTML('beforeend', o); } });
    appel('secteurs.php').then(function (r) { if (r.ok) { var o = ''; r.data.items.forEach(function (b) { o += '<option value="' + b.id + '">' + esc(b.libelle) + '</option>'; }); document.getElementById('r-secteur').insertAdjacentHTML('beforeend', o); } });
    charger();
  }
  return { demarrer: demarrer };
})();
