<?php
// Tarifs horaires par type d'intervention (facturation ; direction en lecture).
//   GET  tarifs.php   liste      POST tarifs.php  {type_intervention, montant_horaire, date_debut_validite}
// Un nouveau tarif clôture automatiquement l'ancien du même type (la veille de sa date de début).
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/facturation.php';

$user = exiger_connexion(['facturation', 'direction']);
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $l = db()->query('SELECT id_tarif AS id, type_intervention, montant_horaire, date_debut_validite, date_fin_validite FROM tarif ORDER BY type_intervention, date_debut_validite DESC')->fetchAll();
    foreach ($l as &$t) $t['montant_horaire'] = (float)$t['montant_horaire'];
    json_out(200, ['ok' => true, 'items' => $l, 'types' => TYPES_INTERVENTION]);
}
exiger_methode('POST');
if ($user['role'] === 'direction') json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
$d = corps_json();
[$v, $erreurs] = valider($d, [
    'type_intervention'   => ['libelle' => 'Le type', 'type' => 'choix', 'requis' => true, 'options' => TYPES_INTERVENTION],
    'date_debut_validite' => ['libelle' => 'La date de début', 'type' => 'date', 'requis' => true],
], true);
$montant = lire_montant($d['montant_horaire'] ?? '');
if ($montant === null) $erreurs['montant_horaire'] = 'Le montant horaire doit être un nombre positif.';
if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);

$pdo = db();
$st = $pdo->prepare('SELECT id_tarif, date_debut_validite FROM tarif WHERE type_intervention = ? AND date_fin_validite IS NULL');
$st->execute([$v['type_intervention']]);
$ouvert = $st->fetch();
if ($ouvert && $ouvert['date_debut_validite'] >= $v['date_debut_validite']) {
    json_out(422, ['ok' => false, 'message' => 'La date de début doit être après celle du tarif actuel (' . $ouvert['date_debut_validite'] . ').',
                   'erreurs' => ['date_debut_validite' => 'Doit être après le ' . $ouvert['date_debut_validite'] . '.']]);
}
$pdo->beginTransaction();
if ($ouvert) $pdo->prepare('UPDATE tarif SET date_fin_validite = ? WHERE id_tarif = ?')->execute([date('Y-m-d', strtotime($v['date_debut_validite'] . ' -1 day')), $ouvert['id_tarif']]);
$pdo->prepare('INSERT INTO tarif (type_intervention, montant_horaire, date_debut_validite, date_fin_validite) VALUES (?, ?, ?, NULL)')
    ->execute([$v['type_intervention'], $montant, $v['date_debut_validite']]);
$pdo->commit();
journaliser('creation', 'tarif', $v['type_intervention'] . ' : ' . $montant . ' des ' . $v['date_debut_validite']);
json_out(201, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
