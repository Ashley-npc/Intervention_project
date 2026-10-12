<?php
// Mot de passe temporaire : aléatoire, sans caractères ambigus (0/O, 1/l/I), à communiquer de vive voix ou par message.
function mot_de_passe_temporaire(int $longueur = 10): string {
    $alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $mdp = '';
    for ($i = 0; $i < $longueur; $i++) $mdp .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    return $mdp;
}
// Règle des mots de passe choisis par les utilisateurs : renvoie un message d'erreur ou null.
function verifier_force_mdp(string $mdp): ?string {
    if (mb_strlen($mdp) < 8)              return 'Le mot de passe doit contenir au moins 8 caractères.';
    if (!preg_match('/[A-Za-z]/', $mdp))  return 'Le mot de passe doit contenir au moins une lettre.';
    if (!preg_match('/\d/', $mdp))        return 'Le mot de passe doit contenir au moins un chiffre.';
    return null;
}
