<?php
// Messagerie interne (CDC 5.10) : envoyer un message, consulter l'historique des échanges. Tous les comptes.
//   GET  messages.php            conversations (dernier message, non lus) + personnes que je peux contacter
//   GET  messages.php?avec=5     échange avec la personne 5 (les messages reçus sont marqués lus)
//   POST messages.php            {id_destinataire, contenu}   envoi (le destinataire reçoit une notification)
// Règles : un message n'est jamais modifié ni supprimé (traçabilité) ; le coordinateur peut écrire à tout le monde,
// les autres rôles ne peuvent écrire qu'aux coordinateurs ; direction, qualité, administrateur et maintenance échangent entre eux.
// Le journal garde l'envoi (qui, à qui), pas le contenu.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/notifications.php';

$user = exiger_connexion();
$moi = (int)$user['id'];
$methode = $_SERVER['REQUEST_METHOD'];
const MESSAGE_MAX = 2000;
const GROUPE_DIRECTION = ['direction', 'responsable_qualite', 'administrateur', 'maintenance'];

function peut_ecrire_a(string $mon_role, string $role_autre): bool {
    if ($mon_role === 'coordinateur' || $role_autre === 'coordinateur') return true;
    return in_array($mon_role, GROUPE_DIRECTION, true) && in_array($role_autre, GROUPE_DIRECTION, true);
}

