<?php
// Session et petites fonctions d'aide, à inclure en haut des pages PHP.
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

// Échappe un texte avant de l'afficher (protège contre l'injection de code dans la page).
function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

// Jeton anti-CSRF : prouve que le formulaire vient bien de notre page.
function csrf_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}
function csrf_ok($t): bool {
    return !empty($_SESSION['csrf']) && is_string($t) && hash_equals($_SESSION['csrf'], $t);
}

// Rôle (libellé dans la table role) -> page d'accueil correspondante.
function page_du_role(string $role): ?string {
    $pages = [
        'administrateur'      => 'admin.html',
        'coordinateur'        => 'coordinateur.html',
        'intervenant'         => 'intervenant.html',
        'responsable_qualite' => 'qualite.html',
        'facturation'         => 'facturation.html',
        'direction'           => 'direction.html',
        'maintenance'         => 'maintenance.html',
        'proche_aidant'       => 'proche-aidant.html',
        'beneficiaire'        => 'beneficiaire.html',
    ];
    return $pages[$role] ?? null;
}
