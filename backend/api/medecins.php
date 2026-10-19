<?php
// Fiches des medecins prescripteurs (coordinateur). Le medecin est un contact EXTERNE : il n'a pas de compte.
// Il est relie aux interventions qu'il prescrit (intervention.id_medecin).
//   GET  medecins.php                 liste (+ nombre d'interventions prescrites)
//   POST medecins.php                 creation {nom, prenom?, specialite?, telephone?, courriel?}
//   PUT  medecins.php?id=2            modification des champs
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/journal.php';

exiger_connexion(['coordinateur']);
$REGLES = [
    'nom'        => ['libelle' => 'Le nom',        'max' => 100, 'requis' => true],
    'prenom'     => ['libelle' => 'Le prénom',     'max' => 100],
    'specialite' => ['libelle' => 'La spécialité', 'max' => 100],
    'telephone'  => ['libelle' => 'Le téléphone',  'type' => 'telephone'],
    'courriel'   => ['libelle' => 'Le courriel',   'type' => 'courriel', 'max' => 150],
];
$methode = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($methode === 'GET') {
    $l = db()->query('SELECT m.id_medecin AS id, m.nom, m.prenom, m.specialite, m.telephone, m.courriel,
            (SELECT COUNT(*) FROM intervention i WHERE i.id_medecin = m.id_medecin) AS nb_interventions
        FROM medecin_prescripteur m ORDER BY m.nom, m.prenom')->fetchAll();
    foreach ($l as &$m) { $m['id'] = (int)$m['id']; $m['nb_interventions'] = (int)$m['nb_interventions']; }
    json_out(200, ['ok' => true, 'items' => $l]);
}

if ($methode === 'POST') {
    [$v, $erreurs] = valider(corps_json(), $REGLES, true);
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    $cols = array_keys($v);
    db()->prepare('INSERT INTO medecin_prescripteur (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')')->execute(array_values($v));
    $nouveau = (int)db()->lastInsertId();
    journaliser('creation', 'medecin', 'médecin ' . $nouveau . ' : ' . $v['nom']);
    json_out(201, ['ok' => true, 'id' => $nouveau]);
}

if ($methode === 'PUT') {
    if ($id <= 0) json_out(400, ['ok' => false, 'message' => 'Identifiant manquant.']);
    $ex = db()->prepare('SELECT COUNT(*) FROM medecin_prescripteur WHERE id_medecin = ?'); $ex->execute([$id]);
    if (!(int)$ex->fetchColumn()) json_out(404, ['ok' => false, 'message' => 'Médecin introuvable.']);
    $d = corps_json();
    [$v, $erreurs] = valider($d, $REGLES, false);
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    if (!$v) json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);
    $sets = implode(', ', array_map(function ($c) { return "$c = ?"; }, array_keys($v)));
    db()->prepare("UPDATE medecin_prescripteur SET $sets WHERE id_medecin = ?")->execute(array_merge(array_values($v), [$id]));
    journaliser('modification', 'medecin', 'médecin ' . $id);
    json_out(200, ['ok' => true, 'id' => $id]);
}
header('Allow: GET, POST, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
