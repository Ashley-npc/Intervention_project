<?php
// Referentiels : types d'intervention, motifs d'absence (intervenants / beneficiaires), categories de documents.
//   GET  referentiels.php?categorie=type_intervention   valeurs actives d'une categorie (tout compte connecte : sert aux formulaires)
//   GET  referentiels.php?libelles=1                    toutes les valeurs et leur libelle (sert a l'affichage)
//   GET  referentiels.php                               tout, par categorie, avec l'etat (administrateur)
//   POST referentiels.php   {categorie, libelle}        ajouter une valeur (administrateur)
//   PUT  referentiels.php?id=5   {libelle?, actif?}     renommer (valeurs ajoutees seulement) / activer / desactiver (administrateur)
// Jamais de suppression : une valeur desactivee n'est plus proposee, mais l'historique reste lisible.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/referentiels.php';

$user = exiger_connexion([], true);
$admin = $user['role'] === 'administrateur';
$methode = $_SERVER['REQUEST_METHOD'];

if ($methode === 'GET') {
    try {
        if (isset($_GET['libelles'])) {
            json_out(200, ['ok' => true, 'items' => db()->query('SELECT categorie, valeur, libelle, actif FROM referentiel ORDER BY id_referentiel')->fetchAll()]);
        }
        if (isset($_GET['categorie'])) {
            if (!isset(CATEGORIES_REFERENTIEL[$_GET['categorie']])) json_out(404, ['ok' => false, 'message' => 'Catégorie inconnue.']);
            $st = db()->prepare('SELECT valeur, libelle FROM referentiel WHERE categorie = ? AND actif = 1 ORDER BY id_referentiel');
            $st->execute([$_GET['categorie']]);
            json_out(200, ['ok' => true, 'items' => $st->fetchAll()]);
        }
        if (!$admin) json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
        $groupes = [];
        foreach (CATEGORIES_REFERENTIEL as $cle => $titre) $groupes[$cle] = ['categorie' => $cle, 'titre' => $titre, 'items' => []];
        foreach (db()->query('SELECT id_referentiel, categorie, valeur, libelle, actif, systeme FROM referentiel ORDER BY id_referentiel')->fetchAll() as $l) {
            if (isset($groupes[$l['categorie']])) $groupes[$l['categorie']]['items'][] = ['id' => (int)$l['id_referentiel'], 'valeur' => $l['valeur'], 'libelle' => $l['libelle'], 'actif' => (bool)$l['actif'], 'systeme' => (bool)$l['systeme']];
        }
        json_out(200, ['ok' => true, 'groupes' => array_values($groupes)]);
    } catch (PDOException $e) {
        json_out(200, ['ok' => true, 'items' => [], 'groupes' => [], 'table_absente' => true]);   // ajout-administration.sql pas encore execute
    }
}

if (!$admin) json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
$d = corps_json();

if ($methode === 'POST') {
    $cat = (string)($d['categorie'] ?? '');
    if (!isset(CATEGORIES_REFERENTIEL[$cat])) json_out(422, ['ok' => false, 'message' => 'Catégorie inconnue.']);
    $libelle = trim((string)($d['libelle'] ?? ''));
    $valeur = valeur_depuis_libelle($libelle);
    if ($libelle === '' || $valeur === '' || mb_strlen($libelle) > 100 || strlen($valeur) > 60) json_out(422, ['ok' => false, 'message' => 'Libellé obligatoire (100 caractères maximum).', 'erreurs' => ['libelle' => 'Libellé obligatoire (100 caractères maximum).']]);
    $st = db()->prepare('SELECT COUNT(*) FROM referentiel WHERE categorie = ? AND valeur = ?'); $st->execute([$cat, $valeur]);
    if ((int)$st->fetchColumn()) json_out(409, ['ok' => false, 'message' => 'Cette valeur existe déjà.', 'erreurs' => ['libelle' => 'Cette valeur existe déjà.']]);
    db()->prepare('INSERT INTO referentiel (categorie, valeur, libelle, actif, systeme) VALUES (?, ?, ?, 1, 0)')->execute([$cat, $valeur, $libelle]);
    journaliser('creation', 'referentiel', CATEGORIES_REFERENTIEL[$cat] . ' : ' . $libelle);
    json_out(201, ['ok' => true, 'id' => (int)db()->lastInsertId()]);
}

if ($methode === 'PUT') {
    $id = (int)($_GET['id'] ?? 0);
    $st = db()->prepare('SELECT * FROM referentiel WHERE id_referentiel = ?'); $st->execute([$id]);
    $l = $st->fetch();
    if (!$l) json_out(404, ['ok' => false, 'message' => 'Valeur introuvable.']);
    $sets = []; $params = [];
    if (array_key_exists('libelle', $d)) {
        if ((int)$l['systeme']) json_out(409, ['ok' => false, 'message' => "Le libellé d'une valeur d'origine ne se modifie pas."]);
        $libelle = trim((string)$d['libelle']);
        if ($libelle === '' || mb_strlen($libelle) > 100) json_out(422, ['ok' => false, 'message' => 'Libellé obligatoire (100 caractères maximum).']);
        $sets[] = 'libelle = ?'; $params[] = $libelle;
    }
    if (array_key_exists('actif', $d)) {
        $actif = !empty($d['actif']) ? 1 : 0;
        if (!$actif) {   // il doit toujours rester au moins une valeur active dans une categorie obligatoire
            $st = db()->prepare('SELECT COUNT(*) FROM referentiel WHERE categorie = ? AND actif = 1 AND id_referentiel <> ?'); $st->execute([$l['categorie'], $id]);
            if (!(int)$st->fetchColumn()) json_out(409, ['ok' => false, 'message' => 'Il doit rester au moins une valeur active dans cette liste.']);
        }
        $sets[] = 'actif = ?'; $params[] = $actif;
    }
    if (!$sets) json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);
    db()->prepare('UPDATE referentiel SET ' . implode(', ', $sets) . ' WHERE id_referentiel = ?')->execute(array_merge($params, [$id]));
    journaliser('modification', 'referentiel', (CATEGORIES_REFERENTIEL[$l['categorie']] ?? $l['categorie']) . ' : ' . $l['libelle'] . (array_key_exists('actif', $d) ? (!empty($d['actif']) ? ' (réactivé)' : ' (désactivé)') : ''));
    json_out(200, ['ok' => true, 'id' => $id]);
}
header('Allow: GET, POST, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
