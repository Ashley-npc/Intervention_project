<?php
// Factures (service facturation ; direction en lecture seule).
//   GET  factures.php?statut=impayee&q=dupont       liste (avec montant payé / restant)
//   GET  factures.php?id=3                          une facture + ses interventions + ses paiements
//   POST factures.php  {id_beneficiaire, du, au, apercu?}   génère la facture des interventions validées de la période
//   PUT  factures.php?id=3  {statut: emise|impayee|relancee}  (« payee » vient uniquement des paiements)
// Une facture ne se supprime jamais.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/facturation.php';

$user = exiger_connexion(['facturation', 'direction']);
$methode = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($methode !== 'GET' && $user['role'] === 'direction') json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);

const SELECT_FACTURE = 'SELECT f.id_facture, f.numero, f.date_emission, f.montant_total, f.statut, f.id_beneficiaire, b.nom AS b_nom, b.prenom AS b_prenom,
        COALESCE((SELECT SUM(p.montant) FROM paiement p WHERE p.id_facture = f.id_facture), 0) AS paye
        FROM facture f JOIN beneficiaire b ON b.id_beneficiaire = f.id_beneficiaire';
function facture_vers_front(array $l): array {
    $total = round((float)$l['montant_total'], 2); $paye = round((float)$l['paye'], 2);
    return ['id' => (int)$l['id_facture'], 'numero' => $l['numero'], 'date_emission' => $l['date_emission'], 'montant_total' => $total, 'paye' => $paye,
            'restant' => round($total - $paye, 2), 'statut' => $l['statut'], 'id_beneficiaire' => (int)$l['id_beneficiaire'],
            'beneficiaire_nom' => $l['b_nom'], 'beneficiaire_prenom' => $l['b_prenom']];
}

