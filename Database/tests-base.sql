-- Tests de la base (socle) : à lancer APRES cles-primaires.sql, ajout-colonnes.sql, donnees-test.sql et vues.sql
-- Syntaxe commune MySQL / MariaDB / PostgreSQL. Lance les requêtes UNE PAR UNE et compare avec « Résultat attendu ».
-- Les résultats attendus supposent les données de donnees-test.sql, non modifiées.

-- ============================================================
-- A) Les données sont bien là
-- ============================================================

-- A1. Nombre de lignes par table
SELECT 'Role' AS table_nom, COUNT(*) AS nb FROM Role
UNION ALL SELECT 'Utilisateur', COUNT(*) FROM Utilisateur
UNION ALL SELECT 'Intervenant', COUNT(*) FROM Intervenant
UNION ALL SELECT 'Beneficiaire', COUNT(*) FROM Beneficiaire
UNION ALL SELECT 'Intervention', COUNT(*) FROM Intervention
UNION ALL SELECT 'Compte_rendu', COUNT(*) FROM Compte_rendu;
-- Résultat attendu : 3, 3, 3, 3, 5, 2

-- A2. Les liens entre tables fonctionnent (jointures)
SELECT id_intervention, date, heure_debut, heure_fin, type, statut,
       beneficiaire_nom AS beneficiaire, intervenant_nom AS intervenant
FROM v_interventions_detail
ORDER BY date, heure_debut;
-- Résultat attendu : 5 lignes, de l'intervention du 2026-10-02 (Ravelo / Randria) à celle du 2026-10-07 (Rasoa / Randria)

-- ============================================================
-- B) Règles de gestion
-- ============================================================

-- B1. Planning d'un intervenant (id_intervenant = 1) sur la semaine du 6 octobre 2026
SELECT date, heure_debut, heure_fin, type, lieu
FROM v_interventions_detail
WHERE id_intervenant = 1
  AND date BETWEEN '2026-10-05' AND '2026-10-11'
ORDER BY date, heure_debut;
-- Résultat attendu : 2 lignes (08:00-09:00 aide à la personne, 10:00-11:30 soins)

-- B2. Détection des chevauchements déjà présents dans la base : doit renvoyer 0 ligne
SELECT * FROM v_conflits_intervenant;
-- Résultat attendu : aucune ligne.

