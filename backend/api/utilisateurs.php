<?php
// Gestion des comptes (administrateur uniquement). Pas d'inscription publique : c'est l'administrateur qui crée les comptes.
//   GET  utilisateurs.php               liste des comptes (+ rôles possibles + intervenants sans compte)
//   POST utilisateurs.php               création {identifiant, role, id_intervenant?} -> mot de passe temporaire (affiché UNE fois)
//   PUT  utilisateurs.php?id=4          {"actif": false} désactive/réactive  |  {"reinitialiser": true} nouveau mot de passe temporaire
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/mots-de-passe.php';

$moi = exiger_connexion(['administrateur']);
$methode = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($methode === 'GET') {
    $avert = [];
    // Requete complete (fiches liees) ; si la base n'a pas encore toutes les tables/colonnes, on retombe sur la liste simple.
    try {
        $comptes = db()->query(
            'SELECT u.id_utilisateur AS id, u.identifiant, u.nom AS u_nom, u.prenom AS u_prenom, u.actif, u.derniere_connexion, u.doit_changer_mot_de_passe, r.libelle AS role,
                    v.prenom AS i_prenom, v.nom AS i_nom, pa.prenom AS a_prenom, pa.nom AS a_nom, bb.prenom AS b_prenom, bb.nom AS b_nom
             FROM utilisateur u JOIN role r ON r.id_role = u.id_role
             LEFT JOIN intervenant v ON v.id_utilisateur = u.id_utilisateur
             LEFT JOIN proche_aidant pa ON pa.id_utilisateur = u.id_utilisateur
             LEFT JOIN beneficiaire bb ON bb.id_utilisateur = u.id_utilisateur
             ORDER BY u.identifiant'
        )->fetchAll();
    } catch (PDOException $e) {
        error_log('[API] utilisateurs : requete complete impossible : ' . $e->getMessage());
        $avert[] = 'Colonnes ou tables manquantes dans la base (voir ajout-colonnes*.sql et ajout-nom-utilisateur.sql). Les fiches liees ne sont pas affichees. Detail : ' . $e->getMessage();
        $comptes = db()->query(
            'SELECT u.id_utilisateur AS id, u.identifiant, u.actif, u.derniere_connexion, u.doit_changer_mot_de_passe, r.libelle AS role
             FROM utilisateur u JOIN role r ON r.id_role = u.id_role ORDER BY u.identifiant'
        )->fetchAll();
    }
    foreach ($comptes as &$c) {
        $c['id'] = (int)$c['id']; $c['actif'] = (bool)$c['actif']; $c['inactif'] = !$c['actif'];
        $c['mdp_temporaire'] = (bool)$c['doit_changer_mot_de_passe'];
        $c['nom_complet'] = trim(($c['u_prenom'] ?? '') . ' ' . ($c['u_nom'] ?? ''));   // comptes sans fiche
        $c['intervenant'] = !empty($c['i_nom']) ? $c['i_prenom'] . ' ' . $c['i_nom']
                          : (!empty($c['a_nom']) ? $c['a_prenom'] . ' ' . $c['a_nom'] : (!empty($c['b_nom']) ? $c['b_prenom'] . ' ' . $c['b_nom'] : null));   // fiche liee, quel que soit le role
        unset($c['u_nom'], $c['u_prenom'], $c['doit_changer_mot_de_passe'], $c['i_prenom'], $c['i_nom'], $c['a_prenom'], $c['a_nom'], $c['b_prenom'], $c['b_nom']);
    }
    unset($c);
    $roles = array_column(db()->query('SELECT libelle FROM role ORDER BY id_role')->fetchAll(), 'libelle');
    // Listes de fiches sans compte : chacune est facultative, une table manquante ne doit pas bloquer la page.
    $libres = [];
    foreach (['intervenants_libres' => 'SELECT id_intervenant AS id, nom, prenom FROM intervenant WHERE id_utilisateur IS NULL AND actif = 1 ORDER BY nom, prenom',
              'aidants_libres' => 'SELECT id_aidant AS id, nom, prenom FROM proche_aidant WHERE id_utilisateur IS NULL AND actif = 1 ORDER BY nom, prenom',
              'beneficiaires_libres' => 'SELECT id_beneficiaire AS id, nom, prenom FROM beneficiaire WHERE id_utilisateur IS NULL AND archive = 0 ORDER BY nom, prenom'] as $cle => $sql) {
        try { $libres[$cle] = db()->query($sql)->fetchAll(); }
        catch (PDOException $e) {
            error_log('[API] utilisateurs : ' . $cle . ' : ' . $e->getMessage());
            $libres[$cle] = [];
            $avert[] = 'Liste « ' . $cle . ' » indisponible : ' . $e->getMessage();
        }
    }
    json_out(200, ['ok' => true, 'items' => $comptes, 'roles' => $roles, 'avertissements' => $avert] + $libres);
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
    // Certains rôles doivent être liés à une fiche : intervenant -> intervenant, proche_aidant -> proche_aidant, beneficiaire -> beneficiaire.
    $LIENS = ['intervenant' => ['id_intervenant', 'intervenant', 'id_intervenant', 'actif = 1', 'Cet intervenant', 'cet intervenant'],
              'proche_aidant' => ['id_aidant', 'proche_aidant', 'id_aidant', 'actif = 1', 'Ce proche aidant', 'ce proche aidant'],
              'beneficiaire' => ['id_beneficiaire', 'beneficiaire', 'id_beneficiaire', 'archive = 0', 'Ce bénéficiaire', 'ce bénéficiaire']];
    $lien = $LIENS[$role] ?? null;      // [champ envoyé, table, colonne id, condition active, libellés…]
    $id_lie = $lien ? (int)($d[$lien[0]] ?? 0) : 0;
    foreach ($LIENS as $r => $l) if ($r !== $role && (int)($d[$l[0]] ?? 0) > 0) $erreurs[$l[0]] = "Ce champ ne concerne pas le rôle « $role ».";
    if ($lien) {
        if ($id_lie <= 0) $erreurs[$lien[0]] = "Choisissez la fiche de cette personne.";
        else {
            $st = db()->prepare("SELECT id_utilisateur FROM {$lien[1]} WHERE {$lien[2]} = ? AND {$lien[3]}");
            $st->execute([$id_lie]);
            $ligne = $st->fetch();
            if (!$ligne) $erreurs[$lien[0]] = 'Fiche introuvable.';
            elseif ($ligne['id_utilisateur'] !== null) $erreurs[$lien[0]] = $lien[4] . ' a déjà un compte.';
        }
    }
    // Les comptes sans fiche portent eux-memes leur nom et prenom.
    $nom = trim((string)($d['nom'] ?? '')); $prenom = trim((string)($d['prenom'] ?? ''));
    if (!$lien) {
        if ($nom === '' || mb_strlen($nom) > 60) $erreurs['nom'] = 'Nom obligatoire (60 caracteres maximum).';
        if ($prenom === '' || mb_strlen($prenom) > 60) $erreurs['prenom'] = 'Prenom obligatoire (60 caracteres maximum).';
    } else { $nom = $prenom = ''; }
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);

    $mdp = mot_de_passe_temporaire();
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO utilisateur (identifiant, nom, prenom, mot_de_passe, actif, doit_changer_mot_de_passe, id_role) VALUES (?, ?, ?, ?, 1, 1, ?)')
            ->execute([$identifiant, $nom === '' ? null : $nom, $prenom === '' ? null : $prenom, password_hash($mdp, PASSWORD_DEFAULT), $id_role]);
        $nouvel_id = (int)$pdo->lastInsertId();
        if ($lien) $pdo->prepare("UPDATE {$lien[1]} SET id_utilisateur = ? WHERE {$lien[2]} = ?")->execute([$nouvel_id, $id_lie]);
        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        if (est_doublon($e)) json_out(409, ['ok' => false, 'message' => 'Cet identifiant existe déjà.', 'erreurs' => ['identifiant' => 'Cet identifiant existe déjà.']]);
        throw $e;
    }
    journaliser('creation', 'utilisateur', $identifiant . ' (' . $role . ')');
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
        journaliser('reinitialisation_mdp', 'utilisateur', $cible);
        json_out(200, ['ok' => true, 'identifiant' => $cible, 'mot_de_passe_temporaire' => $mdp]);
    }
    if (array_key_exists('actif', $d)) {
        $actif = in_array($d['actif'], [true, 1, '1'], true) ? 1 : 0;
        if ($id === (int)$moi['id'] && !$actif) json_out(409, ['ok' => false, 'message' => 'Vous ne pouvez pas désactiver votre propre compte.']);
        db()->prepare('UPDATE utilisateur SET actif = ? WHERE id_utilisateur = ?')->execute([$actif, $id]);
        journaliser($actif ? 'activation' : 'desactivation', 'utilisateur', $cible);
        json_out(200, ['ok' => true, 'id' => $id]);
    }
    json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);
}

header('Allow: GET, POST, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
