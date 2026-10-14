<?php
// Dossier medical d'un beneficiaire : donnees de sante, acces strictement limite (et chaque consultation est journalisee).
//   GET dossier-medical.php?id_beneficiaire=3    -> {dossier: {...}|null, modifiable: bool}  (seuls les champs autorises pour votre role sont renvoyes)
//   PUT dossier-medical.php?id_beneficiaire=3    -> creation/mise a jour (coordinateur uniquement)
// Qui voit quoi :
//   coordinateur   tout, et modifie
//   intervenant    autonomie, allergies, traitements  - seulement pour un beneficiaire qu'il a (ou a eu) en intervention
//   beneficiaire   autonomie, allergies, pathologies, traitements (pas les observations internes) - seulement SON dossier
//   proche aidant  autonomie, allergies, traitements  - seulement si le beneficiaire lui a donne l'autorisation « medical »
//   les autres roles (dont l'administrateur, la facturation, la direction, la qualite, la maintenance) : refuse
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/interventions.php';
require __DIR__ . '/../includes/journal.php';

const NIVEAUX_AUTONOMIE = ['autonome', 'partielle', 'dependant'];
const CHAMPS_DOSSIER = ['niveau_autonomie', 'allergies', 'pathologies', 'traitements', 'observations'];
$VISIBLES = [
    'coordinateur'  => ['niveau_autonomie', 'allergies', 'pathologies', 'traitements', 'observations'],
    'intervenant'   => ['niveau_autonomie', 'allergies', 'traitements'],
    'beneficiaire'  => ['niveau_autonomie', 'allergies', 'pathologies', 'traitements'],
    'proche_aidant' => ['niveau_autonomie', 'allergies', 'traitements'],
];

$user = exiger_connexion(['coordinateur', 'intervenant', 'beneficiaire', 'proche_aidant']);
$id_b = (int)($_GET['id_beneficiaire'] ?? 0);
$refus = function () { json_out(403, ['ok' => false, 'message' => "Vous n'avez pas accès au dossier médical de cette personne."]); };
if ($id_b <= 0) $refus();

// --- Ce role a-t-il le droit pour CE beneficiaire ? ---
$role = $user['role'];
if ($role === 'intervenant') {
    $mon = intervenant_du_compte($user);
    $st = db()->prepare("SELECT COUNT(*) FROM intervention WHERE id_beneficiaire = ? AND id_intervenant = ? AND statut <> 'annulee'");
    $st->execute([$id_b, (int)$mon]);
    if ($mon === null || !(int)$st->fetchColumn()) $refus();
} elseif ($role === 'beneficiaire') {
    $st = db()->prepare('SELECT COUNT(*) FROM beneficiaire WHERE id_beneficiaire = ? AND id_utilisateur = ?');
    $st->execute([$id_b, $user['id']]);
    if (!(int)$st->fetchColumn()) $refus();
} elseif ($role === 'proche_aidant') {
    $st = db()->prepare('SELECT l.autorisations FROM lien_beneficiaire_aidant l JOIN proche_aidant a ON a.id_aidant = l.id_aidant
                         WHERE l.id_beneficiaire = ? AND a.id_utilisateur = ? AND a.actif = 1');
    $st->execute([$id_b, $user['id']]);
    $auto = $st->fetchColumn();
    if ($auto === false || !in_array('medical', explode(',', (string)$auto), true)) $refus();
} else {   // coordinateur : il doit seulement exister
    $st = db()->prepare('SELECT COUNT(*) FROM beneficiaire WHERE id_beneficiaire = ?'); $st->execute([$id_b]);
    if (!(int)$st->fetchColumn()) json_out(404, ['ok' => false, 'message' => 'Bénéficiaire introuvable.']);
}
$visibles = $VISIBLES[$role];
$methode = $_SERVER['REQUEST_METHOD'];

if ($methode === 'GET') {
    $st = db()->prepare('SELECT ' . implode(', ', $visibles) . ' FROM dossier_medical WHERE id_beneficiaire = ?');
    $st->execute([$id_b]);
    $d = $st->fetch() ?: null;
    journaliser('consultation', 'dossier_medical', 'bénéficiaire ' . $id_b);
    json_out(200, ['ok' => true, 'dossier' => $d, 'champs' => $visibles, 'modifiable' => $role === 'coordinateur', 'niveaux' => NIVEAUX_AUTONOMIE]);
}

if ($methode === 'PUT') {
    if ($role !== 'coordinateur') json_out(403, ['ok' => false, 'message' => 'Seul le coordinateur modifie le dossier médical.']);
    $d = corps_json();
    $v = []; $erreurs = [];
    foreach (CHAMPS_DOSSIER as $c) {
        if (!array_key_exists($c, $d)) continue;
        $val = trim((string)$d[$c]);
        if ($c === 'niveau_autonomie') {
            if ($val !== '' && !in_array($val, NIVEAUX_AUTONOMIE, true)) $erreurs[$c] = "Niveau d'autonomie inconnu.";
        } elseif (mb_strlen($val) > 2000) $erreurs[$c] = '2000 caractères maximum.';
        $v[$c] = $val === '' ? null : $val;
    }
    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    if (!$v) json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);
    $st = db()->prepare('SELECT COUNT(*) FROM dossier_medical WHERE id_beneficiaire = ?'); $st->execute([$id_b]);
    if ((int)$st->fetchColumn()) {
        $sets = implode(', ', array_map(function ($c) { return "$c = ?"; }, array_keys($v)));
        db()->prepare("UPDATE dossier_medical SET $sets WHERE id_beneficiaire = ?")->execute(array_merge(array_values($v), [$id_b]));
    } else {
        $v['id_beneficiaire'] = $id_b;
        db()->prepare('INSERT INTO dossier_medical (' . implode(', ', array_keys($v)) . ') VALUES (' . implode(', ', array_fill(0, count($v), '?')) . ')')->execute(array_values($v));
    }
    journaliser('modification', 'dossier_medical', 'bénéficiaire ' . $id_b . ' (' . implode(', ', array_intersect(CHAMPS_DOSSIER, array_keys($v))) . ')');
    json_out(200, ['ok' => true]);
}
header('Allow: GET, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
