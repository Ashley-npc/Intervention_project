<?php
// Absences des intervenants (conge, formation, arret maladie...) et des beneficiaires (hospitalisation, voyage, refus...).
//   GET  absences.php[?du=&au=&cible=intervenant|beneficiaire&id_intervenant=&id_beneficiaire=&annulees=1]   liste (+ interventions impactees)
//   GET  absences.php?etat=1[&du=&au=]                    etat des absences et taux d'absenteisme (coordinateur)
//   GET  absences.php?remplacants=<id_intervention>        remplacants possibles (coordinateur)
//   POST absences.php                                      declarer une absence
//   PUT  absences.php?id=3                                 modifier, ou {"annuler": true}
// Coordinateur : tout. Intervenant : SES absences. Beneficiaire : SES absences.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/notifications.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/interventions.php';
require __DIR__ . '/../includes/disponibilites.php';
require __DIR__ . '/../includes/referentiels.php';

$user = exiger_connexion(['coordinateur', 'intervenant', 'beneficiaire']);
$gestion = $user['role'] === 'coordinateur';
$mon_intervenant = $user['role'] === 'intervenant' ? intervenant_du_compte($user) : null;
$mon_beneficiaire = null;
if ($user['role'] === 'beneficiaire') {
    $st = db()->prepare('SELECT id_beneficiaire FROM beneficiaire WHERE id_utilisateur = ? AND archive = 0'); $st->execute([$user['id']]);
    $x = $st->fetchColumn(); $mon_beneficiaire = $x === false ? null : (int)$x;
}
if ($user['role'] === 'intervenant' && $mon_intervenant === null) json_out(403, ['ok' => false, 'message' => "Ce compte n'est lié à aucune fiche intervenant."]);
if ($user['role'] === 'beneficiaire' && $mon_beneficiaire === null) json_out(403, ['ok' => false, 'message' => "Ce compte n'est lié à aucune fiche bénéficiaire."]);

const SELECT_ABSENCE = 'SELECT a.*, v.nom AS v_nom, v.prenom AS v_prenom, b.nom AS b_nom, b.prenom AS b_prenom, u.identifiant AS declarant
    FROM absence a LEFT JOIN intervenant v ON v.id_intervenant = a.id_intervenant LEFT JOIN beneficiaire b ON b.id_beneficiaire = a.id_beneficiaire
    LEFT JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur';

function absence_vers_front(array $a, bool $avec_impact = true): array {
    $f = ['id' => (int)$a['id_absence'], 'cible' => $a['id_intervenant'] !== null ? 'intervenant' : 'beneficiaire',
          'id_intervenant' => $a['id_intervenant'] !== null ? (int)$a['id_intervenant'] : null,
          'id_beneficiaire' => $a['id_beneficiaire'] !== null ? (int)$a['id_beneficiaire'] : null,
          'nom' => $a['id_intervenant'] !== null ? $a['v_prenom'] . ' ' . $a['v_nom'] : $a['b_prenom'] . ' ' . $a['b_nom'],
          'motif' => $a['motif'], 'date_debut' => $a['date_debut'], 'date_fin' => $a['date_fin'], 'commentaire' => $a['commentaire'],
          'justificatif' => $a['justificatif'], 'annulee' => (bool)$a['annulee'], 'declarant' => $a['declarant'], 'impactees' => 0];
    if ($avec_impact && !$f['annulee']) $f['impactees'] = count(interventions_impactees($a));
    return $f;
}
function lire_absence(int $id): ?array { $st = db()->prepare(SELECT_ABSENCE . ' WHERE a.id_absence = ?'); $st->execute([$id]); return $st->fetch() ?: null; }
function peut_voir(array $a): bool {
    global $gestion, $mon_intervenant, $mon_beneficiaire;
    return $gestion || ($mon_intervenant !== null && (int)$a['id_intervenant'] === $mon_intervenant) || ($mon_beneficiaire !== null && (int)$a['id_beneficiaire'] === $mon_beneficiaire);
}
function jours_entre(string $d1, string $d2): int { return (int)round((strtotime($d2) - strtotime($d1)) / 86400) + 1; }

