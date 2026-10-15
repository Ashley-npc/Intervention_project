<?php
// Incidents survenus pendant une intervention.
//   GET  incidents.php?traite=0|1      liste (+ interventions recentes pour le formulaire de declaration)
//   POST incidents.php                 {id_intervention, gravite, description}   intervenant (les siennes), coordinateur, administrateur
//   PUT  incidents.php?id=3            {"traite": true|false}                    responsable qualite, coordinateur, administrateur
// Lecture : tous ces roles + direction (l'intervenant ne voit que les incidents de ses interventions).
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/interventions.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/notifications.php';

const GRAVITES = ['mineur', 'important', 'urgent'];
$user = exiger_connexion(['administrateur', 'coordinateur', 'responsable_qualite', 'direction', 'intervenant']);
$methode = $_SERVER['REQUEST_METHOD'];
$mon_id = $user['role'] === 'intervenant' ? intervenant_du_compte($user) : null;
if ($user['role'] === 'intervenant' && $mon_id === null) json_out(403, ['ok' => false, 'message' => "Votre compte n'est relié à aucune fiche intervenant."]);

if ($methode === 'GET') {
    $ou = []; $p = [];
    if ($mon_id !== null) { $ou[] = 'i.id_intervenant = ?'; $p[] = $mon_id; }
    if (isset($_GET['traite']) && in_array($_GET['traite'], ['0', '1'], true)) { $ou[] = 'n.traite = ?'; $p[] = (int)$_GET['traite']; }
    $st = db()->prepare("SELECT n.id_incident AS id, n.date_heure, n.description, n.gravite, n.traite, n.id_intervention, i.date AS date_intervention,
            b.prenom AS b_prenom, b.nom AS b_nom, v.prenom AS v_prenom, v.nom AS v_nom
        FROM incident n JOIN intervention i ON i.id_intervention = n.id_intervention
        JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire JOIN intervenant v ON v.id_intervenant = i.id_intervenant"
        . ($ou ? ' WHERE ' . implode(' AND ', $ou) : '') . ' ORDER BY n.traite ASC, n.date_heure DESC LIMIT 200');
    $st->execute($p);
    $items = $st->fetchAll();
    foreach ($items as &$x) { $x['id'] = (int)$x['id']; $x['traite'] = (bool)$x['traite']; $x['id_intervention'] = (int)$x['id_intervention']; }
    unset($x);
    $peut_declarer = in_array($user['role'], ['intervenant', 'coordinateur', 'administrateur'], true);
    $options = [];
    if ($peut_declarer) {
        $q = "SELECT i.id_intervention AS id, i.date, i.heure_debut, b.prenom, b.nom FROM intervention i JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire
              WHERE i.statut <> 'annulee' AND i.date >= ? AND i.date <= ?" . ($mon_id !== null ? ' AND i.id_intervenant = ?' : '') . ' ORDER BY i.date DESC, i.heure_debut DESC LIMIT 60';
        $pp = [date('Y-m-d', strtotime('-30 days')), date('Y-m-d')]; if ($mon_id !== null) $pp[] = $mon_id;
        $o = db()->prepare($q); $o->execute($pp); $options = $o->fetchAll();
    }
    json_out(200, ['ok' => true, 'items' => $items, 'interventions' => $options, 'gravites' => GRAVITES,
                   'peut_declarer' => $peut_declarer, 'peut_traiter' => in_array($user['role'], ['responsable_qualite', 'coordinateur', 'administrateur'], true)]);
}

if ($methode === 'POST') {
    if (!in_array($user['role'], ['intervenant', 'coordinateur', 'administrateur'], true)) json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
    $d = corps_json();
    $erreurs = [];
    $id_i = (int)($d['id_intervention'] ?? 0);
    $gravite = (string)($d['gravite'] ?? '');
    $desc = trim((string)($d['description'] ?? ''));
    if (!in_array($gravite, GRAVITES, true)) $erreurs['gravite'] = 'Choisissez la gravité.';
    if ($desc === '' || mb_strlen($desc) > 2000) $erreurs['description'] = 'Décrivez l\'incident (2000 caractères maximum).';
    $st = db()->prepare('SELECT id_intervenant FROM intervention WHERE id_intervention = ?');
    $st->execute([$id_i]);
    $inter = $st->fetch();
    if (!$inter || ($mon_id !== null && (int)$inter['id_intervenant'] !== $mon_id)) $erreurs['id_intervention'] = 'Choisissez une de vos interventions.';
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    db()->prepare('INSERT INTO incident (date_heure, description, gravite, traite, id_intervention) VALUES (?, ?, ?, 0, ?)')
        ->execute([date('Y-m-d H:i:s'), $desc, $gravite, $id_i]);
    $nouveau = (int)db()->lastInsertId();
    journaliser('creation', 'incident', 'incident ' . $nouveau . ' (' . $gravite . ') sur intervention ' . $id_i);
    $urgent = $gravite === 'urgent';   // un incident urgent prévient aussi la qualité, en alerte critique
    notifier(utilisateurs_du_role($urgent ? ['coordinateur', 'responsable_qualite'] : ['coordinateur']),
             ($urgent ? 'INCIDENT URGENT : ' : 'Incident ' . $gravite . ' : ') . resume_intervention($id_i) . ' - ' . mb_substr($desc, 0, 80), $id_i, $urgent);
    json_out(201, ['ok' => true, 'id' => $nouveau]);
}

if ($methode === 'PUT') {
    if (!in_array($user['role'], ['responsable_qualite', 'coordinateur', 'administrateur'], true)) json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
    $id = (int)($_GET['id'] ?? 0);
    $d = corps_json();
    if ($id <= 0 || !array_key_exists('traite', $d)) json_out(400, ['ok' => false, 'message' => 'Requête invalide.']);
    $t = in_array($d['traite'], [true, 1, '1'], true) ? 1 : 0;
    $st = db()->prepare('UPDATE incident SET traite = ? WHERE id_incident = ?');
    $st->execute([$t, $id]);
    $ex = db()->prepare('SELECT COUNT(*) FROM incident WHERE id_incident = ?'); $ex->execute([$id]);
    if (!(int)$ex->fetchColumn()) json_out(404, ['ok' => false, 'message' => 'Incident introuvable.']);
    journaliser('modification', 'incident', 'incident ' . $id . ($t ? ' marque traite' : ' rouvert'));
    json_out(200, ['ok' => true, 'id' => $id]);
}

header('Allow: GET, POST, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
