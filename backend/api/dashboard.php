<?php
// GET dashboard.php : chiffres du tableau de bord, adaptés au rôle de la personne connectée.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/interventions.php';

exiger_methode('GET');
$user = exiger_connexion(['administrateur', 'coordinateur', 'intervenant', 'responsable_qualite', 'direction']);
$aujourdhui = date('Y-m-d');
$lundi = date('Y-m-d', strtotime('monday this week'));
$dimanche = date('Y-m-d', strtotime('sunday this week'));
$pas_annulee = "statut NOT IN ('annulée','annulee')";

function minutes(string $debut, string $fin): int { return (int)((strtotime("1970-01-01 $fin") - strtotime("1970-01-01 $debut")) / 60); }
function un(string $sql, array $p = []): int { $st = db()->prepare($sql); $st->execute($p); return (int)$st->fetchColumn(); }

if ($user['role'] === 'intervenant') {
    $mon_id = intervenant_du_compte($user);
    if ($mon_id === null) json_out(200, ['ok' => true, 'role' => 'intervenant', 'lie' => false]);
    $st = db()->prepare(SELECT_INTERVENTION . " WHERE i.id_intervenant = ? AND i.date = ? AND i.$pas_annulee ORDER BY i.heure_debut");
    $st->execute([$mon_id, $aujourdhui]);
    $jour = array_map('intervention_vers_front', $st->fetchAll());
    $nom = db()->prepare('SELECT prenom FROM intervenant WHERE id_intervenant = ?'); $nom->execute([$mon_id]);
    json_out(200, ['ok' => true, 'role' => 'intervenant', 'lie' => true, 'prenom' => $nom->fetchColumn(), 'aujourdhui' => $jour,
        'kpis' => [
            'aujourdhui' => count($jour),
            'semaine'    => un("SELECT COUNT(*) FROM intervention WHERE id_intervenant = ? AND date BETWEEN ? AND ? AND $pas_annulee", [$mon_id, $lundi, $dimanche]),
            // Interventions passées (ou du jour) sans compte rendu : à saisir.
            'a_saisir'   => un("SELECT COUNT(*) FROM intervention i LEFT JOIN compte_rendu c ON c.id_intervention = i.id_intervention
                                WHERE i.id_intervenant = ? AND " . SQL_TERMINEE . " AND i.$pas_annulee AND c.id_compte_rendu IS NULL", array_merge([$mon_id], params_terminee())),
        ]]);
}

// Coordinateur, administrateur, qualité, direction : vue d'ensemble.
$st = db()->prepare(SELECT_INTERVENTION . " WHERE i.date = ? AND i.$pas_annulee ORDER BY i.heure_debut");
$st->execute([$aujourdhui]);
$jour = array_map('intervention_vers_front', $st->fetchAll());

$st = db()->prepare("SELECT v.id_intervenant, v.nom, v.prenom, i.heure_debut, i.heure_fin FROM intervention i JOIN intervenant v ON v.id_intervenant = i.id_intervenant
                     WHERE i.date BETWEEN ? AND ? AND i.$pas_annulee");
$st->execute([$lundi, $dimanche]);
$charge = [];
foreach ($st->fetchAll() as $l) {
    $k = (int)$l['id_intervenant'];
    if (!isset($charge[$k])) $charge[$k] = ['nom' => $l['prenom'] . ' ' . $l['nom'], 'minutes' => 0];
    $charge[$k]['minutes'] += minutes($l['heure_debut'], $l['heure_fin']);
}
usort($charge, function ($a, $b) { return $b['minutes'] <=> $a['minutes']; });

$conflits = un("SELECT COUNT(*) FROM intervention a JOIN intervention b ON a.id_intervention < b.id_intervention AND a.date = b.date
                AND a.heure_debut < b.heure_fin AND a.heure_fin > b.heure_debut
                AND (a.id_intervenant = b.id_intervenant OR a.id_beneficiaire = b.id_beneficiaire)
                WHERE a.statut NOT IN ('annulée','annulee') AND b.statut NOT IN ('annulée','annulee') AND a.date >= ?", [$aujourdhui]);

$kpis = [
    'semaine'       => un("SELECT COUNT(*) FROM intervention WHERE date BETWEEN ? AND ? AND $pas_annulee", [$lundi, $dimanche]),
    'beneficiaires' => un('SELECT COUNT(*) FROM beneficiaire WHERE archive = 0'),
    'intervenants'  => un('SELECT COUNT(*) FROM intervenant WHERE actif = 1'),
    'a_valider'     => un('SELECT COUNT(*) FROM compte_rendu WHERE valide_par_coordinateur = 0'),
    'sans_cr'       => un("SELECT COUNT(*) FROM intervention i LEFT JOIN compte_rendu c ON c.id_intervention = i.id_intervention
                           WHERE " . SQL_TERMINEE . " AND i.$pas_annulee AND c.id_compte_rendu IS NULL", params_terminee()),
    'conflits'      => $conflits,
    'urgentes'      => un("SELECT COUNT(*) FROM intervention WHERE urgente = 1 AND date >= ? AND $pas_annulee", [$aujourdhui]),
];
if ($user['role'] === 'administrateur') $kpis['utilisateurs'] = un('SELECT COUNT(*) FROM utilisateur WHERE actif = 1');
json_out(200, ['ok' => true, 'role' => $user['role'], 'kpis' => $kpis, 'aujourdhui' => $jour, 'charge' => $charge]);