if ($methode === 'GET') {
    if (($_GET['options'] ?? '') === '1') {      // liste réduite (nom seulement) pour choisir le bénéficiaire à facturer
        json_out(200, ['ok' => true, 'items' => db()->query('SELECT id_beneficiaire AS id, nom, prenom FROM beneficiaire WHERE archive = 0 ORDER BY nom, prenom')->fetchAll()]);
    }
    if ($id > 0) {
        $st = db()->prepare(SELECT_FACTURE . ' WHERE f.id_facture = ?');
        $st->execute([$id]);
        $l = $st->fetch();
        if (!$l) json_out(404, ['ok' => false, 'message' => 'Facture introuvable.']);
        $st = db()->prepare('SELECT i.id_intervention AS id, i.date, i.heure_debut, i.heure_fin, i.type, c.duree_reelle FROM intervention i
                             LEFT JOIN compte_rendu c ON c.id_intervention = i.id_intervention WHERE i.id_facture = ? ORDER BY i.date, i.heure_debut');
        $st->execute([$id]);
        $inter = $st->fetchAll();
        $st = db()->prepare('SELECT p.id_paiement AS id, p.date_paiement, p.montant, p.mode, p.payeur,
                                    e.recu_par, e.numero_recu, b.nom_banque, b.type_operation, b.reference, o.nom_operateur, o.numero_telephone, o.reference_transaction
                             FROM paiement p LEFT JOIN paiement_espece e ON e.id_paiement = p.id_paiement LEFT JOIN paiement_banque b ON b.id_paiement = p.id_paiement
                             LEFT JOIN paiement_operateur o ON o.id_paiement = p.id_paiement WHERE p.id_facture = ? ORDER BY p.date_paiement, p.id_paiement');
        $st->execute([$id]);
        $pay = $st->fetchAll();
        foreach ($pay as &$p) $p['montant'] = (float)$p['montant'];
        json_out(200, ['ok' => true, 'item' => facture_vers_front($l), 'interventions' => $inter, 'paiements' => $pay]);
    }
    $where = []; $params = [];
    $statut = $_GET['statut'] ?? '';
    if (in_array($statut, STATUTS_FACTURE, true)) { $where[] = 'f.statut = ?'; $params[] = $statut; }
    $q = trim((string)($_GET['q'] ?? ''));
    if ($q !== '') { $where[] = '(f.numero LIKE ? OR b.nom LIKE ? OR b.prenom LIKE ?)'; array_push($params, "%$q%", "%$q%", "%$q%"); }
    if ((int)($_GET['id_beneficiaire'] ?? 0) > 0) { $where[] = 'f.id_beneficiaire = ?'; $params[] = (int)$_GET['id_beneficiaire']; }
    $st = db()->prepare(SELECT_FACTURE . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY f.date_emission DESC, f.id_facture DESC LIMIT 500');
    $st->execute($params);
    json_out(200, ['ok' => true, 'items' => array_map('facture_vers_front', $st->fetchAll())]);
}

if ($methode === 'POST') {
    $d = corps_json();
    [$v, $erreurs] = valider($d, ['du' => ['libelle' => 'La date de début', 'type' => 'date', 'requis' => true], 'au' => ['libelle' => 'La date de fin', 'type' => 'date', 'requis' => true]], true);
    $id_b = (int)($d['id_beneficiaire'] ?? 0);
    if ($id_b <= 0) $erreurs['id_beneficiaire'] = 'Le bénéficiaire est obligatoire.';
    else { $st = db()->prepare('SELECT 1 FROM beneficiaire WHERE id_beneficiaire = ?'); $st->execute([$id_b]); if (!$st->fetchColumn()) $erreurs['id_beneficiaire'] = 'Bénéficiaire introuvable.'; }
    if (!$erreurs && $v['au'] < $v['du']) $erreurs['au'] = 'La date de fin doit être après la date de début.';
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);

    [$lignes, $total, $manquants] = lignes_facturables($id_b, $v['du'], $v['au']);
    if (!empty($d['apercu'])) json_out(200, ['ok' => true, 'lignes' => $lignes, 'total' => $total, 'types_sans_tarif' => $manquants]);
    if ($manquants) json_out(422, ['ok' => false, 'message' => 'Aucun tarif pour : ' . implode(', ', $manquants) . '. Ajoutez-le dans « Tarifs ».']);
    if (!$lignes) json_out(422, ['ok' => false, 'message' => "Aucune intervention validée à facturer pour cette période."]);

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $numero = prochain_numero_facture();
        $pdo->prepare("INSERT INTO facture (numero, date_emission, montant_total, statut, id_beneficiaire) VALUES (?, ?, ?, 'emise', ?)")
            ->execute([$numero, date('Y-m-d'), $total, $id_b]);
        $id_f = (int)$pdo->lastInsertId();
        $maj = $pdo->prepare('UPDATE intervention SET id_facture = ? WHERE id_intervention = ? AND id_facture IS NULL');
        foreach ($lignes as $l) $maj->execute([$id_f, $l['id']]);
        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        if (est_doublon($e)) json_out(409, ['ok' => false, 'message' => 'Conflit de numéro de facture : réessayez.']);
        throw $e;
    }
    journaliser('creation', 'facture', $numero . ' - total ' . $total);
    json_out(201, ['ok' => true, 'id' => $id_f, 'numero' => $numero, 'total' => $total]);
}

if ($methode === 'PUT') {
    if ($id <= 0) json_out(400, ['ok' => false, 'message' => 'Identifiant manquant.']);
    $d = corps_json();
    $st = db()->prepare('SELECT statut FROM facture WHERE id_facture = ?'); $st->execute([$id]);
    $actuel = $st->fetchColumn();
    if ($actuel === false) json_out(404, ['ok' => false, 'message' => 'Facture introuvable.']);
    $nouveau = (string)($d['statut'] ?? '');
    if (!in_array($nouveau, ['emise', 'impayee', 'relancee'], true)) json_out(422, ['ok' => false, 'message' => 'Statut non autorisé.', 'erreurs' => ['statut' => 'Valeurs : émise, impayée, relancée.']]);
    if ($actuel === 'payee') json_out(409, ['ok' => false, 'message' => 'Cette facture est payée : son statut ne change plus.']);
    db()->prepare('UPDATE facture SET statut = ? WHERE id_facture = ?')->execute([$nouveau, $id]);
    journaliser('modification', 'facture', 'facture ' . $id . ' -> ' . $nouveau);
    json_out(200, ['ok' => true, 'id' => $id]);
}
header('Allow: GET, POST, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
