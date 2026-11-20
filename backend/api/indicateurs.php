<?php
// GET indicateurs.php?du=AAAA-MM-JJ&au=AAAA-MM-JJ[&id_secteur=][&id_intervenant=][&export=csv]
// Indicateurs de pilotage (direction, responsable qualité, coordinateur). Lecture seule.
//   - activité, absentéisme, qualité : les trois rôles
//   - délais de prise en charge : les trois rôles (filtre secteur seulement)
//   - coûts : direction uniquement (filtre secteur seulement)
// Les valeurs stockées n'ont pas d'accents (realisee, annulee...).
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/interventions.php';
require __DIR__ . '/../includes/journal.php';

exiger_methode('GET');
$user = exiger_connexion(['direction', 'responsable_qualite', 'coordinateur']);
$role = $user['role'];

function date_ok(?string $d): bool { return $d !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) && checkdate((int)substr($d, 5, 2), (int)substr($d, 8, 2), (int)substr($d, 0, 4)); }
function minutes_entre(string $debut, string $fin): int { return max(0, (int)((strtotime("1970-01-01 $fin") - strtotime("1970-01-01 $debut")) / 60)); }
function taux(float $a, float $b): ?float { return $b > 0 ? round($a * 100 / $b, 1) : null; }
function jours_entre(string $a, string $b): int { return (int)round((strtotime($b) - strtotime($a)) / 86400); }

$du = $_GET['du'] ?? date('Y-m-01');
$au = $_GET['au'] ?? date('Y-m-t');
if (!date_ok($du) || !date_ok($au)) json_out(422, ['ok' => false, 'message' => 'Dates invalides.']);
if ($au < $du) json_out(422, ['ok' => false, 'message' => 'La date de fin doit être postérieure à la date de début.']);
if (jours_entre($du, $au) > 731) json_out(422, ['ok' => false, 'message' => 'La période ne peut pas dépasser deux ans.']);
$id_secteur = (int)($_GET['id_secteur'] ?? 0);
$id_interv = (int)($_GET['id_intervenant'] ?? 0);
$aujourdhui = date('Y-m-d'); $maintenant = date('H:i:s');
$nb_jours = jours_entre($du, $au) + 1;
$pdo = db();

function lignes(string $sql, array $p = []): array { $st = db()->prepare($sql); $st->execute($p); return $st->fetchAll(); }