-- B3. Test du conflit AVANT d'enregistrer une nouvelle intervention
-- Essai : intervenant 1, le 2026-10-06, de 08:30 à 09:30 (chevauche l'intervention 1 de 08:00 à 09:00)
SELECT COUNT(*) AS nb_conflits
FROM Intervention
WHERE id_intervenant = 1
  AND date = '2026-10-06'
  AND statut <> 'annulee'
  AND heure_debut < '09:30'     -- début de l'existante < fin de la nouvelle
  AND heure_fin   > '08:30';    -- fin de l'existante > début de la nouvelle
-- Résultat attendu : 1  (donc ton code doit REFUSER l'enregistrement).
-- Si tu changes les heures en 09:00 -> 10:00, le résultat doit être 0 (une fin à 09:00 et un début à 09:00 ne se chevauchent pas).
-- La base n'empêche PAS ce cas toute seule : c'est ton code qui doit lancer cette requête avant chaque INSERT ou UPDATE.

-- B4. Interventions réalisées sans compte rendu : doit renvoyer 0 ligne
SELECT * FROM v_comptes_rendus_manquants;
-- Résultat attendu : aucune ligne (les interventions 4 et 5 ont chacune un compte rendu)

-- B5. Interventions validées mais dont le compte rendu n'est pas validé : doit renvoyer 0 ligne
SELECT i.id_intervention
FROM Intervention i
JOIN Compte_rendu c ON c.id_intervention = i.id_intervention
WHERE i.validee = TRUE AND c.valide_par_coordinateur = FALSE;
-- Résultat attendu : aucune ligne

-- B6. Bénéficiaires non archivés avec leur nombre d'interventions
SELECT numero_dossier, nom, prenom, nb_interventions
FROM v_beneficiaires_actifs
ORDER BY numero_dossier;
-- Résultat attendu : D-0001 (Rasoa) 2, D-0002 (Rabe) 2, D-0003 (Ravelo) 1

-- B7. Charge de chaque intervenant en heures planifiées (hors annulées)
-- MySQL / MariaDB :
SELECT v.nom, ROUND(SUM(TIME_TO_SEC(TIMEDIFF(i.heure_fin, i.heure_debut))) / 3600, 2) AS heures
FROM Intervenant v
LEFT JOIN Intervention i ON i.id_intervenant = v.id_intervenant AND i.statut <> 'annulee'
GROUP BY v.id_intervenant, v.nom;
-- PostgreSQL : remplace l'expression de SUM(...) par   SUM(EXTRACT(EPOCH FROM (i.heure_fin - i.heure_debut)))
-- Résultat attendu : Rakoto 2,50 ; Randria 2,00 ; Andriamanana 1,00

-- B8. Un utilisateur et son rôle
SELECT u.identifiant, r.libelle AS role, u.actif
FROM Utilisateur u JOIN Role r ON r.id_role = u.id_role
ORDER BY u.identifiant;
-- Résultat attendu : admin / administrateur, coord1 / coordinateur, inter1 / intervenant

-- ============================================================
-- C) Contraintes : chaque insertion ci-dessous doit être REFUSÉE par la base
--    (si elle passe, une clé étrangère ou une contrainte d'unicité manque)
--    Lance-les une par une, et note le message d'erreur reçu.
-- ============================================================

-- C1. Clé étrangère : un bénéficiaire qui n'existe pas (id 999)
INSERT INTO Intervention (date, heure_debut, heure_fin, type, lieu, statut, urgente, validee,
                          date_creation, date_modification, id_beneficiaire, id_intervenant)
VALUES ('2026-10-08', '08:00', '09:00', 'soins', 'domicile', 'planifiee', FALSE, FALSE,
        '2026-10-06', '2026-10-06', 999, 1);
-- Résultat attendu : ERREUR de clé étrangère (fk_intervention_beneficiaire)

-- C2. Clé étrangère : un intervenant qui n'existe pas
INSERT INTO Intervention (date, heure_debut, heure_fin, type, lieu, statut, urgente, validee,
                          date_creation, date_modification, id_beneficiaire, id_intervenant)
VALUES ('2026-10-08', '08:00', '09:00', 'soins', 'domicile', 'planifiee', FALSE, FALSE,
        '2026-10-06', '2026-10-06', 1, 999);
-- Résultat attendu : ERREUR de clé étrangère (fk_intervention_intervenant)

-- C3. Unicité : un numéro de dossier déjà utilisé (D-0001)
INSERT INTO Beneficiaire (nom, prenom, date_naissance, adresse, numero_dossier, archive, date_creation, date_modification)
VALUES ('Test', 'Doublon', '1940-01-01', '1 rue du Test', 'D-0001', FALSE, '2026-10-06', '2026-10-06');
-- Résultat attendu : ERREUR d'unicité (uq_beneficiaire_dossier)

-- C4. Unicité : un identifiant de connexion déjà utilisé (admin)
INSERT INTO Utilisateur (identifiant, mot_de_passe, actif, id_role)
VALUES ('admin', 'HASH_A_REMPLACER', TRUE, 1);
-- Résultat attendu : ERREUR d'unicité (uq_utilisateur_identifiant)

-- C5. Unicité : un deuxième compte rendu pour l'intervention 4
INSERT INTO Compte_rendu (date_saisie, duree_reelle, valide_par_coordinateur, id_intervention)
VALUES ('2026-10-06', 30, FALSE, 4);
-- Résultat attendu : ERREUR d'unicité (uq_compte_rendu_intervention)

-- C6. Champ obligatoire : un bénéficiaire sans nom
INSERT INTO Beneficiaire (prenom, date_naissance, adresse, numero_dossier, archive, date_creation, date_modification)
VALUES ('SansNom', '1940-01-01', '1 rue du Test', 'D-0099', FALSE, '2026-10-06', '2026-10-06');
-- Résultat attendu : ERREUR « nom » ne peut pas être NULL

-- C7. Clé étrangère à la suppression : supprimer un bénéficiaire qui a des interventions
DELETE FROM Beneficiaire WHERE id_beneficiaire = 1;
-- Résultat attendu : ERREUR de clé étrangère. C'est voulu : on archive (archive = TRUE) au lieu de supprimer.

-- ============================================================
-- D) Nettoyage éventuel (seulement si un test de la partie C est passé par erreur)
-- ============================================================
-- DELETE FROM Intervention WHERE date = '2026-10-08';
-- DELETE FROM Beneficiaire WHERE numero_dossier IN ('D-0099');
