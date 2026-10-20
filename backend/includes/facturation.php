<?php
// Règles de facturation : tarifs, lignes facturables, soldes, numérotation.
require_once __DIR__ . '/interventions.php';

const MODES_PAIEMENT = ['espece', 'banque', 'operateur'];
const STATUTS_FACTURE = ['emise', 'payee', 'impayee', 'relancee'];

// Tarif horaire applicable à un type d'intervention à une date donnée (ou null s'il n'y en a pas).
function tarif_pour(string $type, string $date): ?float {
    $st = db()->prepare('SELECT montant_horaire FROM tarif WHERE type_intervention = ? AND date_debut_validite <= ?
                         AND (date_fin_validite IS NULL OR date_fin_validite >= ?) ORDER BY date_debut_validite DESC LIMIT 1');
    $st->execute([$type, $date, $date]);
    $v = $st->fetchColumn();
    return $v === false ? null : (float)$v;
}

// Interventions facturables d'un bénéficiaire : validées, réalisées, pas encore sur une facture, dans la période.
// Durée = durée réelle du compte rendu, sinon durée prévue. Renvoie [lignes, total, types_sans_tarif].
function lignes_facturables(int $id_benef, string $du, string $au): array {
    $st = db()->prepare(
        "SELECT i.id_intervention, i.date, i.heure_debut, i.heure_fin, i.type, c.duree_reelle
         FROM intervention i JOIN compte_rendu c ON c.id_intervention = i.id_intervention
         WHERE i.id_beneficiaire = ? AND i.validee = 1 AND i.statut = 'realisee' AND i.id_facture IS NULL AND i.date BETWEEN ? AND ?
         ORDER BY i.date, i.heure_debut");
    $st->execute([$id_benef, $du, $au]);
    $lignes = []; $total = 0.0; $manquants = [];
    foreach ($st->fetchAll() as $l) {
        $minutes = (int)$l['duree_reelle'] > 0 ? (int)$l['duree_reelle']
                 : (int)((strtotime("1970-01-01 {$l['heure_fin']}") - strtotime("1970-01-01 {$l['heure_debut']}")) / 60);
        $tarif = tarif_pour($l['type'], $l['date']);
        if ($tarif === null) { $manquants[$l['type']] = true; continue; }
        $montant = round($minutes / 60 * $tarif, 2);
        $total += $montant;
        $lignes[] = ['id' => (int)$l['id_intervention'], 'date' => $l['date'], 'type' => $l['type'], 'minutes' => $minutes, 'tarif' => $tarif, 'montant' => $montant];
    }
    return [$lignes, round($total, 2), array_keys($manquants)];
}

function montant_paye(int $id_facture): float {
    $st = db()->prepare('SELECT COALESCE(SUM(montant), 0) FROM paiement WHERE id_facture = ?');
    $st->execute([$id_facture]);
    return round((float)$st->fetchColumn(), 2);
}

// Numéro de facture : F-2026-0001, F-2026-0002…
function prochain_numero_facture(): string {
    $an = date('Y'); $max = 0;
    $st = db()->prepare('SELECT numero FROM facture WHERE numero LIKE ?');
    $st->execute(["F-$an-%"]);
    foreach ($st->fetchAll() as $r) if (preg_match('/^F-\d{4}-(\d+)$/', $r['numero'], $m)) $max = max($max, (int)$m[1]);
    return sprintf('F-%s-%04d', $an, $max + 1);
}

// Lit un montant saisi (« 12 », « 12.5 », « 12,50 ») : renvoie un float > 0 ou null.
function lire_montant($v): ?float {
    $s = str_replace(',', '.', trim((string)$v));
    if (!preg_match('/^\d{1,8}(\.\d{1,2})?$/', $s)) return null;
    $f = round((float)$s, 2);
    return $f > 0 ? $f : null;
}

// Prise en charge applicable a un bénéficiaire à une date : l'organisme au taux le plus élevé parmi ceux dont la période couvre la date.
// Renvoie ['id_organisme', 'nom', 'taux'] ou null.
function prise_en_charge_applicable(int $id_benef, string $date): ?array {
    $st = db()->prepare('SELECT p.id_organisme, o.nom, p.taux_prise_en_charge AS taux FROM prise_en_charge p JOIN organisme_payeur o ON o.id_organisme = p.id_organisme
        WHERE p.id_beneficiaire = ? AND p.taux_prise_en_charge > 0 AND (p.date_debut IS NULL OR p.date_debut <= ?) AND (p.date_fin IS NULL OR p.date_fin >= ?)
        ORDER BY p.taux_prise_en_charge DESC, o.nom LIMIT 1');
    $st->execute([$id_benef, $date, $date]);
    $l = $st->fetch();
    return $l ? ['id_organisme' => (int)$l['id_organisme'], 'nom' => $l['nom'], 'taux' => (float)$l['taux']] : null;
}
// Répartition d'un total : [part de l'organisme, reste à charge du bénéficiaire].
function repartition(float $total, ?array $pec): array {
    $part = $pec ? round($total * min(100.0, $pec['taux']) / 100, 2) : 0.0;
    return [$part, round($total - $part, 2)];
}
// Somme payée sur une facture par un type de payeur (« organisme » ou « beneficiaire » ; un payeur vide compte comme bénéficiaire).
function montant_paye_par(int $id_facture, string $payeur): float {
    $st = db()->prepare("SELECT COALESCE(SUM(montant), 0) FROM paiement WHERE id_facture = ? AND " . ($payeur === 'organisme' ? "payeur = 'organisme'" : "(payeur IS NULL OR payeur <> 'organisme')"));
    $st->execute([$id_facture]);
    return round((float)$st->fetchColumn(), 2);
}
