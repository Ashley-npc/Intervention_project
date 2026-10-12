// Planning par semaine : 7 cartes (une par jour) dans une liste défilante.
//   <body data-mode="coordination"> : coordinateur / administrateur (filtre par intervenant, ajout d'intervention)
//   <body data-mode="intervenant">   : l'intervenant voit ses propres interventions (+ accès au compte rendu)
Shell.demarrer(function (contenu, user) {
  var mode = document.body.getAttribute('data-mode');
  var coord = mode === 'coordination';
  var lundi = lundiDe(param('date') || aujourdhui()), filtre = '';
  document.title = 'Planning · Suivi à domicile';

  contenu.innerHTML =
    '<div class="page-head"><div><h1>' + (coord ? 'Planning' : 'Mon planning') + '</h1><p id="periode"></p></div>' +
    (coord ? '<a class="btn" id="nouvelle" href="' + FRONT + 'interventions/form.html">+ Nouvelle intervention</a>' : '') + '</div>' +
    '<section class="card"><div class="toolbar"><button type="button" class="btn small" id="prec">‹ Semaine précédente</button>' +
    '<button type="button" class="btn small" id="auj">Aujourd\'hui</button><button type="button" class="btn small" id="suiv">Semaine suivante ›</button>' +
    (coord ? '<select id="filtre" aria-label="Filtrer par intervenant"><option value="">Tous les intervenants</option></select>' : '') + '</div>' +
    '<div id="semaine"><p class="empty">Chargement…</p></div></section>';

  if (coord) appel('intervenants.php').then(function (r) {
    if (!r.ok) return;
    var s = document.getElementById('filtre'), o = '';
    for (var i = 0; i < r.data.items.length; i++) o += '<option value="' + r.data.items[i].id + '">' + esc(r.data.items[i].prenom + ' ' + r.data.items[i].nom) + '</option>';
    s.insertAdjacentHTML('beforeend', o);
  });

  function lienIntervention(x) { return FRONT + (coord ? 'interventions/fiche.html' : 'espace-intervenant/compte-rendu.html') + '?id=' + x.id; }
  function carte(jour, items) {
    var h = '<article class="pers jour' + (jour === aujourdhui() ? ' auj' : '') + '"><h3>' + jourLong(jour) + '</h3>';
    if (!items.length) h += '<p class="muted">Rien de prévu.</p>';
    for (var i = 0; i < items.length; i++) {
      var x = items[i], qui = coord ? x.beneficiaire_prenom + ' ' + x.beneficiaire_nom + ' · ' + x.intervenant_prenom + ' ' + x.intervenant_nom : x.beneficiaire_prenom + ' ' + x.beneficiaire_nom;
      h += '<a class="creneau' + (/^a/.test(x.statut) ? ' off' : '') + '" href="' + lienIntervention(x) + '"><b>' + x.heure_debut + '–' + x.heure_fin + '</b><span>' + esc(qui) + '</span><small>' +
           esc(x.type) + (x.lieu !== 'domicile' ? ' · extérieur' : '') + '</small><span>' + badgeStatut(x) + '</span></a>';
    }
    if (coord) h += '<a class="btn small" href="' + FRONT + 'interventions/form.html?date=' + jour + (filtre ? '&id_intervenant=' + filtre : '') + '">+ Ajouter</a>';
    return h + '</article>';
  }
  function charger() {
    var dim = addJours(lundi, 6);
    document.getElementById('periode').textContent = 'Du ' + jourLong(lundi) + ' au ' + jourLong(dim);
    appel('interventions.php?du=' + lundi + '&au=' + dim + (filtre ? '&id_intervenant=' + filtre : '')).then(function (r) {
      var zone = document.getElementById('semaine');
      if (!r.ok) { zone.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var par = {}, h = '', i;
      for (i = 0; i < r.data.items.length; i++) (par[r.data.items[i].date] = par[r.data.items[i].date] || []).push(r.data.items[i]);
      for (i = 0; i < 7; i++) { var j = addJours(lundi, i); h += carte(j, par[j] || []); }
      zone.innerHTML = railHtml(h); railInit(zone);
      // Place la carte du jour (ou la première) en tête de la zone visible.
      var rail = zone.querySelector('.rail'), auj = zone.querySelector('.auj');
      if (auj && rail) rail.scrollLeft = auj.offsetLeft - rail.offsetLeft;
    });
  }
  document.getElementById('prec').addEventListener('click', function () { lundi = addJours(lundi, -7); charger(); });
  document.getElementById('suiv').addEventListener('click', function () { lundi = addJours(lundi, 7); charger(); });
  document.getElementById('auj').addEventListener('click', function () { lundi = lundiDe(aujourdhui()); charger(); });
  if (coord) document.getElementById('filtre').addEventListener('change', function () { filtre = this.value; charger(); });
  charger();
});
