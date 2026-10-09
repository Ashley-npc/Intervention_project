<?php
// API des intervenants (coordinateur et administrateur).
//   GET  intervenants.php?q=rakoto&tous=1   liste (tous=1 : inclut les désactivés)
//   GET  intervenants.php?id=2              une fiche + ses interventions
//   POST intervenants.php                   création
//   PUT  intervenants.php?id=2              modification (+ "inactif": true pour désactiver)
// Jamais de suppression : on désactive (actif = 0), l'historique des interventions est conservé.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/requetes.php';

exiger_connexion(['coordinateur', 'administrateur']);

$REGLES = [
    'nom'                         => ['libelle' => 'Le nom',                  'max' => 100, 'requis' => true],
    'prenom'                      => ['libelle' => 'Le prénom',               'max' => 100, 'requis' => true],
    'adresse'                     => ['libelle' => "L'adresse",               'max' => 255],
    'telephone'                   => ['libelle' => 'Le téléphone',            'type' => 'telephone'],
    'courriel'                    => ['libelle' => 'Le courriel',             'type' => 'courriel', 'max' => 150],
    'statut'                      => ['libelle' => 'Le statut',               'type' => 'choix', 'requis' => true,
                                      'options' => ['salarié', 'bénévole', 'prestataire']],
    'types_beneficiaires_preferes' => ['libelle' => 'Les bénéficiaires préférés', 'max' => 255],
    'horaires_preferes'           => ['libelle' => 'Les horaires préférés',   'max' => 255],
    'inactif'                     => ['libelle' => "L'état",                  'type' => 'booleen', 'defaut' => 0],
];
const CHAMPS_LECTURE = 'id_intervenant, nom, prenom, adresse, telephone, courriel, statut,
                        types_beneficiaires_preferes, horaires_preferes, actif';

function vers_front(array $l): array {
    $l['id'] = (int)$l['id_intervenant'];
    $l['inactif'] = !(bool)$l['actif'];
    unset($l['id_intervenant'], $l['actif']);
    return $l;
}
function vers_colonnes(array $v): array {
    if (array_key_exists('inactif', $v)) { $v['actif'] = $v['inactif'] ? 0 : 1; unset($v['inactif']); }
    return $v;
}

$methode = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($methode === 'GET') {
    if ($id > 0) {                                           // ----- une fiche
        $st = db()->prepare('SELECT ' . CHAMPS_LECTURE . ' FROM intervenant WHERE id_intervenant = ?');
        $st->execute([$id]);
        $l = $st->fetch();
        if (!$l) json_out(404, ['ok' => false, 'message' => 'Intervenant introuvable.']);
        [$interventions, $a_venir] = interventions_de('id_intervenant', $id);
        json_out(200, ['ok' => true, 'item' => vers_front($l), 'interventions' => $interventions, 'a_venir' => $a_venir]);
    }
    // ----- la liste
    $q = trim((string)($_GET['q'] ?? ''));
    $tous = ($_GET['tous'] ?? '') === '1';
    $where = []; $params = [];
    if (!$tous) $where[] = 'intervenant.actif = 1';
    if ($q !== '') {
        $where[] = '(intervenant.nom LIKE ? OR intervenant.prenom LIKE ?)';
        array_push($params, "%$q%", "%$q%");
    }
    $sql = 'SELECT intervenant.id_intervenant, intervenant.nom, intervenant.prenom, intervenant.statut,
                   intervenant.telephone, intervenant.actif,
                   (SELECT COUNT(*) FROM intervention WHERE intervention.id_intervenant = intervenant.id_intervenant) AS nb_interventions
            FROM intervenant'
         . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
         . ' ORDER BY intervenant.nom, intervenant.prenom LIMIT 500';
    $st = db()->prepare($sql);
    $st->execute($params);
    json_out(200, ['ok' => true, 'items' => array_map('vers_front', $st->fetchAll())]);
}

if ($methode === 'POST') {                                   // ----- création
    [$v, $erreurs] = valider(corps_json(), $REGLES, true);
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    $v = vers_colonnes($v);
    $v['date_creation'] = $v['date_modification'] = date('Y-m-d');
    $colonnes = array_keys($v);
    db()->prepare('INSERT INTO intervenant (' . implode(', ', $colonnes) . ') VALUES (' . implode(', ', array_fill(0, count($colonnes), '?')) . ')')
        ->execute(array_values($v));
    json_out(201, ['ok' => true, 'id' => (int)db()->lastInsertId()]);
}

if ($methode === 'PUT') {                                    // ----- modification
    if ($id <= 0) json_out(400, ['ok' => false, 'message' => 'Identifiant manquant.']);
    $st = db()->prepare('SELECT id_intervenant FROM intervenant WHERE id_intervenant = ?');
    $st->execute([$id]);
    if (!$st->fetch()) json_out(404, ['ok' => false, 'message' => 'Intervenant introuvable.']);

    [$v, $erreurs] = valider(corps_json(), $REGLES, false);
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    if (!$v) json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);
    $v = vers_colonnes($v);
    $v['date_modification'] = date('Y-m-d');
    $sets = implode(', ', array_map(function ($c) { return "$c = ?"; }, array_keys($v)));
    db()->prepare("UPDATE intervenant SET $sets WHERE id_intervenant = ?")->execute(array_merge(array_values($v), [$id]));
    json_out(200, ['ok' => true, 'id' => $id]);
}

header('Allow: GET, POST, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
