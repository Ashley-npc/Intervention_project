<?php
// Gestion des comptes (administrateur uniquement). Pas d'inscription publique : c'est l'administrateur qui crée les comptes.
//   GET  utilisateurs.php               liste des comptes (+ rôles possibles + intervenants sans compte)
//   POST utilisateurs.php               création {identifiant, role, id_intervenant?} -> mot de passe temporaire (affiché UNE fois)
//   PUT  utilisateurs.php?id=4          {"actif": false} désactive/réactive  |  {"reinitialiser": true} nouveau mot de passe temporaire
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/mots-de-passe.php';

$moi = exiger_connexion(['administrateur']);
$methode = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($methode === 'GET') {
    $comptes = db()->query(
        'SELECT u.id_utilisateur AS id, u.identifiant, u.actif, u.derniere_connexion, u.doit_changer_mot_de_passe, r.libelle AS role,
                v.prenom AS i_prenom, v.nom AS i_nom
         FROM utilisateur u JOIN role r ON r.id_role = u.id_role
         LEFT JOIN intervenant v ON v.id_utilisateur = u.id_utilisateur
         ORDER BY u.identifiant'
    )->fetchAll();
    foreach ($comptes as &$c) {
        $c['id'] = (int)$c['id']; $c['actif'] = (bool)$c['actif']; $c['inactif'] = !$c['actif'];
        $c['mdp_temporaire'] = (bool)$c['doit_changer_mot_de_passe'];
        $c['intervenant'] = $c['i_nom'] ? $c['i_prenom'] . ' ' . $c['i_nom'] : null;
        unset($c['doit_changer_mot_de_passe'], $c['i_prenom'], $c['i_nom']);
    }
    unset($c);
    $roles = array_column(db()->query('SELECT libelle FROM role ORDER BY id_role')->fetchAll(), 'libelle');
    $libres = db()->query('SELECT id_intervenant AS id, nom, prenom FROM intervenant WHERE id_utilisateur IS NULL AND actif = 1 ORDER BY nom, prenom')->fetchAll();
    json_out(200, ['ok' => true, 'items' => $comptes, 'roles' => $roles, 'intervenants_libres' => $libres]);
}

if ($methode === 'POST') {
    $d = corps_json();
    $erreurs = [];
    $identifiant = strtolower(trim((string)($d['identifiant'] ?? '')));
    if (!preg_match('/^[a-z0-9._-]{3,30}$/', $identifiant)) $erreurs['identifiant'] = "3 à 30 caractères : lettres minuscules, chiffres, point, tiret.";
    $role = (string)($d['role'] ?? '');
    $st = db()->prepare('SELECT id_role FROM role WHERE libelle = ?');
    $st->execute([$role]);
    $id_role = $st->fetchColumn();
    if ($id_role === false) $erreurs['role'] = 'Rôle inconnu.';
    $id_interv = (int)($d['id_intervenant'] ?? 0);
    if ($id_interv > 0) {
        if ($role !== 'intervenant') $erreurs['id_intervenant'] = "Seul un compte « intervenant » peut être lié à une fiche intervenant.";
        else {
            $st = db()->prepare('SELECT id_utilisateur FROM intervenant WHERE id_intervenant = ? AND actif = 1');
            $st->execute([$id_interv]);
            $ligne = $st->fetch();
            if (!$ligne) $erreurs['id_intervenant'] = 'Intervenant introuvable.';
            elseif ($ligne['id_utilisateur'] !== null) $erreurs['id_intervenant'] = 'Cet intervenant a déjà un compte.';
        }
    } elseif ($role === 'intervenant') $erreurs['id_intervenant'] = 'Choisissez la fiche intervenant de cette personne.';
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);

    $mdp = mot_de_passe_temporaire();
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO utilisateur (identifiant, mot_de_passe, actif, doit_changer_mot_de_passe, id_role) VALUES (?, ?, 1, 1, ?)')
            ->execute([$identifiant, password_hash($mdp, PASSWORD_DEFAULT), $id_role]);
        $nouvel_id = (int)$pdo->lastInsertId();
        if ($id_interv > 0) $pdo->prepare('UPDATE intervenant SET id_utilisateur = ? WHERE id_intervenant = ?')->execute([$nouvel_id, $id_interv]);
        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        if (est_doublon($e)) json_out(409, ['ok' => false, 'message' => 'Cet identifiant existe déjà.', 'erreurs' => ['identifiant' => 'Cet identifiant existe déjà.']]);
        throw $e;
    }
    json_out(201, ['ok' => true, 'id' => $nouvel_id, 'identifiant' => $identifiant, 'mot_de_passe_temporaire' => $mdp]);
}

if ($methode === 'PUT') {
    if ($id <= 0) json_out(400, ['ok' => false, 'message' => 'Identifiant manquant.']);
    $st = db()->prepare('SELECT identifiant FROM utilisateur WHERE id_utilisateur = ?');
    $st->execute([$id]);
    $cible = $st->fetchColumn();
    if ($cible === false) json_out(404, ['ok' => false, 'message' => 'Compte introuvable.']);
    $d = corps_json();
    if (!empty($d['reinitialiser'])) {
        $mdp = mot_de_passe_temporaire();
        db()->prepare('UPDATE utilisateur SET mot_de_passe = ?, doit_changer_mot_de_passe = 1 WHERE id_utilisateur = ?')
            ->execute([password_hash($mdp, PASSWORD_DEFAULT), $id]);
        json_out(200, ['ok' => true, 'identifiant' => $cible, 'mot_de_passe_temporaire' => $mdp]);
    }
    if (array_key_exists('actif', $d)) {
        $actif = in_array($d['actif'], [true, 1, '1'], true) ? 1 : 0;
        if ($id === (int)$moi['id'] && !$actif) json_out(409, ['ok' => false, 'message' => 'Vous ne pouvez pas désactiver votre propre compte.']);
        db()->prepare('UPDATE utilisateur SET actif = ? WHERE id_utilisateur = ?')->execute([$actif, $id]);
        json_out(200, ['ok' => true, 'id' => $id]);
    }
    json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);
}

header('Allow: GET, POST, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
