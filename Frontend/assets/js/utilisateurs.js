// Gestion des comptes (administrateur) : création avec mot de passe temporaire, réinitialisation, activation.
Shell.demarrer(function (contenu, moi) {
  document.title = 'Utilisateurs · Suivi à domicile';
  var donnees = null;
  function boite(titre, ident, mdp) {
    return '<div class="card mdp-box" role="status"><h2>' + esc(titre) + '</h2><p>Identifiant : <b>' + esc(ident) + '</b><br>Mot de passe temporaire : <code>' + esc(mdp) +
           '</code></p><p class="muted">À transmettre à la personne (de vive voix ou par message). Il ne sera plus affiché : en cas de perte, utilisez « Réinitialiser ». Elle devra le changer à sa première connexion.</p></div>';
  }
  function ouvrir(info) {
    contenu.innerHTML = '<div class="page-head"><div><h1>Utilisateurs</h1><p id="compte"></p></div></div><div id="info">' + (info || '') + '</div>' +
      '<section class="card"><header><h2>Créer un compte</h2></header><p class="msg-err" id="msg" hidden></p><form id="f" novalidate><div class="form-grid">' +
      '<div class="field"><label for="c_identifiant">Identifiant *</label><input id="c_identifiant" name="identifiant" type="text" autocomplete="off" autocapitalize="none"><span class="field-err" id="e_identifiant"></span></div>' +
      '<div class="field"><label for="c_role">Rôle *</label><select id="c_role" name="role"></select><span class="field-err" id="e_role"></span></div>' +
      '<div class="field large" id="bloc-interv"><label for="c_id_intervenant">Fiche intervenant *</label><select id="c_id_intervenant" name="id_intervenant"></select><span class="field-err" id="e_id_intervenant"></span></div>' +
      '</div><div class="actions"><button class="btn" type="submit" id="ok">Créer le compte</button></div></form></section>' +
      '<section class="card"><header><h2>Comptes</h2></header><div class="table-wrap stack" id="liste"></div></section>';
    charger();
  }
  function charger() {
    appel('utilisateurs.php').then(function (r) {
      if (!r.ok) { document.getElementById('liste').innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      donnees = r.data;
      document.getElementById('compte').textContent = donnees.items.length + ' comptes';
      var roles = '', i;
      for (i = 0; i < donnees.roles.length; i++) roles += '<option value="' + esc(donnees.roles[i]) + '">' + esc(donnees.roles[i]) + '</option>';
      document.getElementById('c_role').innerHTML = roles;
      var lib = '<option value="">— choisir —</option>';
      for (i = 0; i < donnees.intervenants_libres.length; i++) lib += '<option value="' + donnees.intervenants_libres[i].id + '">' + esc(donnees.intervenants_libres[i].prenom + ' ' + donnees.intervenants_libres[i].nom) + '</option>';
      document.getElementById('c_id_intervenant').innerHTML = lib;
      majRole();
      var h = '<table><thead><tr><th>Identifiant</th><th>Rôle</th><th>Fiche liée</th><th>Dernière connexion</th><th></th></tr></thead><tbody>';
      for (i = 0; i < donnees.items.length; i++) {
        var u = donnees.items[i];
        h += '<tr' + (u.inactif ? ' class="off"' : '') + '><td data-l="Identifiant"><b>' + esc(u.identifiant) + '</b> ' + (u.inactif ? '<span class="badge grey">Désactivé</span>' : '') + (u.mdp_temporaire ? ' <span class="badge warn">Mot de passe temporaire</span>' : '') + '</td>' +
             '<td data-l="Rôle">' + esc(u.role) + '</td><td data-l="Fiche liée">' + esc(u.intervenant || '—') + '</td><td data-l="Dernière connexion">' + esc(u.derniere_connexion || 'Jamais') + '</td>' +
             '<td class="actions"><button type="button" class="btn small" data-act="reset" data-id="' + u.id + '">Réinitialiser</button> ' +
             (u.identifiant === moi.identifiant ? '' : '<button type="button" class="btn small" data-act="actif" data-id="' + u.id + '" data-actif="' + (u.actif ? 0 : 1) + '">' + (u.actif ? 'Désactiver' : 'Réactiver') + '</button>') + '</td></tr>';
      }
      document.getElementById('liste').innerHTML = h + '</tbody></table>';
    });
  }
  function majRole() { document.getElementById('bloc-interv').hidden = document.getElementById('c_role').value !== 'intervenant'; }

  contenu.addEventListener('change', function (e) { if (e.target.id === 'c_role') majRole(); });
  contenu.addEventListener('submit', function (e) {
    e.preventDefault(); effacerErreurs();
    var corps = { identifiant: document.getElementById('c_identifiant').value, role: document.getElementById('c_role').value };
    if (corps.role === 'intervenant') corps.id_intervenant = Number(document.getElementById('c_id_intervenant').value) || 0;
    var b = document.getElementById('ok'); b.disabled = true;
    appel('utilisateurs.php', { method: 'POST', body: JSON.stringify(corps) }).then(function (r) {
      b.disabled = false;
      if (r.ok) ouvrir(boite('Compte créé', r.data.identifiant, r.data.mot_de_passe_temporaire)); else montrerErreurs(r);
    }, function () { b.disabled = false; });
  });
  contenu.addEventListener('click', function (e) {
    var a = e.target.getAttribute && e.target.getAttribute('data-act'); if (!a) return;
    var uid = e.target.getAttribute('data-id');
    if (a === 'reset') {
      if (!window.confirm('Générer un nouveau mot de passe temporaire ? L\'ancien ne fonctionnera plus.')) return;
      appel('utilisateurs.php?id=' + uid, { method: 'PUT', body: JSON.stringify({ reinitialiser: true }) }).then(function (r) {
        if (r.ok) { ouvrir(boite('Mot de passe réinitialisé', r.data.identifiant, r.data.mot_de_passe_temporaire)); window.scrollTo(0, 0); } else alert(r.data.message || 'Erreur.');
      });
    } else if (a === 'actif') {
      var on = e.target.getAttribute('data-actif') === '1';
      if (!on && !window.confirm('Désactiver ce compte ? La personne ne pourra plus se connecter (ses données restent).')) return;
      appel('utilisateurs.php?id=' + uid, { method: 'PUT', body: JSON.stringify({ actif: on }) }).then(function (r) { if (r.ok) charger(); else alert(r.data.message || 'Erreur.'); });
    }
  });
  ouvrir('');
});