$methode = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($methode === 'GET') {
    // ----- remplacants d'une intervention
    if (isset($_GET['remplacants'])) {
        if (!$gestion) json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
        $st = db()->prepare(SELECT_INTERVENTION . ' WHERE i.id_intervention = ?'); $st->execute([(int)$_GET['remplacants']]);
        $l = $st->fetch();
        if (!$l) json_out(404, ['ok' => false, 'message' => 'Intervention introuvable.']);
        json_out(200, ['ok' => true, 'items' => remplacants_possibles(intervention_vers_front($l))]);
    }
    // ----- etat des absences
    if (isset($_GET['etat'])) {
        if (!$gestion) json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);
        $du = $_GET['du'] ?? date('Y-m-01'); $au = $_GET['au'] ?? date('Y-m-t');
        foreach ([$du, $au] as $d) { $o = DateTime::createFromFormat('!Y-m-d', $d); if (!$o || $o->format('Y-m-d') !== $d) json_out(400, ['ok' => false, 'message' => 'Période invalide.']); }
        if ($du > $au) json_out(400, ['ok' => false, 'message' => 'Période invalide.']);
        $st = db()->prepare(SELECT_ABSENCE . ' WHERE a.annulee = 0 AND a.date_debut <= ? AND a.date_fin >= ? ORDER BY a.date_debut'); $st->execute([$au, $du]);
        $motifs = []; $personnes = []; $jours_interv = 0; $jours_benef = 0;
        foreach ($st->fetchAll() as $a) {
            $j = jours_entre(max($a['date_debut'], $du), min($a['date_fin'], $au));
            $est_v = $a['id_intervenant'] !== null;
            $cle = ($est_v ? 'i' : 'b') . $a['motif'];
            $motifs[$cle] = $motifs[$cle] ?? ['cible' => $est_v ? 'intervenant' : 'beneficiaire', 'motif' => $a['motif'], 'nb' => 0, 'jours' => 0];
            $motifs[$cle]['nb']++; $motifs[$cle]['jours'] += $j;
            $nom = $est_v ? $a['v_prenom'] . ' ' . $a['v_nom'] : $a['b_prenom'] . ' ' . $a['b_nom'];
            $pk = ($est_v ? 'i' : 'b') . ($est_v ? $a['id_intervenant'] : $a['id_beneficiaire']);
            $personnes[$pk] = $personnes[$pk] ?? ['cible' => $est_v ? 'intervenant' : 'beneficiaire', 'nom' => $nom, 'nb' => 0, 'jours' => 0];
            $personnes[$pk]['nb']++; $personnes[$pk]['jours'] += $j;
            if ($est_v) $jours_interv += $j; else $jours_benef += $j;
        }
        $effectif = (int)db()->query('SELECT COUNT(*) FROM intervenant WHERE actif = 1')->fetchColumn();
        $capacite = $effectif * jours_entre($du, $au);
        usort($personnes, function ($a, $b) { return $b['jours'] <=> $a['jours']; });
        json_out(200, ['ok' => true, 'du' => $du, 'au' => $au, 'par_motif' => array_values($motifs), 'par_personne' => $personnes,
                       'jours_intervenants' => $jours_interv, 'jours_beneficiaires' => $jours_benef, 'effectif' => $effectif,
                       'taux_absenteisme' => $capacite ? round(100 * $jours_interv / $capacite, 1) : 0]);
    }
    // ----- une absence
    if ($id > 0) {
        $a = lire_absence($id);
        if (!$a || !peut_voir($a)) json_out(404, ['ok' => false, 'message' => 'Absence introuvable.']);
        json_out(200, ['ok' => true, 'item' => absence_vers_front($a), 'impactees' => $a['annulee'] ? [] : interventions_impactees($a)]);
    }
    // ----- liste
    $where = []; $params = [];
    if (!empty($_GET['du'])) { $where[] = 'a.date_fin >= ?'; $params[] = $_GET['du']; }
    if (!empty($_GET['au'])) { $where[] = 'a.date_debut <= ?'; $params[] = $_GET['au']; }
    if (empty($_GET['annulees'])) $where[] = 'a.annulee = 0';
    if ($mon_intervenant !== null) { $where[] = 'a.id_intervenant = ?'; $params[] = $mon_intervenant; }
    elseif ($mon_beneficiaire !== null) { $where[] = 'a.id_beneficiaire = ?'; $params[] = $mon_beneficiaire; }
    else {
        if (($_GET['cible'] ?? '') === 'intervenant') $where[] = 'a.id_intervenant IS NOT NULL';
        if (($_GET['cible'] ?? '') === 'beneficiaire') $where[] = 'a.id_beneficiaire IS NOT NULL';
        if ((int)($_GET['id_intervenant'] ?? 0) > 0) { $where[] = 'a.id_intervenant = ?'; $params[] = (int)$_GET['id_intervenant']; }
        if ((int)($_GET['id_beneficiaire'] ?? 0) > 0) { $where[] = 'a.id_beneficiaire = ?'; $params[] = (int)$_GET['id_beneficiaire']; }
    }
    $st = db()->prepare(SELECT_ABSENCE . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY a.date_debut DESC, a.id_absence DESC LIMIT 200');
    $st->execute($params);
    $items = array_map('absence_vers_front', $st->fetchAll());
    $reponse = ['ok' => true, 'items' => $items, 'motifs_intervenant' => referentiel_valeurs('motif_absence_intervenant', MOTIFS_ABSENCE_INTERVENANT), 'motifs_beneficiaire' => referentiel_valeurs('motif_absence_beneficiaire', MOTIFS_ABSENCE_BENEFICIAIRE),
                'role' => $user['role']];
    if ($gestion) {
        $reponse['intervenants'] = db()->query('SELECT id_intervenant AS id, nom, prenom FROM intervenant WHERE actif = 1 ORDER BY nom, prenom')->fetchAll();
        $reponse['beneficiaires'] = db()->query('SELECT id_beneficiaire AS id, nom, prenom FROM beneficiaire WHERE archive = 0 ORDER BY nom, prenom')->fetchAll();
    }
    json_out(200, $reponse);
}