// ---------- Interventions de la période
$w = 'i.date BETWEEN ? AND ?'; $p = [$du, $au];
if ($id_secteur) { $w .= ' AND b.id_secteur = ?'; $p[] = $id_secteur; }
if ($id_interv)  { $w .= ' AND i.id_intervenant = ?'; $p[] = $id_interv; }
$interventions = lignes("SELECT i.id_intervention, i.date, i.heure_debut, i.heure_fin, i.statut, i.type, i.id_intervenant,
        c.id_compte_rendu, c.valide_par_coordinateur AS valide
    FROM intervention i
    JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire
    LEFT JOIN compte_rendu c ON c.id_intervention = i.id_intervention
    WHERE $w", $p);

$nb = ['total' => 0, 'realisees' => 0, 'annulees' => 0, 'echues' => 0, 'a_venir' => 0, 'non_realisees' => 0];
$minutes = 0; $par_type = []; $par_interv = [];
$cr = ['echues' => 0, 'avec' => 0, 'valides' => 0, 'sans' => 0, 'a_valider' => 0];
foreach ($interventions as $i) {
    $nb['total']++;
    $annulee = est_annulee($i['statut']);
    $echue = $i['date'] < $aujourdhui || ($i['date'] === $aujourdhui && $i['heure_fin'] <= $maintenant);
    $t = $i['type']; $v = (int)$i['id_intervenant'];
    $par_type[$t] = $par_type[$t] ?? ['type' => $t, 'prevues' => 0, 'realisees' => 0, 'annulees' => 0];
    $par_interv[$v] = $par_interv[$v] ?? ['id' => $v, 'realisees' => 0, 'annulees' => 0, 'minutes' => 0];
    if ($annulee) { $nb['annulees']++; $nb['echues'] += $echue ? 1 : 0; $par_type[$t]['annulees']++; $par_interv[$v]['annulees']++; continue; }
    $par_type[$t]['prevues']++;
    if ($echue) $nb['echues']++; else $nb['a_venir']++;
    if ($i['statut'] === 'realisee') {
        $nb['realisees']++; $par_type[$t]['realisees']++; $par_interv[$v]['realisees']++;
        $m = minutes_entre($i['heure_debut'], $i['heure_fin']); $minutes += $m; $par_interv[$v]['minutes'] += $m;
    } elseif ($echue) $nb['non_realisees']++;
    if ($echue) {
        $cr['echues']++;
        if ($i['id_compte_rendu'] === null) $cr['sans']++;
        else { $cr['avec']++; if ((int)$i['valide'] === 1) $cr['valides']++; else $cr['a_valider']++; }
    }
}
// Taux de réalisation = réalisées / interventions échues (réalisées + annulées + non réalisées passées)
$echues_toutes = $nb['realisees'] + $nb['annulees'] + $nb['non_realisees'];
$activite = [
    'total' => $nb['total'], 'realisees' => $nb['realisees'], 'annulees' => $nb['annulees'], 'non_realisees' => $nb['non_realisees'], 'a_venir' => $nb['a_venir'],
    'heures_realisees' => round($minutes / 60, 1),
    'taux_realisation' => taux($nb['realisees'], $echues_toutes),
    'taux_annulation' => taux($nb['annulees'], $nb['total']),
];

// Libellés des intervenants (filtrés par secteur si demandé)
$cond_i = 'actif = 1'; $pi = [];
if ($id_secteur) { $cond_i .= ' AND id_intervenant IN (SELECT id_intervenant FROM secteur_intervenant WHERE id_secteur = ?)'; $pi[] = $id_secteur; }
$intervenants_actifs = lignes("SELECT id_intervenant AS id, nom, prenom FROM intervenant WHERE $cond_i ORDER BY nom, prenom", $pi);
$noms = [];
foreach (lignes('SELECT id_intervenant AS id, nom, prenom FROM intervenant') as $x) $noms[(int)$x['id']] = $x['prenom'] . ' ' . $x['nom'];
$liste_interv = [];
foreach ($par_interv as $v) { $v['nom'] = $noms[$v['id']] ?? ('#' . $v['id']); $v['heures'] = round($v['minutes'] / 60, 1); unset($v['minutes']); $liste_interv[] = $v; }
usort($liste_interv, function ($a, $b) { return $b['realisees'] <=> $a['realisees']; });

// ---------- Absentéisme (intervenants) : jours d'absence / (intervenants actifs × jours de la période)
$nb_actifs = count($intervenants_actifs);
if ($id_interv) $nb_actifs = 1;
$wa = 'a.annulee = 0 AND a.id_intervenant IS NOT NULL AND a.date_debut <= ? AND a.date_fin >= ?'; $pa = [$au, $du];
if ($id_interv)  { $wa .= ' AND a.id_intervenant = ?'; $pa[] = $id_interv; }
if ($id_secteur) { $wa .= ' AND a.id_intervenant IN (SELECT id_intervenant FROM secteur_intervenant WHERE id_secteur = ?)'; $pa[] = $id_secteur; }
$jours_abs = 0; $abs_plan = 0; $abs_imprevues = 0; $nb_abs = 0;
foreach (lignes("SELECT a.date_debut, a.date_fin, a.planifiee FROM absence a WHERE $wa", $pa) as $a) {
    $d1 = max(substr($a['date_debut'], 0, 10), $du); $d2 = min(substr($a['date_fin'], 0, 10), $au);
    $j = max(0, jours_entre($d1, $d2) + 1);
    $jours_abs += $j; $nb_abs++;
    if ((int)$a['planifiee'] === 1) $abs_plan += $j; else $abs_imprevues += $j;
}
$wb = 'a.annulee = 0 AND a.id_beneficiaire IS NOT NULL AND a.date_debut <= ? AND a.date_fin >= ?'; $pb = [$au, $du];
if ($id_secteur) { $wb .= ' AND a.id_beneficiaire IN (SELECT id_beneficiaire FROM beneficiaire WHERE id_secteur = ?)'; $pb[] = $id_secteur; }
$absences_benef = (int)lignes("SELECT COUNT(*) AS n FROM absence a WHERE $wb", $pb)[0]['n'];
$absenteisme = [
    'intervenants_actifs' => $nb_actifs, 'nb_absences' => $nb_abs, 'jours_absence' => $jours_abs,
    'jours_planifiees' => $abs_plan, 'jours_imprevues' => $abs_imprevues,
    'taux' => taux($jours_abs, $nb_actifs * $nb_jours),
    'absences_beneficiaires' => $absences_benef,
];

// ---------- Délais de prise en charge : jours entre la création du dossier et la 1re intervention (non annulée)
$delais = ['dossiers' => 0, 'pris_en_charge' => 0, 'en_attente' => 0, 'delai_moyen_jours' => null, 'delai_max_jours' => null];
$wd = 'b.date_creation >= ? AND b.date_creation <= ?'; $pd = [$du, $au . ' 23:59:59'];
if ($id_secteur) { $wd .= ' AND b.id_secteur = ?'; $pd[] = $id_secteur; }
$somme = 0; $max = 0;
foreach (lignes("SELECT b.id_beneficiaire, b.date_creation,
        (SELECT MIN(i.date) FROM intervention i WHERE i.id_beneficiaire = b.id_beneficiaire AND i.statut NOT IN ('annulee')) AS premiere
    FROM beneficiaire b WHERE $wd", $pd) as $b) {
    $delais['dossiers']++;
    if ($b['premiere'] === null) { $delais['en_attente']++; continue; }
    $j = max(0, jours_entre(substr($b['date_creation'], 0, 10), $b['premiere']));
    $delais['pris_en_charge']++; $somme += $j; $max = max($max, $j);
}
if ($delais['pris_en_charge']) { $delais['delai_moyen_jours'] = round($somme / $delais['pris_en_charge'], 1); $delais['delai_max_jours'] = $max; }

// ---------- Qualité : incidents de la période
$wq = 'n.date_heure >= ? AND n.date_heure <= ?'; $pq = [$du, $au . ' 23:59:59'];
if ($id_secteur) { $wq .= ' AND b.id_secteur = ?'; $pq[] = $id_secteur; }
if ($id_interv)  { $wq .= ' AND i.id_intervenant = ?'; $pq[] = $id_interv; }
$inc = ['total' => 0, 'non_traites' => 0, 'par_gravite' => []];
foreach (lignes("SELECT n.gravite, n.traite FROM incident n
    JOIN intervention i ON i.id_intervention = n.id_intervention
    JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire WHERE $wq", $pq) as $n) {
    $inc['total']++; if ((int)$n['traite'] === 0) $inc['non_traites']++;
    $inc['par_gravite'][$n['gravite']] = ($inc['par_gravite'][$n['gravite']] ?? 0) + 1;
}
$gr = [];
foreach ($inc['par_gravite'] as $g => $n) $gr[] = ['gravite' => $g, 'nb' => $n];
$inc['par_gravite'] = $gr;
$qualite = [
    'incidents' => $inc,
    'comptes_rendus' => $cr + ['taux_saisie' => taux($cr['avec'], $cr['echues']), 'taux_validation' => taux($cr['valides'], $cr['avec'])],
    'taux_incidents_pour_100' => taux($inc['total'], $nb['realisees']),
];

// ---------- Coûts (direction seulement)
$couts = null;
if ($role === 'direction') {
    $wf = 'f.date_emission BETWEEN ? AND ?'; $pf = [$du, $au];
    if ($id_secteur) { $wf .= ' AND b.id_secteur = ?'; $pf[] = $id_secteur; }
    $fact = lignes("SELECT f.id_facture, f.montant_total, f.part_organisme, f.statut,
            COALESCE((SELECT SUM(p.montant) FROM paiement p WHERE p.id_facture = f.id_facture), 0) AS paye
        FROM facture f JOIN beneficiaire b ON b.id_beneficiaire = f.id_beneficiaire WHERE $wf", $pf);
    $facture = 0; $part = 0; $reste = 0;
    foreach ($fact as $f) { $facture += (float)$f['montant_total']; $part += (float)$f['part_organisme']; $reste += max(0, (float)$f['montant_total'] - (float)$f['paye']); }
    $wp = 'p.date_paiement BETWEEN ? AND ?'; $pp = [$du, $au];
    if ($id_secteur) { $wp .= ' AND b.id_secteur = ?'; $pp[] = $id_secteur; }
    $enc = (float)lignes("SELECT COALESCE(SUM(p.montant), 0) AS s FROM paiement p JOIN facture f ON f.id_facture = p.id_facture
        JOIN beneficiaire b ON b.id_beneficiaire = f.id_beneficiaire WHERE $wp", $pp)[0]['s'];
    $couts = [
        'nb_factures' => count($fact), 'facture' => round($facture, 2), 'part_organismes' => round($part, 2),
        'reste_a_charge_beneficiaires' => round($facture - $part, 2), 'encaisse' => round($enc, 2), 'reste_a_payer' => round($reste, 2),
        'cout_moyen_intervention' => $nb['realisees'] ? round($facture / $nb['realisees'], 2) : null,
    ];
}

// ---------- Satisfaction : notes de 1 à 5 données par les bénéficiaires aux visites de la période
$ws = 'i.date BETWEEN ? AND ? AND e.note IS NOT NULL'; $ps = [$du, $au];
if ($id_secteur) { $ws .= ' AND b.id_secteur = ?'; $ps[] = $id_secteur; }
if ($id_interv)  { $ws .= ' AND e.id_intervenant = ?'; $ps[] = $id_interv; }
try {
    $sat = lignes("SELECT e.note, COUNT(*) AS nb FROM evaluation e JOIN intervention i ON i.id_intervention = e.id_intervention
        JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire WHERE $ws GROUP BY e.note", $ps);
} catch (Throwable $e) { $sat = []; }   // ajout-satisfaction.sql pas encore lancé : aucun avis
$sat_nb = 0; $sat_somme = 0; $sat_rep = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
foreach ($sat as $s) { $n = (int)$s['note']; if ($n >= 1 && $n <= 5) { $sat_rep[$n] = (int)$s['nb']; $sat_nb += (int)$s['nb']; $sat_somme += $n * (int)$s['nb']; } }
$satisfaction = [
    'nb_avis' => $sat_nb, 'moyenne' => $sat_nb ? round($sat_somme / $sat_nb, 1) : null,
    'taux_reponse' => $nb['realisees'] ? round(100 * $sat_nb / $nb['realisees'], 1) : null,
    'notes_basses' => $sat_rep[1] + $sat_rep[2],
    'repartition' => $sat_rep,
];

// ---------- Comparaison : la période précédente (même durée, juste avant) et la série par semaine (ou par mois si la période est longue)
function periode_precedente(string $du, int $nb_jours, int $id_secteur, int $id_interv, int $nb_actifs, string $aujourdhui, string $maintenant): ?array {
    try {
        $pdu = date('Y-m-d', strtotime($du . ' -' . $nb_jours . ' days')); $pau = date('Y-m-d', strtotime($du . ' -1 day'));
        $cond = 'i.date BETWEEN ? AND ?'; $par = [$pdu, $pau];
        if ($id_secteur) { $cond .= ' AND b.id_secteur = ?'; $par[] = $id_secteur; }
        if ($id_interv)  { $cond .= ' AND i.id_intervenant = ?'; $par[] = $id_interv; }
        $r = 0; $an = 0; $nr = 0;
        foreach (lignes("SELECT i.date, i.heure_fin, i.statut FROM intervention i JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire WHERE $cond", $par) as $x) {
            if (est_annulee($x['statut'])) { $an++; continue; }
            if ($x['statut'] === 'realisee') $r++;
            elseif ($x['date'] < $aujourdhui || ($x['date'] === $aujourdhui && $x['heure_fin'] <= $maintenant)) $nr++;
        }
        $ca = 'a.annulee = 0 AND a.id_intervenant IS NOT NULL AND a.date_debut <= ? AND a.date_fin >= ?'; $pa = [$pau, $pdu];
        if ($id_interv)  { $ca .= ' AND a.id_intervenant = ?'; $pa[] = $id_interv; }
        if ($id_secteur) { $ca .= ' AND a.id_intervenant IN (SELECT id_intervenant FROM secteur_intervenant WHERE id_secteur = ?)'; $pa[] = $id_secteur; }
        $jours = 0;
        foreach (lignes("SELECT a.date_debut, a.date_fin FROM absence a WHERE $ca", $pa) as $x) {
            $d1 = max(substr($x['date_debut'], 0, 10), $pdu); $d2 = min(substr($x['date_fin'], 0, 10), $pau);
            $jours += max(0, jours_entre($d1, $d2) + 1);
        }
        $cd = 'b.date_creation >= ? AND b.date_creation <= ?'; $pd = [$pdu, $pau . ' 23:59:59'];
        if ($id_secteur) { $cd .= ' AND b.id_secteur = ?'; $pd[] = $id_secteur; }
        $somme = 0; $n = 0;
        foreach (lignes("SELECT b.date_creation, (SELECT MIN(i.date) FROM intervention i WHERE i.id_beneficiaire = b.id_beneficiaire AND i.statut NOT IN ('annulee')) AS premiere FROM beneficiaire b WHERE $cd", $pd) as $x) {
            if ($x['premiere'] === null) continue;
            $somme += max(0, jours_entre(substr($x['date_creation'], 0, 10), $x['premiere'])); $n++;
        }
        return ['du' => $pdu, 'au' => $pau, 'realisees' => $r, 'taux_realisation' => taux($r, $r + $an + $nr),
                'taux_absenteisme' => taux($jours, $nb_actifs * $nb_jours), 'delai_moyen_jours' => $n ? round($somme / $n, 1) : null];
    } catch (Throwable $e) { return null; }
}
function serie_interventions(array $interventions, string $du, string $au, int $nb_jours): array {
    $mois = $nb_jours > 93; $cases = [];
    if ($mois) {
        $d = new DateTime(substr($du, 0, 7) . '-01'); $fin = new DateTime($au);
        while ($d <= $fin) { $cases[$d->format('Y-m')] = ['libelle' => $d->format('m/Y'), 'realisees' => 0, 'annulees' => 0]; $d->modify('+1 month'); }
    } else {
        $d = new DateTime($du); $d->modify('monday this week'); $fin = new DateTime($au);
        while ($d <= $fin) { $cases[$d->format('Y-m-d')] = ['libelle' => $d->format('d/m'), 'realisees' => 0, 'annulees' => 0]; $d->modify('+7 days'); }
    }
    foreach ($interventions as $i) {
        if ($mois) $k = substr($i['date'], 0, 7);
        else { $x = new DateTime($i['date']); $x->modify('monday this week'); $k = $x->format('Y-m-d'); }
        if (!isset($cases[$k])) continue;
        if (est_annulee($i['statut'])) $cases[$k]['annulees']++; elseif ($i['statut'] === 'realisee') $cases[$k]['realisees']++;
    }
    return array_values($cases);
}
$precedent = periode_precedente($du, $nb_jours, $id_secteur, $id_interv, $nb_actifs, $aujourdhui, $maintenant);
$serie = serie_interventions($interventions, $du, $au, $nb_jours);

$resultat = [
    'ok' => true, 'role' => $role, 'du' => $du, 'au' => $au, 'nb_jours' => $nb_jours,
    'activite' => $activite, 'absenteisme' => $absenteisme, 'delais' => $delais, 'qualite' => $qualite, 'couts' => $couts,
    'par_type' => array_values($par_type), 'par_intervenant' => $liste_interv,
    'satisfaction' => $satisfaction, 'precedent' => $precedent, 'serie' => $serie, 'serie_par' => $nb_jours > 93 ? 'mois' : 'semaine',
];

if (($_GET['export'] ?? '') === 'csv') {
    journaliser('export', 'indicateurs', "indicateurs du $du au $au");
    $l = [['Indicateur', 'Valeur'], ['Période', "$du au $au"]];
    $pct = function ($x) { return $x === null ? 'n/a' : str_replace('.', ',', (string)$x) . ' %'; };
    $num = function ($x) { return $x === null ? 'n/a' : str_replace('.', ',', (string)$x); };
    array_push($l,
        ['Interventions (total)', $activite['total']], ['Interventions réalisées', $activite['realisees']], ['Interventions annulées', $activite['annulees']],
        ['Échues non réalisées', $activite['non_realisees']], ['À venir', $activite['a_venir']], ['Heures réalisées', $num($activite['heures_realisees'])],
        ['Taux de réalisation', $pct($activite['taux_realisation'])], ['Taux d\'annulation', $pct($activite['taux_annulation'])],
        ['Intervenants actifs', $absenteisme['intervenants_actifs']], ['Jours d\'absence intervenants', $absenteisme['jours_absence']],
        ['dont planifiées (jours)', $absenteisme['jours_planifiees']], ['dont imprévues (jours)', $absenteisme['jours_imprevues']],
        ['Taux d\'absentéisme', $pct($absenteisme['taux'])], ['Absences de bénéficiaires', $absenteisme['absences_beneficiaires']],
        ['Nouveaux dossiers bénéficiaires', $delais['dossiers']], ['Dossiers pris en charge', $delais['pris_en_charge']], ['Dossiers en attente', $delais['en_attente']],
        ['Délai moyen de prise en charge (jours)', $num($delais['delai_moyen_jours'])], ['Délai maximum (jours)', $num($delais['delai_max_jours'])],
        ['Incidents', $inc['total']], ['Incidents non traités', $inc['non_traites']], ['Incidents pour 100 interventions réalisées', $num($qualite['taux_incidents_pour_100'])],
        ['Comptes rendus saisis (taux)', $pct($qualite['comptes_rendus']['taux_saisie'])], ['Comptes rendus validés (taux)', $pct($qualite['comptes_rendus']['taux_validation'])],
        ['Interventions échues sans compte rendu', $cr['sans']]);
    foreach ($inc['par_gravite'] as $g) $l[] = ['Incidents - gravité ' . $g['gravite'], $g['nb']];
    array_push($l, ['Satisfaction : nombre d\'avis', $satisfaction['nb_avis']], ['Satisfaction : note moyenne (sur 5)', $num($satisfaction['moyenne'])],
        ['Satisfaction : taux de réponse', $pct($satisfaction['taux_reponse'])], ['Satisfaction : notes de 2 ou moins', $satisfaction['notes_basses']]);
    if ($couts) array_push($l,
        ['Factures émises', $couts['nb_factures']], ['Montant facturé', $num($couts['facture'])], ['dont part des organismes', $num($couts['part_organismes'])],
        ['dont reste à charge bénéficiaires', $num($couts['reste_a_charge_beneficiaires'])], ['Montant encaissé', $num($couts['encaisse'])],
        ['Reste à payer (factures de la période)', $num($couts['reste_a_payer'])], ['Coût moyen par intervention réalisée', $num($couts['cout_moyen_intervention'])]);
    $l[] = []; $l[] = ['Type d\'intervention', 'Prévues', 'Réalisées', 'Annulées'];
    foreach ($par_type as $t) $l[] = [$t['type'], $t['prevues'], $t['realisees'], $t['annulees']];
    $l[] = []; $l[] = ['Intervenant', 'Réalisées', 'Annulées', 'Heures'];
    foreach ($liste_interv as $v) $l[] = [$v['nom'], $v['realisees'], $v['annulees'], $num($v['heures'])];
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="indicateurs-' . $du . '_' . $au . '.csv"');
    header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff');
    echo "\xEF\xBB\xBF";
    $out = fopen('php://output', 'w');
    foreach ($l as $ligne) {
        // Neutralise les formules (injection CSV) dans les cellules texte.
        $ligne = array_map(function ($c) { return is_string($c) && $c !== '' && strpbrk($c[0], '=+-@') !== false && !preg_match('/^-?[\d,]+( %)?$/', $c) ? "'" . $c : $c; }, $ligne);
        fputcsv($out, $ligne, ';');
    }
    exit;
}

$resultat['secteurs'] = lignes('SELECT id_secteur AS id, libelle FROM secteur ORDER BY libelle');
$resultat['intervenants'] = lignes('SELECT id_intervenant AS id, nom, prenom FROM intervenant WHERE actif = 1 ORDER BY nom, prenom');
json_out(200, $resultat);
