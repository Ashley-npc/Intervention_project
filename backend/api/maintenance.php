<?php
// État du système (équipe technique, administrateur) : serveur, base, volumes et contrôles de cohérence. Lecture seule.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';

exiger_methode('GET');
exiger_connexion(['maintenance', 'administrateur']);

function essayer(callable $f) { try { return $f(); } catch (Throwable $e) { return null; } }
function compter(string $sql, array $p = []): ?int { return essayer(function () use ($sql, $p) { $st = db()->prepare($sql); $st->execute($p); return (int)$st->fetchColumn(); }); }

$t0 = microtime(true);
$base_ok = essayer(function () { db()->query('SELECT 1'); return true; }) === true;
$ms = (int)round((microtime(true) - $t0) * 1000);

$tables = [];
foreach (['utilisateur', 'role', 'beneficiaire', 'intervenant', 'intervention', 'compte_rendu', 'facture', 'paiement', 'tarif', 'proche_aidant', 'lien_beneficiaire_aidant'] as $t) {
    $tables[] = ['table' => $t, 'lignes' => compter("SELECT COUNT(*) FROM $t")];   // $t vient de la liste ci-dessus, jamais de l'utilisateur
}
$auj = date('Y-m-d');
$controles = [
    ['libelle' => "Chevauchements d'horaires (à venir)", 'n' => compter("SELECT COUNT(*) FROM intervention a JOIN intervention b ON a.id_intervention < b.id_intervention AND a.date = b.date
        AND a.heure_debut < b.heure_fin AND a.heure_fin > b.heure_debut AND (a.id_intervenant = b.id_intervenant OR a.id_beneficiaire = b.id_beneficiaire)
        WHERE a.statut <> 'annulee' AND b.statut <> 'annulee' AND a.date >= ?", [$auj])],
    ['libelle' => 'Interventions validées sans compte rendu', 'n' => compter("SELECT COUNT(*) FROM intervention i LEFT JOIN compte_rendu c ON c.id_intervention = i.id_intervention WHERE i.validee = 1 AND c.id_compte_rendu IS NULL")],
    ['libelle' => 'Comptes rendus en attente depuis plus de 7 jours', 'n' => compter("SELECT COUNT(*) FROM compte_rendu c JOIN intervention i ON i.id_intervention = c.id_intervention WHERE c.valide_par_coordinateur = 0 AND c.date_saisie < ?", [date('Y-m-d', strtotime('-7 days'))])],
    ['libelle' => 'Comptes jamais connectés', 'n' => compter('SELECT COUNT(*) FROM utilisateur WHERE derniere_connexion IS NULL AND actif = 1')],
    ['libelle' => 'Comptes avec mot de passe temporaire non changé', 'n' => compter('SELECT COUNT(*) FROM utilisateur WHERE doit_changer_mot_de_passe = 1 AND actif = 1')],
    ['libelle' => 'Intervenants actifs sans compte de connexion', 'n' => compter('SELECT COUNT(*) FROM intervenant WHERE actif = 1 AND id_utilisateur IS NULL')],
    ['libelle' => 'Interventions réalisées et validées, pas encore facturées', 'n' => compter("SELECT COUNT(*) FROM intervention WHERE validee = 1 AND statut = 'realisee' AND id_facture IS NULL")],
    ['libelle' => 'Factures non payées depuis plus de 30 jours', 'n' => compter("SELECT COUNT(*) FROM facture WHERE statut <> 'payee' AND date_emission < ?", [date('Y-m-d', strtotime('-30 days'))])],
];
json_out(200, ['ok' => true,
    'serveur' => ['php' => PHP_VERSION, 'heure' => date('Y-m-d H:i:s'), 'fuseau' => date_default_timezone_get(), 'pdo_mysql' => extension_loaded('pdo_mysql'), 'memoire_mo' => round(memory_get_peak_usage(true) / 1048576, 1)],
    'base' => ['ok' => $base_ok, 'ms' => $ms], 'tables' => $tables, 'controles' => $controles]);