if ($methode !== 'POST' && $methode !== 'PUT') { header('Allow: GET, POST, PUT'); json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']); }

$d = corps_json();
$creation = $methode === 'POST';
$actuelle = null;
if (!$creation) {
    if ($id <= 0) json_out(400, ['ok' => false, 'message' => 'Identifiant manquant.']);
    $actuelle = lire_absence($id);
    if (!$actuelle || !peut_voir($actuelle)) json_out(404, ['ok' => false, 'message' => 'Absence introuvable.']);
}

// ----- annulation
if (!$creation && !empty($d['annuler'])) {
    db()->prepare('UPDATE absence SET annulee = 1 WHERE id_absence = ?')->execute([$id]);
    journaliser('annulation', 'absence', 'absence ' . $id . ' (' . trim(($actuelle['v_prenom'] ?? $actuelle['b_prenom']) . ' ' . ($actuelle['v_nom'] ?? $actuelle['b_nom'])) . ')');
    if (!$gestion) notifier(utilisateurs_du_role(['coordinateur']), 'Absence annulée : ' . trim(($actuelle['v_prenom'] ?? $actuelle['b_prenom']) . ' ' . ($actuelle['v_nom'] ?? $actuelle['b_nom'])) . ' (du ' . date_fr_courte($actuelle['date_debut']) . ' au ' . date_fr_courte($actuelle['date_fin']) . ').');
    json_out(200, ['ok' => true, 'id' => $id]);
}

// ----- qui est concerne ?
$id_v = $actuelle ? $actuelle['id_intervenant'] : null;
$id_b = $actuelle ? $actuelle['id_beneficiaire'] : null;
$erreurs = [];
if ($creation) {
    if ($mon_intervenant !== null) $id_v = $mon_intervenant;
    elseif ($mon_beneficiaire !== null) $id_b = $mon_beneficiaire;
    else {
        $cible = $d['cible'] ?? '';
        if ($cible === 'intervenant') {
            $id_v = (int)($d['id_intervenant'] ?? 0);
            $st = db()->prepare('SELECT COUNT(*) FROM intervenant WHERE id_intervenant = ? AND actif = 1'); $st->execute([$id_v]);
            if (!(int)$st->fetchColumn()) $erreurs['id_personne'] = "Choisissez l'intervenant.";
        } elseif ($cible === 'beneficiaire') {
            $id_b = (int)($d['id_beneficiaire'] ?? 0);
            $st = db()->prepare('SELECT COUNT(*) FROM beneficiaire WHERE id_beneficiaire = ? AND archive = 0'); $st->execute([$id_b]);
            if (!(int)$st->fetchColumn()) $erreurs['id_personne'] = 'Choisissez le bénéficiaire.';
        } else $erreurs['cible'] = 'Indiquez qui est absent.';
    }
}
$est_intervenant = $id_v !== null;
$motifs = $est_intervenant ? referentiel_valeurs('motif_absence_intervenant', MOTIFS_ABSENCE_INTERVENANT) : referentiel_valeurs('motif_absence_beneficiaire', MOTIFS_ABSENCE_BENEFICIAIRE);
[$v, $e2] = valider($d, [
    'motif'       => ['libelle' => 'Le motif', 'type' => 'choix', 'requis' => true, 'options' => $motifs],
    'date_debut'  => ['libelle' => 'La date de début', 'type' => 'date', 'requis' => true],
    'date_fin'    => ['libelle' => 'La date de fin', 'type' => 'date', 'requis' => true],
    'commentaire' => ['libelle' => 'Le commentaire', 'max' => 500],
    'justificatif' => ['libelle' => 'Le justificatif', 'max' => 255],
], $creation);
$erreurs += $e2;
$debut = $v['date_debut'] ?? $actuelle['date_debut'] ?? null; $fin = $v['date_fin'] ?? $actuelle['date_fin'] ?? null;
if ($debut && $fin && !isset($erreurs['date_fin'])) {
    if ($fin < $debut) $erreurs['date_fin'] = 'La date de fin doit être après la date de début.';
    elseif (jours_entre($debut, $fin) > 366) $erreurs['date_fin'] = "Une absence ne peut pas dépasser un an.";
}
if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
if (!$creation && !$v) json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);

