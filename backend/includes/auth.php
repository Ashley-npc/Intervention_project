<?php
// Session et accès à l'utilisateur connecté. Réutilisé par toutes les pages de api/.
require_once __DIR__ . '/http.php';

date_default_timezone_set('Indian/Antananarivo');   // dates (création, « à venir ») à l'heure locale

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'path' => '/']);
    session_start();
}

function utilisateur_connecte(): ?array { return $_SESSION['user'] ?? null; }

// À mettre en tête de toute page d'API réservée aux personnes connectées.
// $roles_autorises = [] : tout utilisateur connecté ; sinon liste des rôles permis.
function exiger_connexion(array $roles_autorises = [], bool $meme_si_mdp_a_changer = false): array {
    $u = utilisateur_connecte();
    if ($u === null) json_out(401, ['ok' => false, 'message' => 'Non connecté.']);
    // Mot de passe temporaire : tant qu'il n'est pas changé, seules me.php, logout.php et mot-de-passe.php répondent.
    if (!empty($u['doit_changer']) && !$meme_si_mdp_a_changer) {
        json_out(403, ['ok' => false, 'code' => 'changer_mdp', 'message' => 'Vous devez d\'abord changer votre mot de passe.']);
    }
    if ($roles_autorises && !in_array($u['role'], $roles_autorises, true)) {
        json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
    }
    return $u;
}
