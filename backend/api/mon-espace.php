<?php
// Espace du bénéficiaire (ses propres visites) et du proche aidant (visites des bénéficiaires qui l'ont autorisé). Lecture seule.
//   GET mon-espace.php  ->  {personnes: [{id, prenom, nom, prochaines[], dernieres[], etat?}]}
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';

exiger_methode('GET');
$user = exiger_connexion(['beneficiaire', 'proche_aidant']);
$aujourdhui = date('Y-m-d');

if ($user['role'] === 'beneficiaire') {
    $st = db()->prepare('SELECT id_beneficiaire, nom, prenom FROM beneficiaire WHERE id_utilisateur = ? AND archive = 0');
    $st->execute([$user['id']]);
    $cibles = array_map(function ($b) { $b['planning'] = true; $b['etat'] = false; $b['lien'] = null; return $b; }, $st->fetchAll());
} else {
    $st = db()->prepare('SELECT b.id_beneficiaire, b.nom, b.prenom, l.lien_parente AS lien, l.autorisations
                         FROM proche_aidant a JOIN lien_beneficiaire_aidant l ON l.id_aidant = a.id_aidant
                         JOIN beneficiaire b ON b.id_beneficiaire = l.id_beneficiaire
                         WHERE a.id_utilisateur = ? AND a.actif = 1 AND b.archive = 0 ORDER BY b.nom');
    $st->execute([$user['id']]);
    $cibles = [];
    foreach ($st->fetchAll() as $b) {
        $auto = explode(',', (string)$b['autorisations']);
        $b['planning'] = in_array('planning', $auto, true); $b['etat'] = in_array('etat', $auto, true);
        unset($b['autorisations']);
        $cibles[] = $b;
    }
}

$colonnes = "i.id_intervention AS id, i.date, i.heure_debut, i.heure_fin, i.type, i.lieu, i.statut, v.prenom AS intervenant_prenom
             FROM intervention i JOIN intervenant v ON v.id_intervenant = i.id_intervenant";
$sortie = [];
foreach ($cibles as $b) {
    $fiche = ['id' => (int)$b['id_beneficiaire'], 'prenom' => $b['prenom'], 'nom' => $b['nom'], 'lien' => $b['lien'], 'voit_planning' => $b['planning'], 'voit_etat' => $b['etat'],
              'prochaines' => [], 'dernieres' => [], 'etat' => null];
    if ($b['planning']) {
        $st = db()->prepare("SELECT $colonnes WHERE i.id_beneficiaire = ? AND i.date >= ? AND i.statut <> 'annulee' ORDER BY i.date, i.heure_debut LIMIT 20");
        $st->execute([$b['id_beneficiaire'], $aujourdhui]);
        $fiche['prochaines'] = array_map('formater', $st->fetchAll());
        $st = db()->prepare("SELECT $colonnes WHERE i.id_beneficiaire = ? AND i.date < ? ORDER BY i.date DESC, i.heure_debut DESC LIMIT 10");
        $st->execute([$b['id_beneficiaire'], $aujourdhui]);
        $fiche['dernieres'] = array_map('formater', $st->fetchAll());
    }
    if ($b['etat']) {   // dernier compte rendu VALIDÉ : seul son « état » est partagé, jamais le détail des actes
        $st = db()->prepare('SELECT i.date, c.etat_beneficiaire FROM compte_rendu c JOIN intervention i ON i.id_intervention = c.id_intervention
                             WHERE i.id_beneficiaire = ? AND c.valide_par_coordinateur = 1 AND c.etat_beneficiaire IS NOT NULL ORDER BY i.date DESC LIMIT 1');
        $st->execute([$b['id_beneficiaire']]);
        $fiche['etat'] = $st->fetch() ?: null;
    }
    $sortie[] = $fiche;
}
function formater(array $l): array {
    $l['heure_debut'] = substr($l['heure_debut'], 0, 5); $l['heure_fin'] = substr($l['heure_fin'], 0, 5); $l['id'] = (int)$l['id']; return $l;
}
json_out(200, ['ok' => true, 'personnes' => $sortie]);
