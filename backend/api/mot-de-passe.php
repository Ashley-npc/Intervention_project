<?php
// POST mot-de-passe.php   corps : {"ancien": "...", "nouveau": "..."}
// Utilisé par toute personne connectée, et obligatoire après un mot de passe temporaire.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/mots-de-passe.php';

exiger_methode('POST');
$u = exiger_connexion([], true);
$d = corps_json();
$ancien = (string)($d['ancien'] ?? '');
$nouveau = (string)($d['nouveau'] ?? '');

$st = db()->prepare('SELECT mot_de_passe FROM utilisateur WHERE id_utilisateur = ?');
$st->execute([$u['id']]);
$hash = $st->fetchColumn();
if ($hash === false || !password_verify($ancien, $hash)) {
    json_out(422, ['ok' => false, 'message' => "L'ancien mot de passe est incorrect.", 'erreurs' => ['ancien' => 'Mot de passe incorrect.']]);
}
if ($erreur = verifier_force_mdp($nouveau)) json_out(422, ['ok' => false, 'message' => $erreur, 'erreurs' => ['nouveau' => $erreur]]);
if ($nouveau === $ancien) json_out(422, ['ok' => false, 'message' => 'Le nouveau mot de passe doit être différent.', 'erreurs' => ['nouveau' => 'Choisissez un mot de passe différent.']]);

db()->prepare('UPDATE utilisateur SET mot_de_passe = ?, doit_changer_mot_de_passe = 0 WHERE id_utilisateur = ?')
    ->execute([password_hash($nouveau, PASSWORD_DEFAULT), $u['id']]);
$_SESSION['user']['doit_changer'] = false;
json_out(200, ['ok' => true]);
