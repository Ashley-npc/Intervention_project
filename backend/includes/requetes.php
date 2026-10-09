<?php
// Requêtes partagées par plusieurs pages de l'API.

// Interventions d'une personne : $colonne = 'id_beneficiaire' ou 'id_intervenant'.
// Renvoie [30 dernières interventions, nombre d'interventions encore à venir (non annulées)].
function interventions_de(string $colonne, int $id): array {
    if (!in_array($colonne, ['id_beneficiaire', 'id_intervenant'], true)) {
        throw new InvalidArgumentException('colonne inconnue');
    }
    $st = db()->prepare(
        "SELECT intervention.id_intervention, intervention.date, intervention.heure_debut, intervention.heure_fin,
                intervention.type, intervention.statut,
                beneficiaire.nom AS beneficiaire_nom, beneficiaire.prenom AS beneficiaire_prenom,
                intervenant.nom AS intervenant_nom, intervenant.prenom AS intervenant_prenom
         FROM intervention
         JOIN beneficiaire ON beneficiaire.id_beneficiaire = intervention.id_beneficiaire
         JOIN intervenant  ON intervenant.id_intervenant  = intervention.id_intervenant
         WHERE intervention.$colonne = ?
         ORDER BY intervention.date DESC, intervention.heure_debut DESC
         LIMIT 30"
    );
    $st->execute([$id]);
    $lignes = $st->fetchAll();

    // « À venir » : date de demain ou plus tard, ou aujourd'hui, et pas annulée (accepte les deux orthographes).
    $st = db()->prepare("SELECT statut FROM intervention WHERE $colonne = ? AND date >= ?");
    $st->execute([$id, date('Y-m-d')]);
    $a_venir = 0;
    foreach ($st->fetchAll() as $r) {
        if (!in_array($r['statut'], ['annulée', 'annulee'], true)) $a_venir++;
    }
    return [$lignes, $a_venir];
}
