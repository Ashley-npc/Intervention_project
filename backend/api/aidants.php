<?php
// Proches aidants (coordinateur). Même contrat que beneficiaires.php / intervenants.php.
//   GET aidants.php[?q=&tous=1] | GET aidants.php?id=3 (+ bénéficiaires liés) | POST | PUT ?id= (inactif:true pour désactiver)
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/pagination.php';

exiger_connexion(['coordinateur']);
$REGLES = [
    'nom'                      => ['libelle' => 'Le nom',     'max' => 100, 'requis' => true],
    'prenom'                   => ['libelle' => 'Le prénom',  'max' => 100, 'requis' => true],
    'adresse'                  => ['libelle' => "L'adresse",  'max' => 255],
    'telephone'                => ['libelle' => 'Le téléphone', 'type' => 'telephone'],
    'courriel'                 => ['libelle' => 'Le courriel',  'type' => 'courriel', 'max' => 150],
    'preference_communication' => ['libelle' => 'La préférence', 'type' => 'choix', 'options' => ['courriel', 'sms', 'appel']],
    'inactif'                  => ['libelle' => "L'état", 'type' => 'booleen', 'defaut' => 0],
];
const CHAMPS = 'id_aidant, nom, prenom, adresse, telephone, courriel, preference_communication, actif';
function vers_front(array $l): array {
    $l['id'] = (int)$l['id_aidant']; $l['inactif'] = !(bool)$l['actif']; unset($l['id_aidant'], $l['actif']); return $l;
}
function vers_colonnes(array $v): array {
    if (array_key_exists('inactif', $v)) { $v['actif'] = $v['inactif'] ? 0 : 1; unset($v['inactif']); } return $v;
}
$methode = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($methode === 'GET') {
    if ($id > 0) {
        $st = db()->prepare('SELECT ' . CHAMPS . ' FROM proche_aidant WHERE id_aidant = ?'); $st->execute([$id]);
        $l = $st->fetch();
        if (!$l) json_out(404, ['ok' => false, 'message' => 'Proche aidant introuvable.']);
        $st = db()->prepare('SELECT b.id_beneficiaire AS id, b.nom, b.prenom, l.lien_parente, l.autorisations FROM lien_beneficiaire_aidant l
                             JOIN beneficiaire b ON b.id_beneficiaire = l.id_beneficiaire WHERE l.id_aidant = ? ORDER BY b.nom');
        $st->execute([$id]);
        json_out(200, ['ok' => true, 'item' => vers_front($l), 'beneficiaires_lies' => $st->fetchAll()]);
    }
    $q = trim((string)($_GET['q'] ?? '')); $where = []; $params = [];
    $etat = (string)($_GET['statut_actif'] ?? (($_GET['tous'] ?? '') === '1' ? 'tous' : 'actif'));
    if ($etat === 'actif') $where[] = 'actif = 1'; elseif ($etat === 'inactif') $where[] = 'actif = 0';
    if ($q !== '') { $where[] = '(nom LIKE ? OR prenom LIKE ?)'; array_push($params, "%$q%", "%$q%"); }
    [$page, $taille] = params_page();
    $ordre = ordre_tri(['nom' => 'nom'], 'nom', 'asc', 'prenom');
    [$lignes, $meta] = lire_page(
        'id_aidant, nom, prenom, telephone, courriel, preference_communication, actif,
         (SELECT COUNT(*) FROM lien_beneficiaire_aidant l WHERE l.id_aidant = proche_aidant.id_aidant) AS nb_beneficiaires',
        'FROM proche_aidant' . ($where ? ' WHERE ' . implode(' AND ', $where) : ''), $params, $ordre, $page, $taille);
    json_out(200, ['ok' => true, 'items' => array_map('vers_front', $lignes), 'meta' => $meta]);
}
if ($methode === 'POST') {
    [$v, $erreurs] = valider(corps_json(), $REGLES, true);
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    $v = vers_colonnes($v); $cols = array_keys($v);
    db()->prepare('INSERT INTO proche_aidant (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')')->execute(array_values($v));
    json_out(201, ['ok' => true, 'id' => (int)db()->lastInsertId()]);
}
if ($methode === 'PUT') {
    if ($id <= 0) json_out(400, ['ok' => false, 'message' => 'Identifiant manquant.']);
    $st = db()->prepare('SELECT 1 FROM proche_aidant WHERE id_aidant = ?'); $st->execute([$id]);
    if (!$st->fetchColumn()) json_out(404, ['ok' => false, 'message' => 'Proche aidant introuvable.']);
    [$v, $erreurs] = valider(corps_json(), $REGLES, false);
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    if (!$v) json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);
    $v = vers_colonnes($v);
    $sets = implode(', ', array_map(function ($c) { return "$c = ?"; }, array_keys($v)));
    db()->prepare("UPDATE proche_aidant SET $sets WHERE id_aidant = ?")->execute(array_merge(array_values($v), [$id]));
    json_out(200, ['ok' => true, 'id' => $id]);
}
header('Allow: GET, POST, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
