<?php
// Suivi de la facturation (service facturation) :
//   GET a-facturer.php  ->  { a_facturer: [...], non_payees: [...] }
//   a_facturer : bénéficiaires ayant des interventions réalisées et validées, pas encore facturées (regroupées par bénéficiaire)
//   non_payees : factures qui ne sont pas totalement payées (avec le reste à payer et un indicateur de retard : plus de 30 jours)
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';

exiger_connexion(['facturation']);
exiger_methode('GET');

$st = db()->query("SELECT b.id_beneficiaire AS id, b.nom, b.prenom, COUNT(*) AS nb, MIN(i.date) AS premiere, MAX(i.date) AS derniere
                   FROM intervention i JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire
                   WHERE i.validee = 1 AND i.statut = 'realisee' AND i.id_facture IS NULL
                   GROUP BY b.id_beneficiaire, b.nom, b.prenom ORDER BY MIN(i.date), b.nom");
$a_facturer = [];
foreach ($st->fetchAll() as $l) {
    $a_facturer[] = ['id' => (int)$l['id'], 'nom' => $l['nom'], 'prenom' => $l['prenom'], 'nb' => (int)$l['nb'], 'premiere' => $l['premiere'], 'derniere' => $l['derniere']];
}

$limite = date('Y-m-d', strtotime('-30 days'));
$st = db()->query("SELECT f.id_facture AS id, f.numero, f.date_emission, f.montant_total, f.statut, b.nom, b.prenom,
                          COALESCE((SELECT SUM(p.montant) FROM paiement p WHERE p.id_facture = f.id_facture), 0) AS paye
                   FROM facture f JOIN beneficiaire b ON b.id_beneficiaire = f.id_beneficiaire
                   WHERE f.statut <> 'payee' ORDER BY f.date_emission, f.id_facture");
$non_payees = [];
foreach ($st->fetchAll() as $l) {
    $total = round((float)$l['montant_total'], 2); $paye = round((float)$l['paye'], 2);
    if ($total - $paye <= 0) continue;
    $non_payees[] = ['id' => (int)$l['id'], 'numero' => $l['numero'], 'date_emission' => $l['date_emission'], 'montant_total' => $total, 'paye' => $paye,
                     'restant' => round($total - $paye, 2), 'statut' => $l['statut'], 'nom' => $l['nom'], 'prenom' => $l['prenom'], 'retard' => $l['date_emission'] < $limite];
}
json_out(200, ['ok' => true, 'a_facturer' => $a_facturer, 'non_payees' => $non_payees]);
