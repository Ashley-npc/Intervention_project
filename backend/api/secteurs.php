<?php
// Secteurs geographiques.
//   GET    secteurs.php                       liste + nombre de beneficiaires et d'intervenants (administrateur, coordinateur)
//   GET    secteurs.php?beneficiaire=3        secteur d'un beneficiaire        GET ?intervenant=2   secteurs d'un intervenant
//   POST   secteurs.php {libelle}             creer un secteur (administrateur)
//   PUT    secteurs.php?id=1 {libelle}        renommer (administrateur)
//   DELETE secteurs.php?id=1                  supprimer un secteur inutilise (administrateur)
//   POST   secteurs.php {action:"beneficiaire", id, id_secteur}   rattacher un beneficiaire a un secteur (coordinateur)
//   POST   secteurs.php {action:"intervenant", id, secteurs:[..]} secteurs d'un intervenant (coordinateur)
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/validation.php';

$user = exiger_connexion(['administrateur', 'coordinateur']);
$admin = $user['role'] === 'administrateur';
$methode = $_SERVER['REQUEST_METHOD'];
$id = (int)($_GET['id'] ?? 0);

function secteur_existe(int $id): bool { $st = db()->prepare('SELECT COUNT(*) FROM secteur WHERE id_secteur = ?'); $st->execute([$id]); return (bool)(int)$st->fetchColumn(); }
function libelle_secteur(array $d, int $sauf = 0): string {
    $l = trim((string)($d['libelle'] ?? ''));
    if ($l === '' || mb_strlen($l) > 100) json_out(422, ['ok' => false, 'message' => 'Nom du secteur obligatoire (100 caractères maximum).', 'erreurs' => ['libelle' => 'Nom du secteur obligatoire (100 caractères maximum).']]);
    $st = db()->prepare('SELECT COUNT(*) FROM secteur WHERE LOWER(libelle) = LOWER(?) AND id_secteur <> ?'); $st->execute([$l, $sauf]);
    if ((int)$st->fetchColumn()) json_out(409, ['ok' => false, 'message' => 'Ce secteur existe déjà.', 'erreurs' => ['libelle' => 'Ce secteur existe déjà.']]);
    return $l;
}

