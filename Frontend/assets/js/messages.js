// Messagerie interne (CDC 5.10) : conversations, envoi d'un message, historique. Tous les comptes.
Shell.demarrer(function (contenu, user) {
  document.title = 'Messages · Suivi à domicile';
  var ROLES = { administrateur: 'Administrateur', coordinateur: 'Coordinateur', intervenant: 'Intervenant', beneficiaire: 'Bénéficiaire', proche_aidant: 'Proche aidant', responsable_qualite: 'Responsable qualité', facturation: 'Facturation', direction: 'Direction', maintenance: 'Maintenance' };
  var courant = parseInt(param('avec'), 10) || 0, contacts = [], conversations = [];
  contenu.innerHTML = '<div class="page-head"><div><h1>Messages</h1><p>Vos échanges avec les autres utilisateurs. Les messages sont conservés et ne peuvent pas être supprimés.</p></div></div>' +
    '<div class="msg-layout"><section class="card msg-liste"><header><h2>Conversations</h2></header>' +
    '<div class="field"><label for="nouveau">Nouveau message à</label><select id="nouveau"><option value="">Choisir une personne…</option></select></div>' +
    '<div id="convs"><p class="empty">Chargement…</p></div></section>' +
    '<section class="card msg-fil" id="fil"><p class="empty">Choisissez une conversation ou une personne.</p></section></div>';
  function heure(d) { return dateFr(d) + ' ' + esc(String(d).slice(11, 16)); }
  function role(r) { return ROLES[r] || r; }

  function listes() {
    return appel('messages.php').then(function (r) {
      var z = document.getElementById('convs');
      if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      conversations = r.data.conversations; contacts = r.data.contacts;
      var sel = document.getElementById('nouveau'), o = '<option value="">Choisir une personne…</option>';
      for (var i = 0; i < contacts.length; i++) o += '<option value="' + contacts[i].id + '">' + esc(contacts[i].nom) + ' (' + esc(role(contacts[i].role)) + ')</option>';
      sel.innerHTML = o;
      if (!conversations.length) { z.innerHTML = '<p class="empty">Aucune conversation.</p>'; return; }
      var h = '<ul class="convs">';
      for (var j = 0; j < conversations.length; j++) {
        var c = conversations[j];
        h += '<li><a href="#" data-id="' + c.id + '"' + (c.id === courant ? ' aria-current="true"' : '') + '><span class="conv-t"><b>' + esc(c.nom) + '</b>' +
             (c.non_lus ? ' <span class="badge danger">' + c.non_lus + '</span>' : '') + '</span><span class="muted">' + esc(role(c.role)) + ' · ' + esc(ilYA(c.date)) + '</span>' +
             '<span class="conv-d">' + (c.moi ? 'Vous : ' : '') + esc(c.dernier) + '</span></a></li>';
      }
      z.innerHTML = h + '</ul>';
    });
  }

  function fil(id) {
    courant = id;
    return appel('messages.php?avec=' + id).then(function (r) {
      var z = document.getElementById('fil');
      if (!r.ok) { z.innerHTML = '<p class="msg-err">' + esc(r.data.message || 'Erreur.') + '</p>'; return; }
      var p = r.data.personne, it = r.data.items;
      var h = '<header><h2>' + esc(p.nom) + ' <span class="muted">· ' + esc(role(p.role)) + '</span></h2></header><div class="fil" id="fil-msgs">';
      if (!it.length) h += '<p class="empty">Aucun message pour le moment.</p>';
      for (var i = 0; i < it.length; i++) h += '<div class="bulle ' + (it[i].moi ? 'moi' : 'autre') + '"><p>' + esc(it[i].contenu) + '</p><span>' + heure(it[i].date_envoi) + '</span></div>';
      h += '</div>';
      if (r.data.peut_ecrire) h += '<form id="f-msg" novalidate><p class="msg-err" id="msg" hidden></p><div class="field"><label for="texte">Votre message</label><textarea id="texte" rows="3" maxlength="2000"></textarea></div>' +
        '<div class="actions"><button class="btn" type="submit">Envoyer</button></div></form>';
      else h += '<p class="muted">Vous ne pouvez pas écrire à cette personne.</p>';
      z.innerHTML = h;
      var f = document.getElementById('fil-msgs'); f.scrollTop = f.scrollHeight;
      var form = document.getElementById('f-msg');
      if (form) form.addEventListener('submit', function (e) {
        e.preventDefault();
        var m = document.getElementById('msg'), t = document.getElementById('texte'); m.hidden = true;
        appel('messages.php', { method: 'POST', body: JSON.stringify({ id_destinataire: id, contenu: t.value }) }).then(function (r2) {
          if (!r2.ok) { m.textContent = (r2.data.erreurs && r2.data.erreurs.contenu) || r2.data.message || 'Erreur.'; m.hidden = false; return; }
          fil(id).then(listes);
        });
      });
    });
  }

  document.getElementById('convs').addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-id]') : null;
    if (!a) return; e.preventDefault(); fil(parseInt(a.getAttribute('data-id'), 10)).then(listes);
  });
  document.getElementById('nouveau').addEventListener('change', function () {
    var id = parseInt(this.value, 10); if (id) { fil(id).then(listes); this.value = ''; }
  });
  listes().then(function () { if (courant) fil(courant).then(listes); });
  setInterval(function () { if (!document.hidden) { listes(); var t = document.getElementById('texte'); if (courant && (!t || !t.value)) fil(courant); } }, 30000);
});