// Tous les comptes avec leur nom affichable (nom de la fiche liée, sinon nom du compte, sinon identifiant).
function comptes_messagerie(): array {
    $l = db()->query(
        'SELECT u.id_utilisateur AS id, u.identifiant, u.actif, u.nom AS u_nom, u.prenom AS u_prenom, r.libelle AS role,
                v.prenom AS i_prenom, v.nom AS i_nom, pa.prenom AS a_prenom, pa.nom AS a_nom, bb.prenom AS b_prenom, bb.nom AS b_nom
         FROM utilisateur u JOIN role r ON r.id_role = u.id_role
         LEFT JOIN intervenant v ON v.id_utilisateur = u.id_utilisateur
         LEFT JOIN proche_aidant pa ON pa.id_utilisateur = u.id_utilisateur
         LEFT JOIN beneficiaire bb ON bb.id_utilisateur = u.id_utilisateur')->fetchAll();
    $out = [];
    foreach ($l as $c) {
        $nom = '';
        foreach (['i', 'a', 'b'] as $k) if ($nom === '' && !empty($c[$k . '_nom'])) $nom = trim(($c[$k . '_prenom'] ?? '') . ' ' . $c[$k . '_nom']);
        if ($nom === '') $nom = trim(($c['u_prenom'] ?? '') . ' ' . ($c['u_nom'] ?? ''));
        if ($nom === '') $nom = (string)$c['identifiant'];
        $out[(int)$c['id']] = ['id' => (int)$c['id'], 'nom' => $nom, 'role' => $c['role'], 'actif' => (bool)$c['actif']];
    }
    return $out;
}

$comptes = comptes_messagerie();

if ($methode === 'GET') {
    if (isset($_GET['avec'])) {                                             // ----- un échange
        $autre = (int)$_GET['avec'];
        if ($autre === $moi || !isset($comptes[$autre])) json_out(404, ['ok' => false, 'message' => 'Personne introuvable.']);
        $st = db()->prepare('SELECT id_message AS id, id_expediteur, contenu, date_envoi, lu FROM message
                             WHERE (id_expediteur = ? AND id_destinataire = ?) OR (id_expediteur = ? AND id_destinataire = ?)
                             ORDER BY id_message DESC LIMIT 200');
        $st->execute([$moi, $autre, $autre, $moi]);
        $items = array_reverse($st->fetchAll());
        foreach ($items as &$m) { $m['id'] = (int)$m['id']; $m['moi'] = (int)$m['id_expediteur'] === $moi; $m['lu'] = (bool)$m['lu']; unset($m['id_expediteur']); }
        unset($m);
        db()->prepare('UPDATE message SET lu = 1, date_lecture = ? WHERE id_destinataire = ? AND id_expediteur = ? AND lu = 0')->execute([date('Y-m-d H:i:s'), $moi, $autre]);
        $c = $comptes[$autre];
        json_out(200, ['ok' => true, 'personne' => ['id' => $autre, 'nom' => $c['nom'], 'role' => $c['role']], 'items' => $items,
                       'peut_ecrire' => $c['actif'] && peut_ecrire_a($user['role'], $c['role'])]);
    }
    // ----- conversations
    $st = db()->prepare('SELECT id_message, id_expediteur, id_destinataire, contenu, date_envoi, lu FROM message
                         WHERE id_expediteur = ? OR id_destinataire = ? ORDER BY id_message DESC LIMIT 1000');
    $st->execute([$moi, $moi]);
    $conv = [];
    foreach ($st->fetchAll() as $m) {
        $autre = (int)$m['id_expediteur'] === $moi ? (int)$m['id_destinataire'] : (int)$m['id_expediteur'];
        if (!isset($comptes[$autre])) continue;
        if (!isset($conv[$autre])) $conv[$autre] = ['id' => $autre, 'nom' => $comptes[$autre]['nom'], 'role' => $comptes[$autre]['role'], 'dernier' => mb_substr($m['contenu'], 0, 80),
                                                    'date' => $m['date_envoi'], 'moi' => (int)$m['id_expediteur'] === $moi, 'non_lus' => 0];
        if ((int)$m['id_destinataire'] === $moi && (int)$m['lu'] === 0) $conv[$autre]['non_lus']++;
    }
    $contacts = [];
    foreach ($comptes as $c) if ($c['id'] !== $moi && $c['actif'] && peut_ecrire_a($user['role'], $c['role'])) $contacts[] = ['id' => $c['id'], 'nom' => $c['nom'], 'role' => $c['role']];
    usort($contacts, function ($a, $b) { return strcasecmp($a['nom'], $b['nom']); });
    json_out(200, ['ok' => true, 'conversations' => array_values($conv), 'contacts' => $contacts]);
}

if ($methode === 'POST') {
    if (!empty($user['doit_changer'])) json_out(403, ['ok' => false, 'message' => 'Vous devez d\'abord changer votre mot de passe.']);
    $d = corps_json();
    $dest = (int)($d['id_destinataire'] ?? 0);
    $texte = trim((string)($d['contenu'] ?? ''));
    $erreurs = [];
    if ($texte === '') $erreurs['contenu'] = 'Le message ne peut pas être vide.';
    elseif (mb_strlen($texte) > MESSAGE_MAX) $erreurs['contenu'] = 'Le message est trop long (' . MESSAGE_MAX . ' caractères maximum).';
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    if ($dest === $moi || !isset($comptes[$dest]) || !$comptes[$dest]['actif']) json_out(404, ['ok' => false, 'message' => 'Destinataire introuvable.']);
    if (!peut_ecrire_a($user['role'], $comptes[$dest]['role'])) json_out(403, ['ok' => false, 'message' => "Vous ne pouvez pas écrire à cette personne."]);
    db()->prepare('INSERT INTO message (contenu, date_envoi, lu, id_expediteur, id_destinataire) VALUES (?, ?, 0, ?, ?)')
        ->execute([$texte, date('Y-m-d H:i:s'), $moi, $dest]);
    $id = (int)db()->lastInsertId();
    journaliser('creation', 'message', 'message ' . $id . ' envoyé à l\'utilisateur ' . $dest);
    notifier([$dest], 'Nouveau message de ' . ($comptes[$moi]['nom'] ?? 'un utilisateur'));
    json_out(201, ['ok' => true, 'id' => $id]);
}
header('Allow: GET, POST');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
