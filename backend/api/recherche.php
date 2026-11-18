<?php
// GET recherche.php?q=rakoto : recherche rapide (barre du haut), limitée à ce que le rôle a le droit de voir.
//   coordinateur : bénéficiaires, intervenants, interventions
//   intervenant  : ses propres interventions
//   administrateur : comptes utilisateurs
//   facturation, direction : factures
// Réponse : { ok, groupes: [ { titre, items: [ { titre, sous, lien } ] } ] }   (lien relatif au dossier frontend)
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/interventions.php';

exiger_methode('GET');
$user = exiger_connexion(['coordinateur', 'intervenant', 'administrateur', 'facturation', 'direction']);

$q = trim((string)($_GET['q'] ?? ''));
if (mb_strlen($q) < 2) json_out(200, ['ok' => true, 'groupes' => []]);
$q = mb_substr($q, 0, 60);
$mots = array_slice(preg_split('/\s+/u', $q), 0, 4);   // chaque mot doit se retrouver quelque part : « rina and » trouve « Rina Andria »

// Condition « tous les mots apparaissent dans $expr » + ses paramètres. % et _ sont neutralisés.
function condition_mots(string $expr, array $mots): array {
    $sql = []; $p = [];
    foreach ($mots as $m) { $sql[] = "$expr LIKE ?"; $p[] = '%' . addcslashes($m, '%_\\') . '%'; }
    return [implode(' AND ', $sql), $p];
}
function date_fr(string $d): string { return substr($d, 8, 2) . '/' . substr($d, 5, 2) . '/' . substr($d, 0, 4); }

$groupes = [];

if ($user['role'] === 'coordinateur') {
    [$w, $p] = condition_mots("CONCAT_WS(' ', prenom, nom, numero_dossier)", $mots);
    $st = db()->prepare("SELECT id_beneficiaire, prenom, nom, numero_dossier, archive FROM beneficiaire WHERE $w ORDER BY archive, nom, prenom LIMIT 6");
    $st->execute($p);
    $items = [];
    foreach ($st->fetchAll() as $l) $items[] = ['titre' => $l['prenom'] . ' ' . $l['nom'], 'sous' => ($l['numero_dossier'] ? 'Dossier ' . $l['numero_dossier'] : 'Bénéficiaire') . ($l['archive'] ? ' · archivé' : ''), 'lien' => 'beneficiaires/fiche.html?id=' . (int)$l['id_beneficiaire']];
    if ($items) $groupes[] = ['titre' => 'Bénéficiaires', 'items' => $items];

    [$w, $p] = condition_mots("CONCAT_WS(' ', prenom, nom)", $mots);
    $st = db()->prepare("SELECT id_intervenant, prenom, nom, statut, actif FROM intervenant WHERE $w ORDER BY actif DESC, nom, prenom LIMIT 6");
    $st->execute($p);
    $items = [];
    foreach ($st->fetchAll() as $l) $items[] = ['titre' => $l['prenom'] . ' ' . $l['nom'], 'sous' => 'Intervenant' . ($l['actif'] ? '' : ' · désactivé'), 'lien' => 'intervenants/fiche.html?id=' . (int)$l['id_intervenant']];
    if ($items) $groupes[] = ['titre' => 'Intervenants', 'items' => $items];

    [$w, $p] = condition_mots("CONCAT_WS(' ', b.prenom, b.nom, v.prenom, v.nom)", $mots);
    $st = db()->prepare("SELECT i.id_intervention, i.date, i.heure_debut, b.prenom AS bp, b.nom AS bn, v.prenom AS vp, v.nom AS vn FROM intervention i
                         JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire JOIN intervenant v ON v.id_intervenant = i.id_intervenant
                         WHERE $w ORDER BY i.date DESC, i.heure_debut DESC LIMIT 6");
    $st->execute($p);
    $items = [];
    foreach ($st->fetchAll() as $l) $items[] = ['titre' => $l['bp'] . ' ' . $l['bn'] . ' · ' . date_fr($l['date']) . ' ' . substr($l['heure_debut'], 0, 5), 'sous' => 'Avec ' . $l['vp'] . ' ' . $l['vn'], 'lien' => 'interventions/fiche.html?id=' . (int)$l['id_intervention']];
    if ($items) $groupes[] = ['titre' => 'Interventions', 'items' => $items];
}

if ($user['role'] === 'intervenant') {
    $moi = intervenant_du_compte($user);
    if ($moi !== null) {
        [$w, $p] = condition_mots("CONCAT_WS(' ', b.prenom, b.nom)", $mots);
        $st = db()->prepare("SELECT i.id_intervention, i.date, i.heure_debut, b.prenom AS bp, b.nom AS bn FROM intervention i JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire
                             WHERE i.id_intervenant = ? AND $w ORDER BY i.date DESC, i.heure_debut DESC LIMIT 8");
        $st->execute(array_merge([$moi], $p));
        $items = [];
        foreach ($st->fetchAll() as $l) $items[] = ['titre' => $l['bp'] . ' ' . $l['bn'] . ' · ' . date_fr($l['date']) . ' ' . substr($l['heure_debut'], 0, 5), 'sous' => 'Mon intervention', 'lien' => 'espace-intervenant/compte-rendu.html?id=' . (int)$l['id_intervention']];
        if ($items) $groupes[] = ['titre' => 'Mes interventions', 'items' => $items];
    }
}

if ($user['role'] === 'administrateur') {
    [$w, $p] = condition_mots("CONCAT_WS(' ', identifiant, prenom, nom)", $mots);
    $st = db()->prepare("SELECT identifiant, prenom, nom, actif FROM utilisateur WHERE $w ORDER BY actif DESC, identifiant LIMIT 8");
    $st->execute($p);
    $items = [];
    foreach ($st->fetchAll() as $l) $items[] = ['titre' => $l['identifiant'], 'sous' => trim($l['prenom'] . ' ' . $l['nom']) . ($l['actif'] ? '' : ' · désactivé'), 'lien' => 'admin/utilisateurs.html'];
    if ($items) $groupes[] = ['titre' => 'Comptes', 'items' => $items];
}

if (in_array($user['role'], ['facturation', 'direction'], true)) {
    [$w, $p] = condition_mots("CONCAT_WS(' ', f.numero, b.prenom, b.nom)", $mots);
    $st = db()->prepare("SELECT f.id_facture, f.numero, f.date_emission, f.montant_total, b.prenom, b.nom FROM facture f JOIN beneficiaire b ON b.id_beneficiaire = f.id_beneficiaire
                         WHERE $w ORDER BY f.date_emission DESC, f.id_facture DESC LIMIT 8");
    $st->execute($p);
    $items = [];
    foreach ($st->fetchAll() as $l) $items[] = ['titre' => 'Facture ' . $l['numero'], 'sous' => $l['prenom'] . ' ' . $l['nom'] . ' · ' . date_fr($l['date_emission']), 'lien' => 'facturation/facture.html?id=' . (int)$l['id_facture']];
    if ($items) $groupes[] = ['titre' => 'Factures', 'items' => $items];
}

json_out(200, ['ok' => true, 'groupes' => $groupes]);