// Pas deux absences qui se chevauchent pour la meme personne.
$col = $est_intervenant ? 'id_intervenant' : 'id_beneficiaire'; $pid = $est_intervenant ? $id_v : $id_b;
$st = db()->prepare("SELECT date_debut, date_fin FROM absence WHERE $col = ? AND annulee = 0 AND date_debut <= ? AND date_fin >= ? AND id_absence <> ? LIMIT 1");
$st->execute([$pid, $fin, $debut, $id]);
if ($autre = $st->fetch()) json_out(409, ['ok' => false, 'message' => 'Une absence est déjà enregistrée du ' . date_fr_courte($autre['date_debut']) . ' au ' . date_fr_courte($autre['date_fin']) . '.', 'erreurs' => ['date_debut' => 'Période déjà couverte.']]);

if ($creation) {
    db()->prepare('INSERT INTO absence (id_intervenant, id_beneficiaire, motif, planifiee, date_debut, date_fin, commentaire, justificatif, annulee, id_utilisateur, date_creation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)')
        ->execute([$id_v, $id_b, $v['motif'], $v['motif'] === 'imprevue' ? 0 : 1, $debut, $fin, $v['commentaire'], $v['justificatif'], $user['id'], date('Y-m-d H:i:s')]);
    $id = (int)db()->lastInsertId();
} else {
    if (isset($v['motif'])) $v['planifiee'] = $v['motif'] === 'imprevue' ? 0 : 1;
    $sets = implode(', ', array_map(function ($c) { return "$c = ?"; }, array_keys($v)));
    db()->prepare("UPDATE absence SET $sets WHERE id_absence = ?")->execute(array_merge(array_values($v), [$id]));
}
$a = lire_absence($id);
$f = absence_vers_front($a);
$impactees = interventions_impactees($a);
journaliser($creation ? 'creation' : 'modification', 'absence', $f['nom'] . ' : ' . motif_lisible($a['motif']) . ' du ' . date_fr_courte($a['date_debut']) . ' au ' . date_fr_courte($a['date_fin']));

// Notifications : le coordinateur est prevenu quand la personne declare elle-meme ; la personne est prevenue quand le coordinateur declare pour elle.
$texte = ($creation ? 'Absence déclarée' : 'Absence modifiée') . ' : ' . $f['nom'] . ' (' . motif_lisible($a['motif']) . ') du ' . date_fr_courte($a['date_debut']) . ' au ' . date_fr_courte($a['date_fin']) .
         ($impactees ? ' - ' . count($impactees) . ' intervention(s) à réaffecter.' : '.');
if (!$gestion) notifier(utilisateurs_du_role(['coordinateur']), $texte, null, count($impactees) > 0);
else {
    $st = $est_intervenant ? db()->prepare('SELECT id_utilisateur FROM intervenant WHERE id_intervenant = ?') : db()->prepare('SELECT id_utilisateur FROM beneficiaire WHERE id_beneficiaire = ?');
    $st->execute([$pid]); $uid = $st->fetchColumn();
    if ($uid) notifier([(int)$uid], $texte);
}
json_out($creation ? 201 : 200, ['ok' => true, 'id' => $id, 'impactees' => $impactees]);