if ($methode === 'GET') {
    if (isset($_GET['beneficiaire'])) {
        $st = db()->prepare('SELECT id_secteur FROM beneficiaire WHERE id_beneficiaire = ?'); $st->execute([(int)$_GET['beneficiaire']]);
        $x = $st->fetchColumn(); json_out(200, ['ok' => true, 'id_secteur' => $x === false || $x === null ? null : (int)$x]);
    }
    if (isset($_GET['intervenant'])) {
        $st = db()->prepare('SELECT id_secteur FROM secteur_intervenant WHERE id_intervenant = ?'); $st->execute([(int)$_GET['intervenant']]);
        json_out(200, ['ok' => true, 'secteurs' => array_map('intval', array_column($st->fetchAll(), 'id_secteur'))]);
    }
    $l = db()->query('SELECT s.id_secteur AS id, s.libelle, (SELECT COUNT(*) FROM beneficiaire b WHERE b.id_secteur = s.id_secteur AND b.archive = 0) AS nb_beneficiaires,
                      (SELECT COUNT(*) FROM secteur_intervenant si JOIN intervenant v ON v.id_intervenant = si.id_intervenant WHERE si.id_secteur = s.id_secteur AND v.actif = 1) AS nb_intervenants
                      FROM secteur s ORDER BY s.libelle')->fetchAll();
    foreach ($l as &$s) { $s['id'] = (int)$s['id']; $s['nb_beneficiaires'] = (int)$s['nb_beneficiaires']; $s['nb_intervenants'] = (int)$s['nb_intervenants']; }
    json_out(200, ['ok' => true, 'items' => $l, 'modifiable' => $admin]);
}

if ($methode === 'POST') {
    $d = corps_json();
    $action = $d['action'] ?? null;
    if ($action === 'beneficiaire' || $action === 'intervenant') {          // rattachement : coordinateur
        if ($user['role'] !== 'coordinateur') json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
        $cible = (int)($d['id'] ?? 0);
        if ($action === 'beneficiaire') {
            $st = db()->prepare('SELECT COUNT(*) FROM beneficiaire WHERE id_beneficiaire = ?'); $st->execute([$cible]);
            if (!(int)$st->fetchColumn()) json_out(404, ['ok' => false, 'message' => 'Bénéficiaire introuvable.']);
            $s = (int)($d['id_secteur'] ?? 0);
            if ($s > 0 && !secteur_existe($s)) json_out(422, ['ok' => false, 'message' => 'Secteur introuvable.']);
            db()->prepare('UPDATE beneficiaire SET id_secteur = ?, date_modification = ? WHERE id_beneficiaire = ?')->execute([$s > 0 ? $s : null, date('Y-m-d'), $cible]);
            journaliser('modification', 'beneficiaire', 'secteur du bénéficiaire ' . $cible);
        } else {
            $st = db()->prepare('SELECT COUNT(*) FROM intervenant WHERE id_intervenant = ?'); $st->execute([$cible]);
            if (!(int)$st->fetchColumn()) json_out(404, ['ok' => false, 'message' => 'Intervenant introuvable.']);
            $ids = array_values(array_unique(array_filter(array_map('intval', (array)($d['secteurs'] ?? [])), function ($x) { return $x > 0; })));
            foreach ($ids as $s) if (!secteur_existe($s)) json_out(422, ['ok' => false, 'message' => 'Secteur introuvable.']);
            $pdo = db(); $pdo->beginTransaction();
            try {
                $pdo->prepare('DELETE FROM secteur_intervenant WHERE id_intervenant = ?')->execute([$cible]);
                $ins = $pdo->prepare('INSERT INTO secteur_intervenant (id_secteur, id_intervenant) VALUES (?, ?)');
                foreach ($ids as $s) $ins->execute([$s, $cible]);
                $pdo->commit();
            } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
            journaliser('modification', 'intervenant', 'secteurs de l\'intervenant ' . $cible . ' : ' . count($ids));
        }
        json_out(200, ['ok' => true]);
    }
    if (!$admin) json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);   // creation : administrateur
    $l = libelle_secteur($d);
    db()->prepare('INSERT INTO secteur (libelle) VALUES (?)')->execute([$l]);
    journaliser('creation', 'secteur', $l);
    json_out(201, ['ok' => true, 'id' => (int)db()->lastInsertId()]);
}

if (!$admin) json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
if ($id <= 0 || !secteur_existe($id)) json_out(404, ['ok' => false, 'message' => 'Secteur introuvable.']);

if ($methode === 'PUT') {
    $l = libelle_secteur(corps_json(), $id);
    db()->prepare('UPDATE secteur SET libelle = ? WHERE id_secteur = ?')->execute([$l, $id]);
    journaliser('modification', 'secteur', $l);
    json_out(200, ['ok' => true, 'id' => $id]);
}
if ($methode === 'DELETE') {
    $nb_b = db()->prepare('SELECT COUNT(*) FROM beneficiaire WHERE id_secteur = ?'); $nb_b->execute([$id]);
    $nb_i = db()->prepare('SELECT COUNT(*) FROM secteur_intervenant WHERE id_secteur = ?'); $nb_i->execute([$id]);
    $b = (int)$nb_b->fetchColumn(); $i = (int)$nb_i->fetchColumn();
    if ($b || $i) json_out(409, ['ok' => false, 'message' => "Ce secteur est encore utilisé ($b bénéficiaire(s), $i intervenant(s)) : retirez-le d'abord de leurs fiches."]);
    $st = db()->prepare('SELECT libelle FROM secteur WHERE id_secteur = ?'); $st->execute([$id]); $nom = $st->fetchColumn();
    db()->prepare('DELETE FROM secteur WHERE id_secteur = ?')->execute([$id]);
    journaliser('suppression', 'secteur', (string)$nom);
    json_out(200, ['ok' => true]);
}
header('Allow: GET, POST, PUT, DELETE');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
