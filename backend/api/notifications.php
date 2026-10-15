<?php
// Notifications de l'utilisateur connecte (tous les roles) + sa preference de communication.
//   GET  notifications.php            liste (non lues d'abord, alertes critiques en tete) + preference
//   GET  notifications.php?compte=1   seulement les compteurs (pour la cloche)
//   PUT  notifications.php?id=5       {"lue": true}            marque une notification lue
//   PUT  notifications.php            {"toutes_lues": true}    marque tout comme lu
//   PUT  notifications.php            {"preference": "application" | "courriel" | "sms"}
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/interventions.php';
require __DIR__ . '/../includes/notifications.php';

$user = exiger_connexion([], true);   // accessible meme tant que le mot de passe temporaire n'est pas change
$methode = $_SERVER['REQUEST_METHOD'];
$moi = (int)$user['id'];

if ($methode === 'GET') {
    if (empty($user['doit_changer']) && ($_SESSION['relances_ts'] ?? 0) < time() - 600) {   // au plus toutes les 10 minutes
        $_SESSION['relances_ts'] = time();
        relancer_comptes_rendus_manquants();
    }
    $c = db()->prepare('SELECT COUNT(*) AS n, COALESCE(SUM(critique), 0) AS c FROM notification WHERE id_utilisateur = ? AND lue = 0');
    $c->execute([$moi]);
    $cpt = $c->fetch();
    $sortie = ['ok' => true, 'non_lues' => (int)$cpt['n'], 'critiques' => (int)$cpt['c']];
    if (empty($_GET['compte'])) {
        $st = db()->prepare('SELECT id_notification AS id, date_envoi, canal, contenu, lue, critique, statut_envoi, id_intervention FROM notification
                             WHERE id_utilisateur = ? ORDER BY lue ASC, critique DESC, date_envoi DESC, id_notification DESC LIMIT 100');
        $st->execute([$moi]);
        $items = $st->fetchAll();
        foreach ($items as &$x) { $x['id'] = (int)$x['id']; $x['lue'] = (bool)$x['lue']; $x['critique'] = (bool)$x['critique']; $x['id_intervention'] = $x['id_intervention'] === null ? null : (int)$x['id_intervention']; }
        unset($x);
        $p = db()->prepare('SELECT preference_communication FROM utilisateur WHERE id_utilisateur = ?'); $p->execute([$moi]);
        $sortie += ['items' => $items, 'preference' => $p->fetchColumn() ?: 'application'];
    }
    json_out(200, $sortie);
}

if ($methode === 'PUT') {
    $d = corps_json();
    if (isset($d['preference'])) {
        if (!in_array($d['preference'], ['application', 'courriel', 'sms'], true)) json_out(422, ['ok' => false, 'message' => 'Choix inconnu.']);
        db()->prepare('UPDATE utilisateur SET preference_communication = ? WHERE id_utilisateur = ?')->execute([$d['preference'], $moi]);
        json_out(200, ['ok' => true]);
    }
    if (!empty($d['toutes_lues'])) {
        db()->prepare('UPDATE notification SET lue = 1 WHERE id_utilisateur = ? AND lue = 0')->execute([$moi]);
        json_out(200, ['ok' => true]);
    }
    $id = (int)($_GET['id'] ?? 0);
    if ($id > 0 && array_key_exists('lue', $d)) {
        db()->prepare('UPDATE notification SET lue = ? WHERE id_notification = ? AND id_utilisateur = ?')->execute([$d['lue'] ? 1 : 0, $id, $moi]);   // seulement SES notifications
        json_out(200, ['ok' => true]);
    }
    json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);
}
header('Allow: GET, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
