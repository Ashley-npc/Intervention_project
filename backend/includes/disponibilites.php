<?php
// Absences et disponibilites : regles partagees (planification, remplacants, tableau de bord).
// Tant que les tables n'existent pas (ajout-absences.sql non execute), ces controles ne bloquent rien.

const MOTIFS_ABSENCE_INTERVENANT  = ['conge', 'formation', 'arret maladie', 'imprevue', 'autre'];
const MOTIFS_ABSENCE_BENEFICIAIRE = ['hospitalisation', 'voyage', 'refus', 'autre'];

function jour_semaine(string $date): int { return (int)date('N', strtotime($date)); }   // 1 = lundi ... 7 = dimanche

// Absence active (non annulee) qui couvre cette date, pour un intervenant ou un beneficiaire. null s'il n'y en a pas.
function absence_du_jour(string $colonne, int $id, string $date): ?array {
    try {
        $st = db()->prepare("SELECT motif, date_debut, date_fin FROM absence WHERE $colonne = ? AND annulee = 0 AND date_debut <= ? AND date_fin >= ? ORDER BY date_debut LIMIT 1");
        $st->execute([$id, $date, $date]);
        return $st->fetch() ?: null;
    } catch (Throwable $e) { return null; }
}

const JOURS_SEMAINE = [1 => 'lundi', 2 => 'mardi', 3 => 'mercredi', 4 => 'jeudi', 5 => 'vendredi', 6 => 'samedi', 7 => 'dimanche'];

// Message si l'intervenant n'est pas disponible sur ce creneau (null = OK).
// Table Disponibilite : semaine type = jour_ou_date 'lundi'... + type 'disponible' ; indisponibilite ponctuelle = jour_ou_date '2026-03-10' + type 'indisponible'.
// Sans aucun creneau « disponible », aucune contrainte de semaine type.
function hors_disponibilites(int $id_v, string $date, string $debut, string $fin): ?string {
    try {
        $debut = substr($debut, 0, 5); $fin = substr($fin, 0, 5);
        $st = db()->prepare("SELECT heure_debut, heure_fin FROM disponibilite WHERE id_intervenant = ? AND type = 'indisponible' AND jour_ou_date = ?");
        $st->execute([$id_v, $date]);
        foreach ($st->fetchAll() as $c) if (substr($c['heure_debut'], 0, 5) < $fin && substr($c['heure_fin'], 0, 5) > $debut) return "est indisponible ce jour-là sur ce créneau.";
        $noms = implode(', ', array_fill(0, 7, '?'));
        $tous = db()->prepare("SELECT COUNT(*) FROM disponibilite WHERE id_intervenant = ? AND type = 'disponible' AND jour_ou_date IN ($noms)");
        $tous->execute(array_merge([$id_v], array_values(JOURS_SEMAINE)));
        if (!(int)$tous->fetchColumn()) return null;
        $st = db()->prepare("SELECT heure_debut, heure_fin FROM disponibilite WHERE id_intervenant = ? AND type = 'disponible' AND jour_ou_date = ?");
        $st->execute([$id_v, JOURS_SEMAINE[jour_semaine($date)]]);
        $creneaux = $st->fetchAll();
        foreach ($creneaux as $c) if (substr($c['heure_debut'], 0, 5) <= $debut && substr($c['heure_fin'], 0, 5) >= $fin) return null;
        $jour = JOURS_SEMAINE[jour_semaine($date)];
        if (!$creneaux) return "n'a déclaré aucune disponibilité le $jour (créneau demandé : $debut-$fin).";
        $liste = array_map(function ($c) { return substr($c['heure_debut'], 0, 5) . '-' . substr($c['heure_fin'], 0, 5); }, $creneaux);
        return "n'est disponible le $jour que de " . implode(' et de ', $liste) . " (créneau demandé : $debut-$fin ; l'intervention doit tenir entièrement dans un créneau).";
    } catch (Throwable $e) { return null; }
}

function date_fr_courte(string $d): string { return date('d/m/Y', strtotime($d)); }
function motif_lisible(string $m): string { return ['conge' => 'congé', 'arret maladie' => 'arrêt maladie', 'imprevue' => 'absence imprévue'][$m] ?? $m; }

