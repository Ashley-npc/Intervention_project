-- Vues : des requêtes enregistrées dans la base, utilisables comme des tables (SELECT * FROM v_xxx)
-- Syntaxe commune MySQL / MariaDB / PostgreSQL. À lancer APRES la création des tables du socle.
-- Les trois premières n'utilisent aucun alias ; la vue des conflits en a besoin (jointure de la table avec elle-même).
-- Si ta colonne « date » pose problème : `date` en MySQL, "date" en PostgreSQL.

-- 1) Toutes les interventions avec le nom du bénéficiaire et de l'intervenant
CREATE OR REPLACE VIEW v_interventions_detail AS
SELECT Intervention.id_intervention, Intervention.date, Intervention.heure_debut, Intervention.heure_fin,
       Intervention.type, Intervention.lieu, Intervention.statut, Intervention.urgente, Intervention.validee,
       Beneficiaire.id_beneficiaire, Beneficiaire.nom AS beneficiaire_nom, Beneficiaire.prenom AS beneficiaire_prenom,
       Intervenant.id_intervenant, Intervenant.nom AS intervenant_nom, Intervenant.prenom AS intervenant_prenom
FROM Intervention
JOIN Beneficiaire ON Beneficiaire.id_beneficiaire = Intervention.id_beneficiaire
JOIN Intervenant  ON Intervenant.id_intervenant  = Intervention.id_intervenant;
-- Utilisation : SELECT * FROM v_interventions_detail WHERE id_intervenant = 1 ORDER BY date, heure_debut;

-- 2) Interventions réalisées qui n'ont pas de compte rendu
CREATE OR REPLACE VIEW v_comptes_rendus_manquants AS
SELECT Intervention.id_intervention, Intervention.date, Intervention.id_intervenant, Intervention.id_beneficiaire
FROM Intervention
LEFT JOIN Compte_rendu ON Compte_rendu.id_intervention = Intervention.id_intervention
WHERE Intervention.statut = 'realisee' AND Compte_rendu.id_compte_rendu IS NULL;
-- Utilisation : SELECT * FROM v_comptes_rendus_manquants;   (doit être vide avec les données de test)

-- 3) Bénéficiaires non archivés avec leur nombre d'interventions
CREATE OR REPLACE VIEW v_beneficiaires_actifs AS
SELECT Beneficiaire.id_beneficiaire, Beneficiaire.numero_dossier, Beneficiaire.nom, Beneficiaire.prenom,
       COUNT(Intervention.id_intervention) AS nb_interventions
FROM Beneficiaire
LEFT JOIN Intervention ON Intervention.id_beneficiaire = Beneficiaire.id_beneficiaire
WHERE Beneficiaire.archive = FALSE
GROUP BY Beneficiaire.id_beneficiaire, Beneficiaire.numero_dossier, Beneficiaire.nom, Beneficiaire.prenom;
-- Utilisation : SELECT * FROM v_beneficiaires_actifs ORDER BY numero_dossier;

-- 4) Chevauchements d'horaires pour un même intervenant (les alias a et b sont obligatoires ici)
CREATE OR REPLACE VIEW v_conflits_intervenant AS
SELECT a.id_intervenant, a.date, a.id_intervention AS intervention_a, b.id_intervention AS intervention_b
FROM Intervention a
JOIN Intervention b
  ON a.id_intervenant = b.id_intervenant
 AND a.date = b.date
 AND a.id_intervention < b.id_intervention
 AND a.heure_debut < b.heure_fin
 AND b.heure_debut < a.heure_fin
WHERE a.statut <> 'annulee' AND b.statut <> 'annulee';
-- Utilisation : SELECT * FROM v_conflits_intervenant;   (doit être vide avec les données de test)

-- Pour supprimer une vue : DROP VIEW v_conflits_intervenant;
