<?php
// API des interventions.
//   GET  interventions.php?du=2026-10-05&au=2026-10-11[&id_intervenant=1][&id_beneficiaire=2]   planning d'une période
//   GET  interventions.php?id=4                                                                  une intervention (+ bénéficiaire, compte rendu)
//   POST interventions.php                                                                       création (vérifie les chevauchements)
//   PUT  interventions.php?id=4                                                                  modification / annulation (interdite si validée)
// Coordinateur et administrateur : tout. Intervenant : lecture de SES interventions uniquement.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/notifications.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/interventions.php';

$user = exiger_connexion(['coordinateur', 'administrateur', 'intervenant']);
$est_intervenant = $user['role'] === 'intervenant';
$mon_id = null;
if ($est_intervenant) {
    $mon_id = intervenant_du_compte($user);
    if ($mon_id === null) json_out(403, ['ok' => false, 'message' => "Ce compte n'est lié à aucune fiche intervenant."]);
}

$REGLES = [
    'date'              => ['libelle' => 'La date',          'type' => 'date',  'requis' => true],
    'heure_debut'       => ['libelle' => "L'heure de début", 'type' => 'heure', 'requis' => true],
    'heure_fin'         => ['libelle' => "L'heure de fin",   'type' => 'heure', 'requis' => true],
    'type'              => ['libelle' => 'Le type',          'type' => 'choix', 'requis' => true, 'options' => TYPES_INTERVENTION],
    'lieu'              => ['libelle' => 'Le lieu',          'type' => 'choix', 'options' => ['domicile', 'exterieur'], 'defaut' => 'domicile'],
    'adresse_exterieur' => ['libelle' => "L'adresse",        'max' => 255],
    'urgente'           => ['libelle' => "L'urgence",        'type' => 'booleen', 'defaut' => 0],
    'statut'            => ['libelle' => 'Le statut',        'type' => 'choix', 'options' => STATUTS_INTERVENTION, 'defaut' => 'planifiee'],
];

