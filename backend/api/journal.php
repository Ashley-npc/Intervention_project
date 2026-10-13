<?php
// Consultation du journal d'audit (lecture seule) : administrateur, direction, responsable qualite.
//   GET journal.php?q=texte&action=connexion&du=2026-10-01&au=2026-10-31   (200 lignes les plus recentes au maximum)
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';

exiger_methode('GET');
exiger_connexion(['administrateur', 'direction', 'responsable_qualite']);

$ou = []; $p = [];
$q = trim((string)($_GET['q'] ?? ''));
if ($q !== '') { $ou[] = '(u.identifiant LIKE ? OR j.entite_concernee LIKE ? OR j.detail LIKE ?)'; $l = '%' . $q . '%'; array_push($p, $l, $l, $l); }
$action = trim((string)($_GET['action'] ?? ''));
if ($action !== '') { $ou[] = 'j.action = ?'; $p[] = $action; }
foreach (['du' => 'j.date_heure >= ?', 'au' => 'j.date_heure < ?'] as $cle => $cond) {
    $d = (string)($_GET[$cle] ?? '');
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) { $ou[] = $cond; $p[] = $cle === 'au' ? date('Y-m-d', strtotime($d . ' +1 day')) : $d; }
}
$st = db()->prepare('SELECT j.id_journal AS id, j.date_heure, j.action, j.entite_concernee AS entite, j.detail, u.identifiant
    FROM journal_audit j JOIN utilisateur u ON u.id_utilisateur = j.id_utilisateur' . ($ou ? ' WHERE ' . implode(' AND ', $ou) : '') . ' ORDER BY j.date_heure DESC, j.id_journal DESC LIMIT 200');
$st->execute($p);
$actions = array_column(db()->query('SELECT DISTINCT action FROM journal_audit ORDER BY action')->fetchAll(), 'action');
json_out(200, ['ok' => true, 'items' => $st->fetchAll(), 'actions' => $actions]);
