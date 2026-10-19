<?php
// POST paiements.php  {id_facture, date_paiement, montant, mode: espece|banque|operateur, payeur?: beneficiaire|organisme}
// Enregistre un paiement (jamais modifié ni supprimé : on garde la trace). La facture passe à « payée » quand le reste à payer est nul.
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/facturation.php';

exiger_methode('POST');
exiger_connexion(['facturation']);
$d = corps_json();
[$v, $erreurs] = valider($d, [
    'date_paiement' => ['libelle' => 'La date', 'type' => 'date', 'requis' => true, 'pas_futur' => true],
    'mode'          => ['libelle' => 'Le mode', 'type' => 'choix', 'requis' => true, 'options' => MODES_PAIEMENT],
    'payeur'        => ['libelle' => 'Le payeur', 'type' => 'choix', 'options' => ['beneficiaire', 'organisme'], 'defaut' => 'beneficiaire'],
], true);
// Détails propres à chaque mode (tables filles Paiement_espece / Paiement_banque / Paiement_operateur).
$REGLES_DETAIL = [
    'espece'    => ['recu_par' => ['libelle' => 'La personne qui a encaissé', 'max' => 100], 'numero_recu' => ['libelle' => 'Le numéro de reçu', 'max' => 50]],
    'banque'    => ['nom_banque' => ['libelle' => 'La banque', 'max' => 100, 'requis' => true],
                    'type_operation' => ['libelle' => "Le type d'opération", 'type' => 'choix', 'requis' => true, 'options' => ['cheque', 'virement']],
                    'reference' => ['libelle' => 'La référence', 'max' => 50]],
    'operateur' => ['nom_operateur' => ['libelle' => "L'opérateur", 'max' => 50, 'requis' => true], 'numero_telephone' => ['libelle' => 'Le numéro de téléphone', 'type' => 'telephone'],
                    'reference_transaction' => ['libelle' => 'La référence de transaction', 'max' => 50]],
];
$detail = [];
if (isset($v['mode'])) { [$detail, $err_d] = valider($d, $REGLES_DETAIL[$v['mode']], true); $erreurs = array_merge($erreurs, $err_d); }
$montant = lire_montant($d['montant'] ?? '');
if ($montant === null) $erreurs['montant'] = 'Le montant doit être un nombre positif (8 chiffres maximum).';
$id_f = (int)($d['id_facture'] ?? 0);
$st = db()->prepare('SELECT montant_total, statut FROM facture WHERE id_facture = ?'); $st->execute([$id_f]);
$f = $st->fetch();
if (!$f) json_out(404, ['ok' => false, 'message' => 'Facture introuvable.']);
if ($erreurs) json_out(422, ['ok' => false, 'message' => 'Certains champs sont à corriger.', 'erreurs' => $erreurs]);

$restant = round((float)$f['montant_total'] - montant_paye($id_f), 2);
if ($restant <= 0) json_out(409, ['ok' => false, 'message' => 'Cette facture est déjà entièrement payée.']);
if ($montant > $restant) json_out(422, ['ok' => false, 'message' => "Le montant dépasse le reste à payer ($restant).", 'erreurs' => ['montant' => "Maximum : $restant"]]);

$pdo = db();
$pdo->beginTransaction();
$pdo->prepare('INSERT INTO paiement (date_paiement, montant, mode, payeur, id_facture) VALUES (?, ?, ?, ?, ?)')
    ->execute([$v['date_paiement'], $montant, $v['mode'], $v['payeur'], $id_f]);
$id_p = (int)$pdo->lastInsertId();
$table_fille = ['espece' => 'paiement_espece', 'banque' => 'paiement_banque', 'operateur' => 'paiement_operateur'][$v['mode']];
$cols = array_merge(['id_paiement'], array_keys($detail));
$pdo->prepare("INSERT INTO $table_fille (" . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')')
    ->execute(array_merge([$id_p], array_values($detail)));
$nouveau_restant = round($restant - $montant, 2);
if ($nouveau_restant <= 0) $pdo->prepare("UPDATE facture SET statut = 'payee' WHERE id_facture = ?")->execute([$id_f]);
$pdo->commit();
journaliser('creation', 'paiement', 'facture ' . $id_f . ' : ' . $montant . ' (' . $v['mode'] . ')');
json_out(201, ['ok' => true, 'restant' => $nouveau_restant, 'payee' => $nouveau_restant <= 0]);
