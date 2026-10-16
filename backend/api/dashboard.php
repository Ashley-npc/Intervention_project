<?php
// GET dashboard.php : chiffres du tableau de bord, adaptés au rôle de la personne connectée.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/interventions.php';

exiger_methode('GET');
$user = exiger_connexion(['administrateur', 'coordinateur', 'intervenant', 'responsable_qualite', 'direction', 'facturation']);
$aujourdhui = date('Y-m-d');
$lundi = date('Y-m-d', strtotime('monday this week'));
$dimanche = date('Y-m-d', strtotime('sunday this week'));
$pas_annulee = "statut NOT IN ('annulee')";

function minutes(string $debut, string $fin): int { return (int)((strtotime("1970-01-01 $fin") - strtotime("1970-01-01 $debut")) / 60); }
function nb(string $sql, array $p = []): float { $st = db()->prepare($sql); $st->execute($p); return (float)$st->fetchColumn(); }
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

if ($user['role'] === 'facturation') {
    $mois = date('Y-m');
    $reste = db()->query("SELECT COALESCE(SUM(f.montant_total), 0) - COALESCE(SUM((SELECT COALESCE(SUM(p.montant), 0) FROM paiement p WHERE p.id_facture = f.id_facture)), 0)
                          FROM facture f WHERE f.statut <> 'payee'")->fetchColumn();
    $st = db()->query("SELECT f.id_facture AS id, f.numero, f.date_emission, f.montant_total, f.statut, b.nom, b.prenom,
                       COALESCE((SELECT SUM(p.montant) FROM paiement p WHERE p.id_facture = f.id_facture), 0) AS paye
                       FROM facture f JOIN beneficiaire b ON b.id_beneficiaire = f.id_beneficiaire
                       ORDER BY f.date_emission DESC, f.id_facture DESC LIMIT 5");
    json_out(200, ['ok' => true, 'role' => 'facturation', 'kpis' => [
        'facture_mois' => round(nb('SELECT COALESCE(SUM(montant_total), 0) FROM facture WHERE date_emission LIKE ?', ["$mois%"]), 2),
        'encaisse_mois' => round(nb('SELECT COALESCE(SUM(montant), 0) FROM paiement WHERE date_paiement LIKE ?', ["$mois%"]), 2),
        'reste_a_payer' => round((float)$reste, 2),
        'a_facturer' => un("SELECT COUNT(*) FROM intervention WHERE validee = 1 AND statut = 'realisee' AND id_facture IS NULL"),
        'en_retard' => un("SELECT COUNT(*) FROM facture WHERE statut <> 'payee' AND date_emission < ?", [date('Y-m-d', strtotime('-30 days'))]),
    ], 'dernieres' => $st->fetchAll()]);
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
                WHERE a.statut NOT IN ('annulee') AND b.statut NOT IN ('annulee') AND a.date >= ?", [$aujourdhui]);

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
// Planning de la semaine : nombre d'interventions par jour (lundi -> dimanche).
$st = db()->prepare("SELECT date, COUNT(*) AS nb, MIN(heure_debut) AS premiere, MAX(heure_fin) AS derniere FROM intervention WHERE date BETWEEN ? AND ? AND $pas_annulee GROUP BY date");
$st->execute([$lundi, $dimanche]);
$par_jour = [];
foreach ($st->fetchAll() as $l) $par_jour[$l['date']] = ['nb' => (int)$l['nb'], 'premiere' => substr((string)$l['premiere'], 0, 5), 'derniere' => substr((string)$l['derniere'], 0, 5)];
$jours = [];
for ($n = 0; $n < 7; $n++) { $d = date('Y-m-d', strtotime("$lundi +$n day")); $jours[] = ['date' => $d, 'nb' => $par_jour[$d]['nb'] ?? 0, 'premiere' => $par_jour[$d]['premiere'] ?? null, 'derniere' => $par_jour[$d]['derniere'] ?? null]; }

// Prochaine intervention urgente (a partir d'aujourd'hui).
$st = db()->prepare(SELECT_INTERVENTION . " WHERE i.urgente = 1 AND i.date >= ? AND i.$pas_annulee ORDER BY i.date, i.heure_debut LIMIT 1");
$st->execute([$aujourdhui]);
$urgence = $st->fetch();

json_out(200, ['ok' => true, 'role' => $user['role'], 'kpis' => $kpis, 'aujourdhui' => $jour, 'charge' => $charge, 'jours' => $jours,
               'prochaine_urgence' => $urgence ? intervention_vers_front($urgence) : null]);
