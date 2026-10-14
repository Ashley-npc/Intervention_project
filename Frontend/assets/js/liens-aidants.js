// Section « Proches aidants » sur la fiche d'un bénéficiaire : qui est lié, et ce que chacun peut voir.
RESSOURCES.beneficiaires.apresFiche = function (x, contenu) {
  var dm = document.createElement('section'); dm.className = 'card'; dm.hidden = true; contenu.appendChild(dm); DossierMedical.afficher(dm, x.id);
  var zone = document.createElement('section'); zone.className = 'card'; contenu.appendChild(zone);
  function envoyer(corps, fini) {
    corps.id_beneficiaire = x.id;
    appel('liens-aidants.php', { method: 'POST', body: JSON.stringify(corps) }).then(function (r) { if (r.ok) { if (fini) fini(); } else window.alert(r.data.message || 'Erreur.'); });
  }
  function charger() {
    appel('liens-aidants.php?id_beneficiaire=' + x.id).then(function (r) {
      if (!r.ok) { zone.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var l = r.data.items, dispo = r.data.aidants_disponibles, h = '<header><h2>Proches aidants</h2></header>', i;
      if (!l.length) h += '<p class="empty">Aucun proche aidant lié.</p>';
      else {
        h += '<div class="table-wrap stack"><table><thead><tr><th>Personne</th><th>Lien</th><th>Voit le planning</th><th>Voit l\'état</th><th>Voit le dossier médical</th><th></th></tr></thead><tbody>';
        for (i = 0; i < l.length; i++) h += '<tr><td data-l="Personne"><a href="' + FRONT + 'aidants/fiche.html?id=' + l[i].id + '">' + esc(l[i].prenom + ' ' + l[i].nom) + '</a></td><td data-l="Lien">' + esc(l[i].lien_parente || '—') + '</td>' +
          '<td data-l="Voit le planning"><input type="checkbox" data-a="' + l[i].id + '" data-d="planning"' + (l[i].planning ? ' checked' : '') + '></td><td data-l="Voit l\'état"><input type="checkbox" data-a="' + l[i].id + '" data-d="etat"' + (l[i].etat ? ' checked' : '') + '></td><td data-l="Voit le dossier médical"><input type="checkbox" data-a="' + l[i].id + '" data-d="medical"' + (l[i].medical ? ' checked' : '') + '></td>' +
          '<td><button type="button" class="btn small" data-retirer="' + l[i].id + '">Retirer</button></td></tr>';
        h += '</tbody></table></div><p class="muted">Cases cochées = autorisation du bénéficiaire. « L\'état » partage uniquement l\'état général du dernier compte rendu validé, jamais le détail.</p>';
      }
      if (dispo.length) {
        h += '<form id="lien-f" class="toolbar"><select id="lien-a" aria-label="Proche aidant">';
        for (i = 0; i < dispo.length; i++) h += '<option value="' + dispo[i].id + '">' + esc(dispo[i].prenom + ' ' + dispo[i].nom) + '</option>';
        h += '</select><input type="text" id="lien-p" placeholder="Lien (fille, voisin…)"><label class="chk"><input type="checkbox" id="lien-pl" checked> Planning</label><label class="chk"><input type="checkbox" id="lien-e"> État</label><label class="chk"><input type="checkbox" id="lien-m"> Dossier médical</label><button class="btn small" type="submit">Lier</button></form>';
      } else h += '<p class="muted">Aucun autre proche aidant à lier. <a href="' + FRONT + 'aidants/form.html">Créer un proche aidant</a></p>';
      zone.innerHTML = h;
      var form = document.getElementById('lien-f');
      if (form) form.addEventListener('submit', function (e) {
        e.preventDefault();
        envoyer({ id_aidant: Number(document.getElementById('lien-a').value), lien_parente: document.getElementById('lien-p').value, planning: document.getElementById('lien-pl').checked, etat: document.getElementById('lien-e').checked, medical: document.getElementById('lien-m').checked }, charger);
      });
    });
  }
  zone.addEventListener('change', function (e) {
    if (!e.target.getAttribute('data-a')) return;
    var id = e.target.getAttribute('data-a'), cases = zone.querySelectorAll('[data-a="' + id + '"]'), c = { id_aidant: Number(id) };
    for (var i = 0; i < cases.length; i++) c[cases[i].getAttribute('data-d')] = cases[i].checked;
    var ligne = e.target.parentNode.parentNode.children[1]; c.lien_parente = ligne ? (ligne.textContent === '—' ? '' : ligne.textContent) : '';
    envoyer(c);
  });
  zone.addEventListener('click', function (e) {
    var a = e.target.getAttribute && e.target.getAttribute('data-retirer'); if (!a) return;
    if (window.confirm('Retirer ce lien ? Cette personne ne verra plus rien de ce bénéficiaire (sa fiche est conservée).')) envoyer({ id_aidant: Number(a), retirer: true }, charger);
  });
  charger();
};
