<?php
// Organismes payeurs (CAF, CPAM, MDPH...) et prise en charge des beneficiaires. Contacts EXTERNES : pas de compte.
//   GET    organismes.php                       liste + nombre de beneficiaires pris en charge (coordinateur, facturation)
//   POST   organismes.php {nom, adresse?, telephone?, courriel?}   creer
//   PUT    organismes.php?id=2 {champs}          modifier
//   DELETE organismes.php?id=2                   supprimer un organisme jamais utilise
//   GET    organismes.php?beneficiaire=3         prise en charge d'un beneficiaire
//   POST   organismes.php {action:"prise_en_charge", id_beneficiaire, id_organisme, droits_ouverts?, taux_prise_en_charge?, date_debut?, date_fin?}  (coordinateur)
//   POST   organismes.php {action:"retirer", id_beneficiaire, id_organisme}   (coordinateur)
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/journal.php';

$user = exiger_connexion(['coordinateur', 'facturation']);
$coord = $user['role'] === 'coordinateur';
$REGLES = [
    'nom'       => ['libelle' => 'Le nom',       'max' => 150, 'requis' => true],
    'adresse'   => ['libelle' => "L'adresse",    'max' => 255],
    'telephone' => ['libelle' => 'Le téléphone', 'type' => 'telephone'],
    'courriel'  => ['libelle' => 'Le courriel',  'type' => 'courriel', 'max' => 150],
];
$REGLES_PEC = [
    'droits_ouverts' => ['libelle' => 'Les droits ouverts', 'max' => 255],
    'date_debut'     => ['libelle' => 'La date de début',   'type' => 'date'],
    'date_fin'       => ['libelle' => 'La date de fin',     'type' => 'date'],
];
$methode = $_SERVER['REQUEST_METHOD'];
$id = (int)($_GET['id'] ?? 0);

function existe(string $table, string $col, int $id): bool { $st = db()->prepare("SELECT COUNT(*) FROM $table WHERE $col = ?"); $st->execute([$id]); return (bool)(int)$st->fetchColumn(); }
function refus(int $code, string $m, array $e = []) { json_out($code, ['ok' => false, 'message' => $m] + ($e ? ['erreurs' => $e] : [])); }
function nom_pris(string $nom, int $sauf = 0): bool { $st = db()->prepare('SELECT COUNT(*) FROM organisme_payeur WHERE LOWER(nom) = LOWER(?) AND id_organisme <> ?'); $st->execute([$nom, $sauf]); return (bool)(int)$st->fetchColumn(); }

