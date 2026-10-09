<?php
// GET /api/me.php : renvoie l'utilisateur connecté (utilisé par le front pour protéger ses pages).
// Réponses : 200 {ok:true, user:{identifiant, role}}   401 {ok:false}
require __DIR__ . '/../includes/auth.php';

exiger_methode('GET');
$u = exiger_connexion();
json_out(200, ['ok' => true, 'user' => ['identifiant' => $u['identifiant'], 'role' => $u['role']]]);