// Controles de planification : absences (toujours) et disponibilites hebdomadaires (sauf urgence). Renvoie les messages d'erreur.
function controle_planification(string $date, string $debut, string $fin, int $id_b, int $id_v, bool $urgente): array {
    $m = [];
    $nom = function (string $table, string $col, int $id) {
        $st = db()->prepare("SELECT prenom, nom FROM $table WHERE $col = ?"); $st->execute([$id]); $l = $st->fetch();
        return $l ? $l['prenom'] . ' ' . $l['nom'] : '';
    };
    if ($a = absence_du_jour('id_intervenant', $id_v, $date))
        $m[] = $nom('intervenant', 'id_intervenant', $id_v) . ' est absent·e (' . motif_lisible($a['motif']) . ', du ' . date_fr_courte($a['date_debut']) . ' au ' . date_fr_courte($a['date_fin']) . ').';
    if ($a = absence_du_jour('id_beneficiaire', $id_b, $date))
        $m[] = $nom('beneficiaire', 'id_beneficiaire', $id_b) . ' est absent·e (' . motif_lisible($a['motif']) . ', du ' . date_fr_courte($a['date_debut']) . ' au ' . date_fr_courte($a['date_fin']) . ').';
    if (!$urgente && ($h = hors_disponibilites($id_v, $date, $debut, $fin))) $m[] = $nom('intervenant', 'id_intervenant', $id_v) . ' ' . $h;
    return $m;
}

// Interventions a venir (non annulees, non validees) touchees par une absence.
function interventions_impactees(array $absence): array {
    $col = $absence['id_intervenant'] !== null ? 'i.id_intervenant' : 'i.id_beneficiaire';
    $id = $absence['id_intervenant'] !== null ? (int)$absence['id_intervenant'] : (int)$absence['id_beneficiaire'];
    $debut = max($absence['date_debut'], date('Y-m-d'));
    $st = db()->prepare(SELECT_INTERVENTION . " WHERE $col = ? AND i.date >= ? AND i.date <= ? AND i.statut = 'planifiee' AND i.validee = 0 ORDER BY i.date, i.heure_debut");
    $st->execute([$id, $debut, $absence['date_fin']]);
    return array_map('intervention_vers_front', $st->fetchAll());
}

// Remplacants possibles pour une intervention : intervenants actifs, presents, libres et disponibles ce creneau.
// Classes : meme secteur que le beneficiaire d'abord (proximite), puis moins charges ce jour-la.
function remplacants_possibles(array $interv): array {
    $date = $interv['date']; $debut = $interv['heure_debut']; $fin = $interv['heure_fin'];
    $secteur = false;
    try { $st = db()->prepare('SELECT id_secteur FROM beneficiaire WHERE id_beneficiaire = ?'); $st->execute([$interv['id_beneficiaire']]); $secteur = $st->fetchColumn(); } catch (Throwable $e) {}
    $res = [];
    foreach (db()->query('SELECT id_intervenant, nom, prenom FROM intervenant WHERE actif = 1 ORDER BY nom, prenom')->fetchAll() as $v) {
        $idv = (int)$v['id_intervenant'];
        if ($idv === (int)$interv['id_intervenant']) continue;
        if (absence_du_jour('id_intervenant', $idv, $date)) continue;
        if (chevauchements($date, $debut . ':00', $fin . ':00', (int)$interv['id_beneficiaire'], $idv, (int)$interv['id'])) continue;
        if (!$interv['urgente'] && hors_disponibilites($idv, $date, $debut, $fin)) continue;
        $meme = false;
        if ($secteur !== false && $secteur !== null) {
            try { $s = db()->prepare('SELECT COUNT(*) FROM secteur_intervenant WHERE id_secteur = ? AND id_intervenant = ?'); $s->execute([$secteur, $idv]); $meme = (int)$s->fetchColumn() > 0; } catch (Throwable $e) {}
        }
        $c = db()->prepare("SELECT COUNT(*) FROM intervention WHERE id_intervenant = ? AND date = ? AND statut <> 'annulee'"); $c->execute([$idv, $date]);
        $res[] = ['id' => $idv, 'nom' => $v['prenom'] . ' ' . $v['nom'], 'meme_secteur' => $meme, 'charge_jour' => (int)$c->fetchColumn()];
    }
    usort($res, function ($a, $b) { return [$b['meme_secteur'], $a['charge_jour'], $a['nom']] <=> [$a['meme_secteur'], $b['charge_jour'], $b['nom']]; });
    return $res;
}
