<?php
// Disponibilites hebdomadaires d'un intervenant (semaine type : des creneaux par jour).
//   GET disponibilites.php[?id_intervenant=3]   creneaux  (l'intervenant voit les siens ; le coordinateur/administrateur choisit)
//   PUT disponibilites.php[?id_intervenant=3]   {creneaux: [{jour: 1, debut: "08:00", fin: "12:00"}, ...]}  remplace toute la semaine
// Sans aucun creneau, l'intervenant n'est soumis a aucune contrainte. Avec des creneaux, une intervention doit entrer dans l'un d'eux.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/notifications.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/interventions.php';
require __DIR__ . '/../includes/disponibilites.php';

$user = exiger_connexion(['coordinateur', 'administrateur', 'intervenant']);
if ($user['role'] === 'intervenant') {
    $id_v = intervenant_du_compte($user);
    if ($id_v === null) json_out(403, ['ok' => false, 'message' => "Ce compte n'est lié à aucune fiche intervenant."]);
} else $id_v = (int)($_GET['id_intervenant'] ?? 0);
$st = db()->prepare('SELECT nom, prenom FROM intervenant WHERE id_intervenant = ?'); $st->execute([$id_v]);
$fiche = $st->fetch();
if (!$fiche) json_out(404, ['ok' => false, 'message' => 'Intervenant introuvable.']);

function creneaux_de(int $id_v): array {
    $st = db()->prepare('SELECT jour_semaine, heure_debut, heure_fin FROM disponibilite WHERE id_intervenant = ? ORDER BY jour_semaine, heure_debut');
    $st->execute([$id_v]);
    return array_map(function ($c) { return ['jour' => (int)$c['jour_semaine'], 'debut' => substr($c['heure_debut'], 0, 5), 'fin' => substr($c['heure_fin'], 0, 5)]; }, $st->fetchAll());
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $r = ['ok' => true, 'intervenant' => $fiche['prenom'] . ' ' . $fiche['nom'], 'id_intervenant' => $id_v, 'creneaux' => creneaux_de($id_v)];
    if ($user['role'] !== 'intervenant') $r['intervenants'] = db()->query('SELECT id_intervenant AS id, nom, prenom FROM intervenant WHERE actif = 1 ORDER BY nom, prenom')->fetchAll();
    json_out(200, $r);
}
exiger_methode('PUT');
$d = corps_json();
$liste = $d['creneaux'] ?? null;
if (!is_array($liste) || count($liste) > 42) json_out(422, ['ok' => false, 'message' => 'Liste de créneaux invalide.']);
$propres = [];
foreach ($liste as $c) {
    $j = (int)($c['jour'] ?? 0); $a = (string)($c['debut'] ?? ''); $b = (string)($c['fin'] ?? '');
    if ($j < 1 || $j > 7 || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $a) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $b))
        json_out(422, ['ok' => false, 'message' => 'Chaque créneau doit avoir un jour et des heures valides (hh:mm).']);
    if ($b <= $a) json_out(422, ['ok' => false, 'message' => "Dans un créneau, l'heure de fin doit être après l'heure de début."]);
    $propres[] = ['jour' => $j, 'debut' => $a, 'fin' => $b];
}
usort($propres, function ($x, $y) { return [$x['jour'], $x['debut']] <=> [$y['jour'], $y['debut']]; });
for ($i = 1; $i < count($propres); $i++)
    if ($propres[$i]['jour'] === $propres[$i - 1]['jour'] && $propres[$i]['debut'] < $propres[$i - 1]['fin'])
        json_out(422, ['ok' => false, 'message' => 'Deux créneaux du même jour se chevauchent.']);

$pdo = db();
$pdo->beginTransaction();
try {
    $pdo->prepare('DELETE FROM disponibilite WHERE id_intervenant = ?')->execute([$id_v]);
    $ins = $pdo->prepare('INSERT INTO disponibilite (id_intervenant, jour_semaine, heure_debut, heure_fin) VALUES (?, ?, ?, ?)');
    foreach ($propres as $c) $ins->execute([$id_v, $c['jour'], $c['debut'] . ':00', $c['fin'] . ':00']);
    $pdo->commit();
} catch (Throwable $e) { $pdo->rollBack(); throw $e; }
journaliser('modification', 'disponibilites', $fiche['prenom'] . ' ' . $fiche['nom'] . ' : ' . count($propres) . ' créneau(x)');

// Interventions a venir qui ne rentrent plus dans les disponibilites : a signaler.
$st = $pdo->prepare(SELECT_INTERVENTION . " WHERE i.id_intervenant = ? AND i.date >= ? AND i.statut = 'planifiee' AND i.validee = 0 AND i.urgente = 0 ORDER BY i.date, i.heure_debut");
$st->execute([$id_v, date('Y-m-d')]);
$hors = [];
foreach ($st->fetchAll() as $l) if (hors_disponibilites($id_v, $l['date'], $l['heure_debut'], $l['heure_fin'])) $hors[] = intervention_vers_front($l);
if ($user['role'] === 'intervenant' && $hors) notifier(utilisateurs_du_role(['coordinateur']), $fiche['prenom'] . ' ' . $fiche['nom'] . ' a modifié ses disponibilités : ' . count($hors) . ' intervention(s) prévue(s) en dehors.', null, true);
json_out(200, ['ok' => true, 'creneaux' => $propres, 'hors_creneaux' => $hors]);
