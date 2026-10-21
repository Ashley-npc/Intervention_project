<?php
// Parametres generaux de la structure : nom, coordonnees.
//   GET parametres.php   lecture (tout compte connecte : le nom s'affiche dans le menu)
//   PUT parametres.php   {nom_structure, adresse, telephone, courriel}   modification (administrateur uniquement)
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/validation.php';

$user = exiger_connexion([], true);
const CLES_PARAMETRES = ['nom_structure', 'adresse', 'telephone', 'courriel', 'duree_conservation_ans'];

function lire_parametres(): array {
    $p = array_fill_keys(CLES_PARAMETRES, null);
    try { foreach (db()->query('SELECT cle, valeur FROM parametre')->fetchAll() as $l) if (array_key_exists($l['cle'], $p)) $p[$l['cle']] = $l['valeur']; }
    catch (Throwable $e) {}   // table absente : valeurs vides
    if ($p['nom_structure'] === null || $p['nom_structure'] === '') $p['nom_structure'] = 'Suivi à domicile';
    if ($p['duree_conservation_ans'] === null || $p['duree_conservation_ans'] === '') $p['duree_conservation_ans'] = '5';
    return $p;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') json_out(200, ['ok' => true, 'parametres' => lire_parametres(), 'modifiable' => $user['role'] === 'administrateur']);
exiger_methode('PUT');
if ($user['role'] !== 'administrateur') json_out(403, ['ok' => false, 'message' => 'Seul l\'administrateur modifie les paramètres.']);
[$v, $erreurs] = valider(corps_json(), [
    'nom_structure' => ['libelle' => 'Le nom de la structure', 'max' => 80, 'requis' => true],
    'adresse'       => ['libelle' => "L'adresse", 'max' => 255],
    'telephone'     => ['libelle' => 'Le téléphone', 'type' => 'telephone'],
    'courriel'      => ['libelle' => 'Le courriel', 'type' => 'courriel', 'max' => 150],
    'duree_conservation_ans' => ['libelle' => 'La durée de conservation', 'type' => 'choix', 'options' => ['1', '2', '3', '5', '10', '15', '20', '30']],
], false);
if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
if (!$v) json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);
$avant = lire_parametres();
foreach ($v as $cle => $valeur) {
    $st = db()->prepare('UPDATE parametre SET valeur = ? WHERE cle = ?'); $st->execute([$valeur, $cle]);
    if (!$st->rowCount()) {   // ligne absente, ou valeur identique : on cree seulement si elle n'existe pas
        $ex = db()->prepare('SELECT COUNT(*) FROM parametre WHERE cle = ?'); $ex->execute([$cle]);
        if (!(int)$ex->fetchColumn()) db()->prepare('INSERT INTO parametre (cle, valeur) VALUES (?, ?)')->execute([$cle, $valeur]);
    }
}
$modifies = array_keys(array_filter($v, function ($val, $cle) use ($avant) { return (string)$val !== (string)$avant[$cle]; }, ARRAY_FILTER_USE_BOTH));
if ($modifies) journaliser('modification', 'parametres', implode(', ', $modifies));
json_out(200, ['ok' => true, 'parametres' => lire_parametres()]);
