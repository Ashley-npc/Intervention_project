<?php
// Règles métier des interventions, partagées par plusieurs pages d'API.

const TYPES_INTERVENTION = ['aide a la personne', 'soins', 'accompagnement', 'lien social'];
const STATUTS_INTERVENTION = ['planifiee', 'realisee', 'annulee'];

function est_annulee(string $statut): bool { return in_array($statut, ['annulee'], true); }

// Identifiant de la fiche intervenant liée au compte connecté (ou null).
function intervenant_du_compte(array $user): ?int {
    $st = db()->prepare('SELECT id_intervenant FROM intervenant WHERE id_utilisateur = ? AND actif = 1');
    $st->execute([$user['id']]);
    $id = $st->fetchColumn();
    return $id === false ? null : (int)$id;
}

// Interventions qui chevauchent le créneau donné, pour cet intervenant OU ce bénéficiaire.
// Deux créneaux se chevauchent si  début1 < fin2  ET  fin1 > début2  (se toucher à 09:00 n'est PAS un conflit).
// $sauf = intervention en cours de modification (à ignorer). Les interventions annulées ne comptent pas.
function chevauchements(string $date, string $debut, string $fin, int $id_benef, int $id_interv, int $sauf = 0): array {
    $st = db()->prepare(
        "SELECT i.id_intervention, i.heure_debut, i.heure_fin, i.statut, i.id_beneficiaire, i.id_intervenant,
                b.nom AS b_nom, b.prenom AS b_prenom, v.nom AS v_nom, v.prenom AS v_prenom
         FROM intervention i
         JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire
         JOIN intervenant  v ON v.id_intervenant  = i.id_intervenant
         WHERE i.date = ? AND i.heure_debut < ? AND i.heure_fin > ?
           AND i.statut NOT IN ('annulee')
           AND (i.id_intervenant = ? OR i.id_beneficiaire = ?)
           AND i.id_intervention <> ?"
    );
    $st->execute([$date, $fin, $debut, $id_interv, $id_benef, $sauf]);
    $messages = [];
    foreach ($st->fetchAll() as $c) {
        $h = substr($c['heure_debut'], 0, 5) . ' à ' . substr($c['heure_fin'], 0, 5);
        if ((int)$c['id_intervenant'] === $id_interv) $messages[] = "{$c['v_prenom']} {$c['v_nom']} a déjà une intervention de $h (chez {$c['b_prenom']} {$c['b_nom']}).";
        if ((int)$c['id_beneficiaire'] === $id_benef)  $messages[] = "{$c['b_prenom']} {$c['b_nom']} a déjà une intervention de $h (avec {$c['v_prenom']} {$c['v_nom']}).";
    }
    return array_values(array_unique($messages));
}

// Ligne SQL -> objet envoyé au front.
function intervention_vers_front(array $l): array {
    return [
        'id' => (int)$l['id_intervention'], 'date' => $l['date'],
        'heure_debut' => substr($l['heure_debut'], 0, 5), 'heure_fin' => substr($l['heure_fin'], 0, 5),
        'type' => $l['type'], 'lieu' => $l['lieu'], 'adresse_exterieur' => $l['adresse_exterieur'],
        'statut' => $l['statut'], 'urgente' => (bool)$l['urgente'], 'validee' => (bool)$l['validee'],
        'id_beneficiaire' => (int)$l['id_beneficiaire'], 'id_intervenant' => (int)$l['id_intervenant'],
        'beneficiaire_nom' => $l['b_nom'], 'beneficiaire_prenom' => $l['b_prenom'],
        'intervenant_nom' => $l['v_nom'], 'intervenant_prenom' => $l['v_prenom'],
        'a_compte_rendu' => !empty($l['id_compte_rendu']),
    ];
}
const SELECT_INTERVENTION =
    'SELECT i.*, b.nom AS b_nom, b.prenom AS b_prenom, v.nom AS v_nom, v.prenom AS v_prenom, c.id_compte_rendu
     FROM intervention i
     JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire
     JOIN intervenant  v ON v.id_intervenant  = i.id_intervenant
     LEFT JOIN compte_rendu c ON c.id_intervention = i.id_intervention';

// Condition SQL « intervention terminée » (hier ou avant, ou aujourd'hui et heure de fin passée) + ses 3 paramètres.
const SQL_TERMINEE = '(i.date < ? OR (i.date = ? AND i.heure_fin <= ?))';
function params_terminee(): array { return [date('Y-m-d'), date('Y-m-d'), date('H:i:s')]; }
