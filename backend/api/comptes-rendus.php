<?php
// API des comptes rendus (un seul par intervention).
//   GET  comptes-rendus.php?etat=a_valider|sans|tous    liste pour le coordinateur (à valider / interventions sans compte rendu)
//   POST comptes-rendus.php                              l'intervenant saisit le compte rendu de SON intervention
//   PUT  comptes-rendus.php?id_intervention=4            modification (tant que non validé) ; {"valider": true} = validation par le coordinateur
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/notifications.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/interventions.php';

$user = exiger_connexion(['coordinateur', 'intervenant']);
$est_intervenant = $user['role'] === 'intervenant';
$mon_id = null;
if ($est_intervenant) {
    $mon_id = intervenant_du_compte($user);
    if ($mon_id === null) json_out(403, ['ok' => false, 'message' => "Ce compte n'est lié à aucune fiche intervenant."]);
}

$REGLES = [
    'duree_reelle'      => ['libelle' => 'La durée réelle',        'type' => 'texte', 'max' => 4],
    'actes_realises'    => ['libelle' => 'Les actes réalisés',     'max' => 4000, 'requis' => true],
    'observations'      => ['libelle' => 'Les observations',       'max' => 4000],
    'etat_beneficiaire' => ['libelle' => "L'état du bénéficiaire", 'type' => 'choix', 'options' => ['bon', 'moyen', 'preoccupant']],
];

function intervention_simple(int $id): ?array {
    $st = db()->prepare('SELECT * FROM intervention WHERE id_intervention = ?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}
function verifier_duree(array &$v, array &$erreurs): void {
    if (!isset($v['duree_reelle']) || $v['duree_reelle'] === null) return;
    if (!preg_match('/^\d{1,4}$/', $v['duree_reelle']) || (int)$v['duree_reelle'] < 1 || (int)$v['duree_reelle'] > 1440) {
        $erreurs['duree_reelle'] = 'La durée réelle doit être un nombre de minutes (1 à 1440).';
    } else $v['duree_reelle'] = (int)$v['duree_reelle'];
}

$methode = $_SERVER['REQUEST_METHOD'];
function normaliser(array $d): array { if (isset($d['duree_reelle']) && is_int($d['duree_reelle'])) $d['duree_reelle'] = (string)$d['duree_reelle']; return $d; }

if ($methode === 'GET') {
    if ($est_intervenant) json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
    $etat = $_GET['etat'] ?? 'a_valider';
    if ($etat === 'sans') {
        // Interventions passées, non annulées, sans aucun compte rendu.
        $st = db()->prepare(SELECT_INTERVENTION . " WHERE c.id_compte_rendu IS NULL AND i.statut NOT IN ('annulee') AND " . SQL_TERMINEE . " ORDER BY i.date DESC, i.heure_debut DESC LIMIT 200");
        $st->execute(params_terminee());
    } else {
        $filtre = $etat === 'tous' ? '' : ' AND c.valide_par_coordinateur = 0';
        $st = db()->query(SELECT_INTERVENTION . ' WHERE c.id_compte_rendu IS NOT NULL' . $filtre . ' ORDER BY i.date DESC, i.heure_debut DESC LIMIT 200');
    }
    json_out(200, ['ok' => true, 'items' => array_map('intervention_vers_front', $st->fetchAll())]);
}

if ($methode === 'POST') {                                       // ----- saisie par l'intervenant
    if (!$est_intervenant) json_out(403, ['ok' => false, 'message' => "Seul l'intervenant saisit le compte rendu."]);
    $d = normaliser(corps_json());
    $id = (int)($d['id_intervention'] ?? 0);
    $i = $id > 0 ? intervention_simple($id) : null;
    if (!$i || (int)$i['id_intervenant'] !== $mon_id) json_out(404, ['ok' => false, 'message' => 'Intervention introuvable.']);
    if (est_annulee($i['statut'])) json_out(409, ['ok' => false, 'message' => 'Cette intervention est annulée.']);
    if ($i['date'] > date('Y-m-d')) json_out(409, ['ok' => false, 'message' => "Cette intervention n'a pas encore eu lieu."]);
    [$v, $erreurs] = valider($d, $REGLES, true);
    verifier_duree($v, $erreurs);
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    $v['date_saisie'] = date('Y-m-d');
    $v['valide_par_coordinateur'] = 0;
    $v['id_intervention'] = $id;
    $cols = array_keys($v);
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO compte_rendu (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')')->execute(array_values($v));
        $pdo->prepare("UPDATE intervention SET statut = 'realisee', date_modification = ? WHERE id_intervention = ?")->execute([date('Y-m-d'), $id]);
        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        if (est_doublon($e)) json_out(409, ['ok' => false, 'message' => 'Un compte rendu existe déjà pour cette intervention.']);
        throw $e;
    }
    notifier(utilisateurs_du_role(['coordinateur']), 'Compte rendu à valider : ' . resume_intervention($id), $id);
    json_out(201, ['ok' => true, 'id' => $id]);
}

if ($methode === 'PUT') {
    $id = (int)($_GET['id_intervention'] ?? 0);
    $i = $id > 0 ? intervention_simple($id) : null;
    if (!$i || ($est_intervenant && (int)$i['id_intervenant'] !== $mon_id)) json_out(404, ['ok' => false, 'message' => 'Intervention introuvable.']);
    $st = db()->prepare('SELECT id_compte_rendu, valide_par_coordinateur FROM compte_rendu WHERE id_intervention = ?');
    $st->execute([$id]);
    $cr = $st->fetch();
    if (!$cr) json_out(404, ['ok' => false, 'message' => "Cette intervention n'a pas de compte rendu."]);
    $d = normaliser(corps_json());

    if (!empty($d['valider'])) {                                 // ----- validation par le coordinateur
        if ($est_intervenant) json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
        if ((int)$cr['valide_par_coordinateur'] === 1) json_out(409, ['ok' => false, 'message' => 'Déjà validé.']);
        $pdo = db();
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE compte_rendu SET valide_par_coordinateur = 1 WHERE id_intervention = ?')->execute([$id]);
        $pdo->prepare("UPDATE intervention SET validee = 1, statut = 'realisee', date_modification = ? WHERE id_intervention = ?")->execute([date('Y-m-d'), $id]);
        $pdo->commit();
        journaliser('validation', 'compte_rendu', 'intervention ' . $id);
        notifier(intervenant_de($id), 'Compte rendu validé : ' . resume_intervention($id), $id);
        json_out(200, ['ok' => true, 'id' => $id]);
    }
    if ((int)$cr['valide_par_coordinateur'] === 1 || (int)$i['validee'] === 1) {
        json_out(409, ['ok' => false, 'message' => 'Ce compte rendu est validé : il ne peut plus être modifié.']);
    }
    [$v, $erreurs] = valider($d, $REGLES, false);
    verifier_duree($v, $erreurs);
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    if (!$v) json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);
    $sets = implode(', ', array_map(function ($c) { return "$c = ?"; }, array_keys($v)));
    db()->prepare("UPDATE compte_rendu SET $sets WHERE id_intervention = ?")->execute(array_merge(array_values($v), [$id]));
    json_out(200, ['ok' => true, 'id' => $id]);
}

header('Allow: GET, POST, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