function lire_intervention(int $id): ?array {
    $st = db()->prepare(SELECT_INTERVENTION . ' WHERE i.id_intervention = ?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}
function id_valide(array $donnees, string $cle, string $table, string $colonne_actif, array &$erreurs, string $libelle): int {
    $id = (int)($donnees[$cle] ?? 0);
    if ($id <= 0) { $erreurs[$cle] = "$libelle est obligatoire."; return 0; }
    $st = db()->prepare("SELECT $colonne_actif FROM $table WHERE id_" . ($table === 'beneficiaire' ? 'beneficiaire' : 'intervenant') . ' = ?');
    $st->execute([$id]);
    $actif = $st->fetchColumn();
    if ($actif === false) { $erreurs[$cle] = "$libelle est introuvable."; return 0; }
    // beneficiaire.archive = 1 -> inactif ; intervenant.actif = 0 -> inactif
    $inactif = $table === 'beneficiaire' ? (int)$actif === 1 : (int)$actif === 0;
    if ($inactif) { $erreurs[$cle] = "$libelle est " . ($table === 'beneficiaire' ? 'archivé.' : 'désactivé.'); return 0; }
    return $id;
}
function reponse_conflit(array $messages): void {
    json_out(409, ['ok' => false, 'message' => 'Chevauchement d\'horaires : ' . implode(' ', $messages), 'conflits' => $messages]);
}

$methode = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($methode === 'GET') {
    if ($id > 0) {                                              // ----- une intervention
        $l = lire_intervention($id);
        if (!$l || ($est_intervenant && (int)$l['id_intervenant'] !== $mon_id)) json_out(404, ['ok' => false, 'message' => 'Intervention introuvable.']);
        $reponse = ['ok' => true, 'item' => intervention_vers_front($l)];
        $st = db()->prepare('SELECT nom, prenom, adresse, telephone, acces_domicile, habitudes, animaux, horaires_preferes
                             FROM beneficiaire WHERE id_beneficiaire = ?');
        $st->execute([$l['id_beneficiaire']]);
        $reponse['beneficiaire'] = $st->fetch();
        $st = db()->prepare('SELECT id_compte_rendu, date_saisie, duree_reelle, actes_realises, observations, etat_beneficiaire, valide_par_coordinateur
                             FROM compte_rendu WHERE id_intervention = ?');
        $st->execute([$id]);
        $cr = $st->fetch();
        if ($cr) $cr['valide_par_coordinateur'] = (bool)$cr['valide_par_coordinateur'];
        $reponse['compte_rendu'] = $cr ?: null;
        json_out(200, $reponse);
    }
    // ----- planning d'une période (par défaut : la semaine en cours)
    $du = $_GET['du'] ?? date('Y-m-d', strtotime('monday this week'));
    $au = $_GET['au'] ?? date('Y-m-d', strtotime('sunday this week'));
    foreach ([$du, $au] as $d) { $o = DateTime::createFromFormat('!Y-m-d', $d); if (!$o || $o->format('Y-m-d') !== $d) json_out(400, ['ok' => false, 'message' => 'Période invalide.']); }
    if ($du > $au) json_out(400, ['ok' => false, 'message' => 'Période invalide.']);
    $where = ['i.date >= ?', 'i.date <= ?']; $params = [$du, $au];
    $f_interv = $est_intervenant ? $mon_id : (int)($_GET['id_intervenant'] ?? 0);
    if ($f_interv > 0) { $where[] = 'i.id_intervenant = ?'; $params[] = $f_interv; }
    if (!$est_intervenant && (int)($_GET['id_beneficiaire'] ?? 0) > 0) { $where[] = 'i.id_beneficiaire = ?'; $params[] = (int)$_GET['id_beneficiaire']; }
    $st = db()->prepare(SELECT_INTERVENTION . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY i.date, i.heure_debut LIMIT 500');
    $st->execute($params);
    json_out(200, ['ok' => true, 'du' => $du, 'au' => $au, 'items' => array_map('intervention_vers_front', $st->fetchAll())]);
}

if ($est_intervenant) json_out(403, ['ok' => false, 'message' => 'Accès refusé.']);

if ($methode === 'POST' || $methode === 'PUT') {
    $donnees = corps_json();
    $creation = $methode === 'POST';
    $actuelle = null;
    if (!$creation) {
        if ($id <= 0) json_out(400, ['ok' => false, 'message' => 'Identifiant manquant.']);
        $actuelle = lire_intervention($id);
        if (!$actuelle) json_out(404, ['ok' => false, 'message' => 'Intervention introuvable.']);
        if ((int)$actuelle['validee'] === 1) json_out(409, ['ok' => false, 'message' => 'Cette intervention est validée : elle ne peut plus être modifiée.']);
    }
    [$v, $erreurs] = valider($donnees, $REGLES, $creation);

    // Bénéficiaire / intervenant : contrôlés s'ils sont envoyés (toujours à la création).
    $id_b = $actuelle ? (int)$actuelle['id_beneficiaire'] : 0;
    $id_v = $actuelle ? (int)$actuelle['id_intervenant']  : 0;
    if ($creation || array_key_exists('id_beneficiaire', $donnees)) {
        $id_b = id_valide($donnees, 'id_beneficiaire', 'beneficiaire', 'archive', $erreurs, 'Le bénéficiaire');
        if ($id_b) $v['id_beneficiaire'] = $id_b;
    }
    if ($creation || array_key_exists('id_intervenant', $donnees)) {
        $id_v = id_valide($donnees, 'id_intervenant', 'intervenant', 'actif', $erreurs, "L'intervenant");
        if ($id_v) $v['id_intervenant'] = $id_v;
    }

    // Médecin prescripteur (facultatif) : vide = aucun.
    if (array_key_exists('id_medecin', $donnees)) {
        $id_m = (int)$donnees['id_medecin'];
        if ($id_m <= 0) $v['id_medecin'] = null;
        else {
            $stm = db()->prepare('SELECT COUNT(*) FROM medecin_prescripteur WHERE id_medecin = ?'); $stm->execute([$id_m]);
            if ((int)$stm->fetchColumn()) $v['id_medecin'] = $id_m; else $erreurs['id_medecin'] = 'Médecin introuvable.';
        }
    }

    // Valeurs finales (envoyées, sinon celles déjà en base) pour les contrôles croisés.
    $date  = $v['date']        ?? ($actuelle['date'] ?? null);
    $debut = $v['heure_debut'] ?? ($actuelle ? substr($actuelle['heure_debut'] . '', 0, 8) : null);
    $fin   = $v['heure_fin']   ?? ($actuelle ? substr($actuelle['heure_fin'] . '', 0, 8) : null);
    $lieu  = $v['lieu']        ?? ($actuelle['lieu'] ?? 'domicile');
    $statut = $v['statut']     ?? ($actuelle['statut'] ?? 'planifiee');
    if ($debut && strlen($debut) === 5) $debut .= ':00';
    if ($fin && strlen($fin) === 5) $fin .= ':00';
    if (!isset($erreurs['heure_fin']) && !isset($erreurs['heure_debut']) && $debut && $fin && $fin <= $debut) $erreurs['heure_fin'] = "L'heure de fin doit être après l'heure de début.";
    $adresse_ext = array_key_exists('adresse_exterieur', $v) ? $v['adresse_exterieur'] : ($actuelle['adresse_exterieur'] ?? null);
    if ($lieu === 'exterieur' && !$adresse_ext && !isset($erreurs['adresse_exterieur'])) $erreurs['adresse_exterieur'] = "L'adresse est obligatoire pour un lieu extérieur.";
    if ($lieu === 'domicile') $v['adresse_exterieur'] = null;
    if ($creation && $date && $date < date('Y-m-d') && !isset($erreurs['date'])) $erreurs['date'] = 'On ne planifie pas dans le passé.';

    if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);
    if (!$creation && !$v) json_out(400, ['ok' => false, 'message' => 'Rien à modifier.']);

    // Chevauchements (inutile si l'intervention est/devient annulée).
    if (!est_annulee($statut)) {
        $c = chevauchements($date, $debut, $fin, $id_b, $id_v, $id);
        if ($c) reponse_conflit($c);
    }
    $v['date_modification'] = date('Y-m-d');
    if ($creation) {
        $v['date_creation'] = date('Y-m-d');
        $v['validee'] = 0;
        if (isset($v['heure_debut'])) $v['heure_debut'] = $debut;
        $cols = array_keys($v);
        db()->prepare('INSERT INTO intervention (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')')->execute(array_values($v));
        $nouvelle = (int)db()->lastInsertId();
        journaliser('creation', 'intervention', 'intervention ' . $nouvelle . ' le ' . $date);
        notifier(destinataires_intervention($nouvelle), 'Nouvelle intervention : ' . resume_intervention($nouvelle), $nouvelle, !empty($v['urgente']));
        json_out(201, ['ok' => true, 'id' => $nouvelle]);
    }
    $sets = implode(', ', array_map(function ($c) { return "$c = ?"; }, array_keys($v)));
    db()->prepare("UPDATE intervention SET $sets WHERE id_intervention = ?")->execute(array_merge(array_values($v), [$id]));
    journaliser(est_annulee($statut) ? 'annulation' : 'modification', 'intervention', 'intervention ' . $id);
    notifier(destinataires_intervention($id), (est_annulee($statut) ? 'Intervention annulée : ' : 'Intervention modifiée : ') . resume_intervention($id), $id, !empty($v['urgente']));
    json_out(200, ['ok' => true, 'id' => $id]);
}

header('Allow: GET, POST, PUT');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