if ($methode === 'GET') {
    if (isset($_GET['beneficiaire'])) {
        $st = db()->prepare('SELECT p.id_organisme, o.nom, p.droits_ouverts, p.taux_prise_en_charge, p.date_debut, p.date_fin
            FROM prise_en_charge p JOIN organisme_payeur o ON o.id_organisme = p.id_organisme WHERE p.id_beneficiaire = ? ORDER BY o.nom');
        $st->execute([(int)$_GET['beneficiaire']]);
        $l = $st->fetchAll();
        foreach ($l as &$p) { $p['id_organisme'] = (int)$p['id_organisme']; $p['taux_prise_en_charge'] = $p['taux_prise_en_charge'] === null ? null : (float)$p['taux_prise_en_charge']; }
        $o = db()->query('SELECT id_organisme AS id, nom FROM organisme_payeur ORDER BY nom')->fetchAll();
        foreach ($o as &$x) $x['id'] = (int)$x['id'];
        json_out(200, ['ok' => true, 'items' => $l, 'organismes' => $o, 'modifiable' => $coord]);
    }
    $l = db()->query('SELECT o.id_organisme AS id, o.nom, o.adresse, o.telephone, o.courriel,
            (SELECT COUNT(*) FROM prise_en_charge p WHERE p.id_organisme = o.id_organisme) AS nb_beneficiaires
        FROM organisme_payeur o ORDER BY o.nom')->fetchAll();
    foreach ($l as &$o) { $o['id'] = (int)$o['id']; $o['nb_beneficiaires'] = (int)$o['nb_beneficiaires']; }
    json_out(200, ['ok' => true, 'items' => $l]);
}

if ($methode === 'POST') {
    $d = corps_json();
    $action = $d['action'] ?? null;
    if ($action === 'prise_en_charge' || $action === 'retirer') {
        if (!$coord) refus(403, 'Accès refusé.');
        $b = (int)($d['id_beneficiaire'] ?? 0); $o = (int)($d['id_organisme'] ?? 0);
        if (!existe('beneficiaire', 'id_beneficiaire', $b)) refus(404, 'Bénéficiaire introuvable.');
        if (!existe('organisme_payeur', 'id_organisme', $o)) refus(422, 'Choisissez un organisme.', ['id_organisme' => 'Choisissez un organisme.']);
        if ($action === 'retirer') {
            db()->prepare('DELETE FROM prise_en_charge WHERE id_beneficiaire = ? AND id_organisme = ?')->execute([$b, $o]);
            journaliser('modification', 'beneficiaire', "prise en charge retirée : bénéficiaire $b, organisme $o");
            json_out(200, ['ok' => true]);
        }
        [$v, $err] = valider($d, $REGLES_PEC, true);
        $taux = null;
        if (isset($d['taux_prise_en_charge']) && $d['taux_prise_en_charge'] !== '') {
            $t = str_replace(',', '.', trim((string)$d['taux_prise_en_charge']));
            if (!is_numeric($t) || (float)$t < 0 || (float)$t > 100) $err['taux_prise_en_charge'] = 'Le taux doit être compris entre 0 et 100.';
            else $taux = round((float)$t, 2);
        }
        if (!$err && isset($v['date_debut'], $v['date_fin']) && $v['date_fin'] < $v['date_debut']) $err['date_fin'] = 'La fin ne peut pas précéder le début.';
        if ($err) refus(422, 'Certains champs sont à corriger.', $err);
        $vals = [$v['droits_ouverts'] ?? null, $taux, $v['date_debut'] ?? null, $v['date_fin'] ?? null];
        $pdo = db(); $pdo->beginTransaction();
        try {
            $pdo->prepare('DELETE FROM prise_en_charge WHERE id_beneficiaire = ? AND id_organisme = ?')->execute([$b, $o]);   // ajout ou mise a jour
            $pdo->prepare('INSERT INTO prise_en_charge (id_beneficiaire, id_organisme, droits_ouverts, taux_prise_en_charge, date_debut, date_fin) VALUES (?, ?, ?, ?, ?, ?)')->execute(array_merge([$b, $o], $vals));
            $pdo->commit();
        } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
        journaliser('modification', 'beneficiaire', "prise en charge : bénéficiaire $b, organisme $o");
        json_out(200, ['ok' => true]);
    }
    [$v, $err] = valider($d, $REGLES, true);
    if (!$err && nom_pris($v['nom'])) $err['nom'] = 'Cet organisme existe déjà.';
    if ($err) refus(422, 'Certains champs sont à corriger.', $err);
    $cols = array_keys($v);
    db()->prepare('INSERT INTO organisme_payeur (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')')->execute(array_values($v));
    $nouveau = (int)db()->lastInsertId();
    journaliser('creation', 'organisme', 'organisme ' . $nouveau . ' : ' . $v['nom']);
    json_out(201, ['ok' => true, 'id' => $nouveau]);
}

if ($methode === 'PUT') {
    if ($id <= 0) refus(400, 'Identifiant manquant.');
    if (!existe('organisme_payeur', 'id_organisme', $id)) refus(404, 'Organisme introuvable.');
    [$v, $err] = valider(corps_json(), $REGLES, false);
    if (!$err && isset($v['nom']) && nom_pris($v['nom'], $id)) $err['nom'] = 'Cet organisme existe déjà.';
    if ($err) refus(422, 'Certains champs sont à corriger.', $err);
    if (!$v) refus(400, 'Rien à modifier.');
    $sets = implode(', ', array_map(function ($c) { return "$c = ?"; }, array_keys($v)));
    db()->prepare("UPDATE organisme_payeur SET $sets WHERE id_organisme = ?")->execute(array_merge(array_values($v), [$id]));
    journaliser('modification', 'organisme', 'organisme ' . $id);
    json_out(200, ['ok' => true, 'id' => $id]);
}

if ($methode === 'DELETE') {
    if ($id <= 0) refus(400, 'Identifiant manquant.');
    if (!existe('organisme_payeur', 'id_organisme', $id)) refus(404, 'Organisme introuvable.');
    $n = db()->prepare('SELECT (SELECT COUNT(*) FROM prise_en_charge WHERE id_organisme = ?) + (SELECT COUNT(*) FROM facture WHERE id_organisme = ?)'); $n->execute([$id, $id]);
    if ((int)$n->fetchColumn()) refus(409, 'Cet organisme est utilisé (bénéficiaires ou factures) : il ne peut pas être supprimé.');
    db()->prepare('DELETE FROM organisme_payeur WHERE id_organisme = ?')->execute([$id]);
    journaliser('suppression', 'organisme', 'organisme ' . $id);
    json_out(200, ['ok' => true]);
}
header('Allow: GET, POST, PUT, DELETE');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
