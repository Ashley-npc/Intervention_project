<?php
// Liens bénéficiaire <-> proche aidant et ce que l'aidant a le droit de voir (coordinateur, administrateur).
//   GET  liens-aidants.php?id_beneficiaire=3    liens d'un bénéficiaire (+ aidants disponibles)
//   POST liens-aidants.php {id_beneficiaire, id_aidant, lien_parente?, planning: bool, etat: bool}   crée ou met à jour le lien
//   POST liens-aidants.php {id_beneficiaire, id_aidant, retirer: true}                               supprime le lien (pas les personnes)
// Autorisations : « planning » = voit les visites prévues et passées ; « etat » = voit aussi l'état du bénéficiaire (compte rendu validé).
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/validation.php';

exiger_connexion(['coordinateur', 'administrateur']);
$methode = $_SERVER['REQUEST_METHOD'];

if ($methode === 'GET') {
    $b = (int)($_GET['id_beneficiaire'] ?? 0);
    $st = db()->prepare('SELECT a.id_aidant AS id, a.nom, a.prenom, a.actif, l.lien_parente, l.autorisations, l.date_autorisation
                         FROM lien_beneficiaire_aidant l JOIN proche_aidant a ON a.id_aidant = l.id_aidant WHERE l.id_beneficiaire = ? ORDER BY a.nom');
    $st->execute([$b]);
    $liens = $st->fetchAll();
    foreach ($liens as &$l) { $auto = explode(',', (string)$l['autorisations']); $l['planning'] = in_array('planning', $auto, true); $l['etat'] = in_array('etat', $auto, true); }
    unset($l);
    $st = db()->prepare('SELECT id_aidant AS id, nom, prenom FROM proche_aidant WHERE actif = 1 AND id_aidant NOT IN (SELECT id_aidant FROM lien_beneficiaire_aidant WHERE id_beneficiaire = ?) ORDER BY nom');
    $st->execute([$b]);
    json_out(200, ['ok' => true, 'items' => $liens, 'aidants_disponibles' => $st->fetchAll()]);
}
exiger_methode('POST');
$d = corps_json();
$b = (int)($d['id_beneficiaire'] ?? 0); $a = (int)($d['id_aidant'] ?? 0);
$st = db()->prepare('SELECT 1 FROM beneficiaire WHERE id_beneficiaire = ?'); $st->execute([$b]);
$st2 = db()->prepare('SELECT 1 FROM proche_aidant WHERE id_aidant = ?'); $st2->execute([$a]);
if (!$st->fetchColumn() || !$st2->fetchColumn()) json_out(404, ['ok' => false, 'message' => 'Bénéficiaire ou proche aidant introuvable.']);

if (!empty($d['retirer'])) {
    db()->prepare('DELETE FROM lien_beneficiaire_aidant WHERE id_beneficiaire = ? AND id_aidant = ?')->execute([$b, $a]);
    json_out(200, ['ok' => true]);
}
[$v, $erreurs] = valider($d, ['lien_parente' => ['libelle' => 'Le lien', 'max' => 50]], true);
if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
$auto = [];
if (!empty($d['planning'])) $auto[] = 'planning';
if (!empty($d['etat'])) $auto[] = 'etat';
$st = db()->prepare('SELECT 1 FROM lien_beneficiaire_aidant WHERE id_beneficiaire = ? AND id_aidant = ?'); $st->execute([$b, $a]);
if ($st->fetchColumn()) {
    db()->prepare('UPDATE lien_beneficiaire_aidant SET lien_parente = ?, autorisations = ? WHERE id_beneficiaire = ? AND id_aidant = ?')->execute([$v['lien_parente'], implode(',', $auto), $b, $a]);
} else {
    db()->prepare('INSERT INTO lien_beneficiaire_aidant (id_beneficiaire, id_aidant, lien_parente, autorisations, date_autorisation) VALUES (?, ?, ?, ?, ?)')
        ->execute([$b, $a, $v['lien_parente'], implode(',', $auto), date('Y-m-d')]);
}
json_out(200, ['ok' => true]);
