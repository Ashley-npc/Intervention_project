<?php
// API des bénéficiaires (coordinateur et administrateur).
//   GET  beneficiaires.php?q=dupont&tous=1   liste (tous=1 : inclut les archivés)
//   GET  beneficiaires.php?id=3              une fiche + ses interventions
//   POST beneficiaires.php                   création            corps : champs du bénéficiaire
//   PUT  beneficiaires.php?id=3              modification        corps : champs à changer (+ "inactif": true pour archiver)
// Jamais de suppression : on archive.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/requetes.php';

exiger_connexion(['coordinateur', 'administrateur']);

$REGLES = [
    'nom'                 => ['libelle' => 'Le nom',                 'max' => 100, 'requis' => true],
    'prenom'              => ['libelle' => 'Le prénom',              'max' => 100, 'requis' => true],
    'date_naissance'      => ['libelle' => 'La date de naissance',   'type' => 'date', 'requis' => true, 'pas_futur' => true],
    'sexe'                => ['libelle' => 'Le sexe',                'type' => 'choix', 'options' => ['F', 'M']],
    'adresse'             => ['libelle' => "L'adresse",              'max' => 255, 'requis' => true],
    'telephone'           => ['libelle' => 'Le téléphone',           'type' => 'telephone'],
    'courriel'            => ['libelle' => 'Le courriel',            'type' => 'courriel', 'max' => 150],
    'numero_dossier'      => ['libelle' => 'Le numéro de dossier',   'max' => 30, 'requis_si_present' => true],
    'situation_familiale' => ['libelle' => 'La situation familiale', 'max' => 50],
    'horaires_preferes'   => ['libelle' => 'Les horaires préférés',  'max' => 255],
    'habitudes'           => ['libelle' => 'Les habitudes',          'max' => 2000],
    'animaux'             => ['libelle' => 'Les animaux',            'max' => 255],
    'acces_domicile'      => ['libelle' => "L'accès au domicile",    'max' => 255],
    'inactif'             => ['libelle' => "L'état",                 'type' => 'booleen', 'defaut' => 0],
];
const CHAMPS_LECTURE = 'id_beneficiaire, numero_dossier, nom, prenom, date_naissance, sexe, adresse, telephone, courriel,
                        situation_familiale, horaires_preferes, habitudes, animaux, acces_domicile, archive';

// Ligne de la base -> objet envoyé au front (id + inactif uniformes pour toutes les ressources).
function vers_front(array $l): array {
    $l['id'] = (int)$l['id_beneficiaire'];
    $l['inactif'] = (bool)$l['archive'];
    unset($l['id_beneficiaire'], $l['archive']);
    return $l;
}
// Valeurs validées -> colonnes de la table.
function vers_colonnes(array $v): array {
    if (array_key_exists('inactif', $v)) { $v['archive'] = (int)$v['inactif']; unset($v['inactif']); }
    return $v;
}
// Prochain numéro de dossier libre : D-0001, D-0002…
function prochain_numero_dossier(): string {
    $max = 0;
    foreach (db()->query('SELECT numero_dossier FROM beneficiaire')->fetchAll() as $r) {
        if (preg_match('/^D-(\d+)$/', $r['numero_dossier'], $m)) $max = max($max, (int)$m[1]);
    }
    return sprintf('D-%04d', $max + 1);
}
function reponse_doublon(): void {
    json_out(409, ['ok' => false, 'message' => 'Ce numéro de dossier est déjà utilisé.',
                   'erreurs' => ['numero_dossier' => 'Ce numéro de dossier est déjà utilisé.']]);
}

$methode = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($methode === 'GET') {
    if ($id > 0) {                                           // ----- une fiche
        $st = db()->prepare('SELECT ' . CHAMPS_LECTURE . ' FROM beneficiaire WHERE id_beneficiaire = ?');
        $st->execute([$id]);
        $l = $st->fetch();
        if (!$l) json_out(404, ['ok' => false, 'message' => 'Bénéficiaire introuvable.']);
        [$interventions, $a_venir] = interventions_de('id_beneficiaire', $id);
        json_out(200, ['ok' => true, 'item' => vers_front($l), 'interventions' => $interventions, 'a_venir' => $a_venir]);
    }
    // ----- la liste
    $q = trim((string)($_GET['q'] ?? ''));
    $tous = ($_GET['tous'] ?? '') === '1';
    $where = []; $params = [];
    if (!$tous) $where[] = 'beneficiaire.archive = 0';
    if ($q !== '') {
        $where[] = '(beneficiaire.nom LIKE ? OR beneficiaire.prenom LIKE ? OR beneficiaire.numero_dossier LIKE ?)';
        array_push($params, "%$q%", "%$q%", "%$q%");
    }
    $sql = 'SELECT beneficiaire.id_beneficiaire, beneficiaire.numero_dossier, beneficiaire.nom, beneficiaire.prenom,
                   beneficiaire.date_naissance, beneficiaire.telephone, beneficiaire.adresse, beneficiaire.archive,
                   (SELECT COUNT(*) FROM intervention WHERE intervention.id_beneficiaire = beneficiaire.id_beneficiaire) AS nb_interventions
            FROM beneficiaire'
         . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
         . ' ORDER BY beneficiaire.nom, beneficiaire.prenom LIMIT 500';
    $st = db()->prepare($sql);
    $st->execute($params);
    $items = array_map('vers_front', $st->fetchAll());
    json_out(200, ['ok' => true, 'items' => $items]);
}

if ($methode === 'POST') {                                   // ----- création
    [$v, $erreurs] = valider(corps_json(), $REGLES, true);
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    if (($v['numero_dossier'] ?? null) === null) $v['numero_dossier'] = prochain_numero_dossier();
    $v = vers_colonnes($v);
    $v['date_creation'] = $v['date_modification'] = date('Y-m-d');
    $colonnes = array_keys($v);
    try {
        db()->prepare('INSERT INTO beneficiaire (' . implode(', ', $colonnes) . ') VALUES (' . implode(', ', array_fill(0, count($colonnes), '?')) . ')')
            ->execute(array_values($v));
    } catch (PDOException $e) {
        if (est_doublon($e)) reponse_doublon();
        throw $e;
    }
    json_out(201, ['ok' => true, 'id' => (int)db()->lastInsertId()]);
}

if ($methode === 'PUT') {                                    // ----- modification
    if ($id <= 0) json_out(400, ['ok' => false, 'message' => 'Identifiant manquant.']);
    $st = db()->prepare('SELECT id_beneficiaire FROM beneficiaire WHERE id_beneficiaire = ?');
    $st->execute([$id]);
    if (!$st->fetch()) json_out(404, ['ok' => false, 'message' => 'Bénéficiaire introuvable.']);

    [$v, $erreurs] = valider(corps_json(), $REGLES, false);
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    if (!$v) json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);
    $v = vers_colonnes($v);
    $v['date_modification'] = date('Y-m-d');
    $sets = implode(', ', array_map(function ($c) { return "$c = ?"; }, array_keys($v)));
    try {
        db()->prepare("UPDATE beneficiaire SET $sets WHERE id_beneficiaire = ?")->execute(array_merge(array_values($v), [$id]));
    } catch (PDOException $e) {
        if (est_doublon($e)) reponse_doublon();
        throw $e;
    }
    json_out(200, ['ok' => true, 'id' => $id]);
}

header('Allow: GET, POST, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
