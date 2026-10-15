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
      '<div class="field"><label for="c_role">Rôle *</label><select id="c_role" name="role"><option value="">— choisir —</option></select><span class="field-err" id="e_role"></span></div>' +
      '<div class="field" id="bloc-nom" hidden><label for="c_nom">Nom *</label><input id="c_nom" type="text" maxlength="60" autocomplete="off"><span class="field-err" id="e_nom"></span></div>' +
      '<div class="field" id="bloc-prenom" hidden><label for="c_prenom">Prénom *</label><input id="c_prenom" type="text" maxlength="60" autocomplete="off"><span class="field-err" id="e_prenom"></span></div>' +
      '<div class="field large" id="bloc-lie" hidden><label for="c_lie" id="lib-lie">Fiche liée *</label><select id="c_lie"></select><small id="aide-lie"></small><span class="field-err" id="e_lie"></span></div>' +
      '</div><div class="actions"><button class="btn" type="submit" id="ok">Créer le compte</button></div></form></section>' +
      '<section class="card"><header><h2>Comptes</h2></header><div id="liste"></div></section>';
    charger();
  }
  function charger() {
    appel('utilisateurs.php').then(function (r) {
      if (!r.ok) { document.getElementById('liste').innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      donnees = r.data;
      document.getElementById('compte').textContent = donnees.items.length + ' comptes';
      var roles = '<option value="">— choisir —</option>', i;
      if (donnees.avertissements && donnees.avertissements.length) {
        document.getElementById('info').innerHTML += '<div class="card"><p class="msg-err">' + esc(donnees.avertissements.join(' | ')) + '</p></div>';
      }
      for (i = 0; i < donnees.roles.length; i++) roles += '<option value="' + esc(donnees.roles[i]) + '">' + esc(donnees.roles[i]) + '</option>';
      document.getElementById('c_role').innerHTML = roles;
      majRole();
      var h = '<ul class="ulist">';
      for (i = 0; i < donnees.items.length; i++) {
        var u = donnees.items[i], nom = u.nom_complet || u.intervenant || u.identifiant, ini = nom.replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ');
        ini = ((ini[0] || '?').charAt(0) + (ini.length > 1 ? ini[ini.length - 1].charAt(0) : '')).toUpperCase();
        h += '<li class="urow' + (u.inactif ? ' off' : '') + '"><span class="uav">' + esc(ini) + '<i class="' + (u.inactif ? 'off' : 'on') + '" title="' + (u.inactif ? 'Désactivé' : 'Actif') + '"></i></span>' +
             '<div class="uinfo"><div class="u1"><b>' + esc(nom) + '</b> <span class="urole">' + esc(u.role) + '</span>' + (u.mdp_temporaire ? ' <span class="badge warn">Mot de passe temporaire</span>' : '') + (u.inactif ? ' <span class="badge grey">Désactivé</span>' : '') + '</div>' +
             '<div class="u2">' + (nom !== u.identifiant ? esc(u.identifiant) + ' · ' : '') + 'Dernière connexion : ' + esc(u.derniere_connexion || 'jamais') + '</div></div>' +
             '<div class="uact">' + btnIco('reinit', 'Réinitialiser le mot de passe', 'data-act="reset" data-id="' + u.id + '"') +
             (u.identifiant === moi.identifiant ? '' : btnIco(u.actif ? 'desactiver' : 'reactiver', u.actif ? 'Désactiver le compte' : 'Réactiver le compte', 'data-act="actif" data-id="' + u.id + '" data-actif="' + (u.actif ? 0 : 1) + '"')) + '</div></li>';
      }
      document.getElementById('liste').innerHTML = h + '</ul>';
    });
  }
  // Rôles qui doivent être reliés à une fiche : intervenant, proche_aidant, beneficiaire.
  var LIENS = { intervenant: ['id_intervenant', 'intervenants_libres', 'Fiche intervenant *'], proche_aidant: ['id_aidant', 'aidants_libres', 'Fiche proche aidant *'], beneficiaire: ['id_beneficiaire', 'beneficiaires_libres', 'Fiche bénéficiaire *'] };
  function majRole() {
    var role = document.getElementById('c_role').value, l = LIENS[role], bloc = document.getElementById('bloc-lie');
    // Sans fiche (coordinateur, facturation...) : le compte porte son nom/prenom. Avec fiche : le nom vient de la fiche.
    document.getElementById('bloc-nom').hidden = document.getElementById('bloc-prenom').hidden = !role || !!l;
    bloc.hidden = !l; if (!l) return;
    document.getElementById('lib-lie').textContent = l[2];
    var o = '<option value="">— choisir —</option>', liste = donnees[l[1]] || [];
    for (var i = 0; i < liste.length; i++) o += '<option value="' + liste[i].id + '">' + esc(liste[i].prenom + ' ' + liste[i].nom) + '</option>';
    document.getElementById('c_lie').innerHTML = o;
    document.getElementById('aide-lie').textContent = liste.length ? '' : 'Aucune fiche libre : creez d\'abord la fiche (menu Beneficiaires, Intervenants ou Proches aidants).';
  }

  contenu.addEventListener('change', function (e) { if (e.target.id === 'c_role') majRole(); });
  contenu.addEventListener('submit', function (e) {
    e.preventDefault(); effacerErreurs();
    var corps = { identifiant: document.getElementById('c_identifiant').value, role: document.getElementById('c_role').value };
    var lien = LIENS[corps.role];
    if (!lien) { corps.nom = document.getElementById('c_nom').value; corps.prenom = document.getElementById('c_prenom').value; }
    if (lien) corps[lien[0]] = Number(document.getElementById('c_lie').value) || 0;
    var b = document.getElementById('ok'); b.disabled = true;
    appel('utilisateurs.php', { method: 'POST', body: JSON.stringify(corps) }).then(function (r) {
      b.disabled = false;
      if (r.ok) ouvrir(boite('Compte créé', r.data.identifiant, r.data.mot_de_passe_temporaire)); else {
        var er = r.data.erreurs || {};
        for (var k in LIENS) if (er[LIENS[k][0]]) er.lie = er[LIENS[k][0]];   // le champ « fiche liée » est unique à l'écran
        montrerErreurs(r);
      }
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
