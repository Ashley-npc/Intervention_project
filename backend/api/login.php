            //TSY MISAVASAVA CODE EO EHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH




<?php
// POST /api/login.php   corps : {"identifiant": "...", "mot_de_passe": "..."}
// Réponses : 200 {ok:true, role}   401 {ok:false, message}
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';

exiger_methode('POST');
$d = corps_json();
$identifiant = trim((string)($d['identifiant'] ?? ''));
$mdp         = (string)($d['mot_de_passe'] ?? '');

if ($identifiant === '' || $mdp === '') {
    json_out(400, ['ok' => false, 'message' => 'Identifiant et mot de passe requis.']);
}

// Requête préparée : l'identifiant saisi ne peut pas modifier la requête SQL.
$st = db()->prepare(
    'SELECT u.id_utilisateur, u.identifiant, u.mot_de_passe, u.actif, r.libelle AS role
     FROM utilisateur u
     JOIN role r ON r.id_role = u.id_role
     WHERE u.identifiant = ?'
);
$st->execute([$identifiant]);
$u = $st->fetch();

// Identifiant inconnu : on vérifie quand même un faux hachage, pour que le temps de réponse
// ne révèle pas si le compte existe.
$hash   = $u['mot_de_passe'] ?? '$2y$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
$mdp_ok = password_verify($mdp, $hash);

if (!$u || !$mdp_ok || (int)$u['actif'] !== 1) {
    // Même message pour : identifiant inconnu, mauvais mot de passe, compte désactivé.
    json_out(401, ['ok' => false, 'message' => 'Identifiant ou mot de passe incorrect.']);
}

session_regenerate_id(true);   // nouvelle session : empêche le vol de session
$_SESSION['user'] = [
    'id'          => (int)$u['id_utilisateur'],
    'identifiant' => $u['identifiant'],
    'role'        => $u['role'],
];
db()->prepare('UPDATE utilisateur SET derniere_connexion = NOW() WHERE id_utilisateur = ?')
    ->execute([$u['id_utilisateur']]);

json_out(200, ['ok' => true, 'role' => $u['role']]);
