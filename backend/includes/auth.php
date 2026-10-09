<?php
// Session et accès à l'utilisateur connecté. Réutilisé par toutes les pages de api/.
require_once __DIR__ . '/http.php';

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'path' => '/']);
    session_start();
}

function utilisateur_connecte(): ?array { return $_SESSION['user'] ?? null; }

// À mettre en tête de toute page d'API réservée aux personnes connectées.
// $roles_autorises = [] : tout utilisateur connecté ; sinon liste des rôles permis.
function exiger_connexion(array $roles_autorises = []): array {
    $u = utilisateur_connecte();
    if ($u === null) json_out(401, ['ok' => false, 'message' => 'Non connecté.']);
    if ($roles_autorises && !in_array($u['role'], $roles_autorises, true)) {
        json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
    }
    return $u;
}
