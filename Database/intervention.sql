-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 06, 2026 at 10:42 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `intervention`
--

-- --------------------------------------------------------

--
-- Table structure for table `absence`
--

CREATE TABLE `absence` (
  `id_absence` int(11) NOT NULL,
  `date_debut` date NOT NULL,
  `date_fin` date NOT NULL,
  `motif` varchar(30) NOT NULL,
  `planifiee` tinyint(1) NOT NULL DEFAULT 1,
  `commentaire` text DEFAULT NULL,
  `id_intervenant` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `beneficiaire`
--

CREATE TABLE `beneficiaire` (
  `id_beneficiaire` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `date_naissance` date NOT NULL,
  `sexe` char(1) DEFAULT NULL,
  `adresse` varchar(255) NOT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `courriel` varchar(150) DEFAULT NULL,
  `numero_dossier` varchar(30) NOT NULL,
  `situation_familiale` varchar(50) DEFAULT NULL,
  `horaires_preferes` varchar(255) DEFAULT NULL,
  `habitudes` text DEFAULT NULL,
  `animaux` varchar(255) DEFAULT NULL,
  `acces_domicile` varchar(255) DEFAULT NULL,
  `archive` tinyint(1) NOT NULL DEFAULT 0,
  `date_creation` date NOT NULL,
  `date_modification` date NOT NULL,
  `id_secteur` int(11) DEFAULT NULL,
  `id_utilisateur` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `beneficiaire`
--

INSERT INTO `beneficiaire` (`id_beneficiaire`, `nom`, `prenom`, `date_naissance`, `sexe`, `adresse`, `telephone`, `courriel`, `numero_dossier`, `situation_familiale`, `horaires_preferes`, `habitudes`, `animaux`, `acces_domicile`, `archive`, `date_creation`, `date_modification`, `id_secteur`, `id_utilisateur`) VALUES
(1, 'Rasoa', 'Marie', '1941-03-12', 'F', '25 rue de la Gare', '0320000001', NULL, 'D-0001', 'veuve', 'matin', 'th? ? 10h', 'un chat', 'bo?te ? cl?s', 0, '2026-10-05', '2026-10-05', NULL, NULL),
(2, 'Rabe', 'Jean', '1936-07-30', 'M', '4 rue des ?coles', '0320000002', NULL, 'D-0002', 'mari?', 'apr?s-midi', NULL, NULL, 'sonner ? la porte', 0, '2026-10-05', '2026-10-05', NULL, NULL),
(3, 'Ravelo', 'Odile', '1950-11-02', 'F', '17 chemin des Vignes', '0320000003', NULL, 'D-0003', 'c?libataire', NULL, 'aime marcher', NULL, 'voisine a la cl?', 0, '2026-10-05', '2026-10-05', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `compte_rendu`
--

CREATE TABLE `compte_rendu` (
  `id_compte_rendu` int(11) NOT NULL,
  `date_saisie` date NOT NULL,
  `duree_reelle` int(11) DEFAULT NULL,
  `actes_realises` text DEFAULT NULL,
  `observations` text DEFAULT NULL,
  `etat_beneficiaire` varchar(50) DEFAULT NULL,
  `valide_par_coordinateur` tinyint(1) NOT NULL DEFAULT 0,
  `id_intervention` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `compte_rendu`
--

INSERT INTO `compte_rendu` (`id_compte_rendu`, `date_saisie`, `duree_reelle`, `actes_realises`, `observations`, `etat_beneficiaire`, `valide_par_coordinateur`, `id_intervention`) VALUES
(1, '2026-10-02', 60, 'Discussion et jeu de cartes', 'Bonne humeur', 'bon', 1, 4),
(2, '2026-10-03', 55, 'Aide ? la toilette et au repas', 'Un peu fatigu?', 'moyen', 1, 5);

-- --------------------------------------------------------

--
-- Table structure for table `disponibilite`
--

CREATE TABLE `disponibilite` (
  `id_disponibilite` int(11) NOT NULL,
  `jour_ou_date` varchar(20) NOT NULL,
  `heure_debut` time NOT NULL,
  `heure_fin` time NOT NULL,
  `type` varchar(20) NOT NULL,
  `id_intervenant` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `document`
--

CREATE TABLE `document` (
  `id_document` int(11) NOT NULL,
  `nom_fichier` varchar(255) NOT NULL,
  `categorie` varchar(50) NOT NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `date_depot` date NOT NULL,
  `archive` tinyint(1) NOT NULL DEFAULT 0,
  `id_beneficiaire` int(11) DEFAULT NULL,
  `id_intervenant` int(11) DEFAULT NULL,
  `id_intervention` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dossier_medical`
--

CREATE TABLE `dossier_medical` (
  `id_dossier` int(11) NOT NULL,
  `niveau_autonomie` varchar(50) DEFAULT NULL,
  `allergies` text DEFAULT NULL,
  `pathologies` text DEFAULT NULL,
  `traitements` text DEFAULT NULL,
  `observations` text DEFAULT NULL,
  `id_beneficiaire` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `evaluation`
--

CREATE TABLE `evaluation` (
  `id_evaluation` int(11) NOT NULL,
  `date_evaluation` date NOT NULL,
  `note` int(11) DEFAULT NULL,
  `commentaire` text DEFAULT NULL,
  `id_intervenant` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `facture`
--

CREATE TABLE `facture` (
  `id_facture` int(11) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `date_emission` date NOT NULL,
  `montant_total` decimal(10,2) NOT NULL,
  `statut` varchar(20) NOT NULL DEFAULT 'emise',
  `id_beneficiaire` int(11) NOT NULL,
  `id_organisme` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `habilitation`
--

CREATE TABLE `habilitation` (
  `id_habilitation` int(11) NOT NULL,
  `libelle` varchar(100) NOT NULL,
  `date_obtention` date DEFAULT NULL,
  `date_expiration` date DEFAULT NULL,
  `id_intervenant` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `incident`
--

CREATE TABLE `incident` (
  `id_incident` int(11) NOT NULL,
  `date_heure` datetime NOT NULL,
  `description` text NOT NULL,
  `gravite` varchar(20) DEFAULT NULL,
  `traite` tinyint(1) NOT NULL DEFAULT 0,
  `id_intervention` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `intervenant`
--

CREATE TABLE `intervenant` (
  `id_intervenant` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `courriel` varchar(150) DEFAULT NULL,
  `photographie` varchar(255) DEFAULT NULL,
  `statut` varchar(20) NOT NULL,
  `types_beneficiaires_preferes` varchar(255) DEFAULT NULL,
  `horaires_preferes` varchar(255) DEFAULT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `date_creation` date NOT NULL,
  `date_modification` date NOT NULL,
  `id_utilisateur` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `intervenant`
--

INSERT INTO `intervenant` (`id_intervenant`, `nom`, `prenom`, `adresse`, `telephone`, `courriel`, `photographie`, `statut`, `types_beneficiaires_preferes`, `horaires_preferes`, `actif`, `date_creation`, `date_modification`, `id_utilisateur`) VALUES
(1, 'Rakoto', 'Hery', '12 rue des Lilas', '0340000001', 'hery.rakoto@example.org', NULL, 'salari?', NULL, 'matin', 1, '2026-10-05', '2026-10-05', 3),
(2, 'Randria', 'Voahangy', '8 avenue du Parc', '0340000002', 'voahangy.randria@example.org', NULL, 'b?n?vole', NULL, 'apr?s-midi', 1, '2026-10-05', '2026-10-05', NULL),
(3, 'Andriamanana', 'Tiana', '3 impasse du Lac', '0340000003', 'tiana.andriamanana@example.org', NULL, 'prestataire', NULL, NULL, 1, '2026-10-05', '2026-10-05', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `intervention`
--

CREATE TABLE `intervention` (
  `id_intervention` int(11) NOT NULL,
  `id_facture` int(11) DEFAULT NULL,
  `id_medecin` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `heure_debut` time NOT NULL,
  `heure_fin` time NOT NULL,
  `type` varchar(30) NOT NULL,
  `lieu` varchar(20) NOT NULL DEFAULT 'domicile',
  `adresse_exterieur` varchar(255) DEFAULT NULL,
  `statut` varchar(20) NOT NULL DEFAULT 'planifiee',
  `urgente` tinyint(1) NOT NULL DEFAULT 0,
  `validee` tinyint(1) NOT NULL DEFAULT 0,
  `date_creation` date NOT NULL,
  `date_modification` date NOT NULL,
  `id_beneficiaire` int(11) NOT NULL,
  `id_intervenant` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `intervention`
--

INSERT INTO `intervention` (`id_intervention`, `id_facture`, `id_medecin`, `date`, `heure_debut`, `heure_fin`, `type`, `lieu`, `adresse_exterieur`, `statut`, `urgente`, `validee`, `date_creation`, `date_modification`, `id_beneficiaire`, `id_intervenant`) VALUES
(1, NULL, NULL, '2026-10-06', '08:00:00', '09:00:00', 'aide ? la personne', 'domicile', NULL, 'planifi?e', 0, 0, '2026-10-05', '2026-10-05', 1, 1),
(2, NULL, NULL, '2026-10-06', '10:00:00', '11:30:00', 'soins', 'domicile', NULL, 'planifi?e', 0, 0, '2026-10-05', '2026-10-05', 2, 1),
(3, NULL, NULL, '2026-10-07', '14:00:00', '15:00:00', 'accompagnement', 'ext?rieur', 'Cabinet m?dical, centre-ville', 'planifi?e', 0, 0, '2026-10-05', '2026-10-05', 1, 2),
(4, NULL, NULL, '2026-10-02', '09:00:00', '10:00:00', 'lien social', 'domicile', NULL, 'r?alis?e', 0, 1, '2026-10-01', '2026-10-02', 3, 2),
(5, NULL, NULL, '2026-10-03', '16:00:00', '17:00:00', 'aide ? la personne', 'domicile', NULL, 'r?alis?e', 0, 1, '2026-10-01', '2026-10-03', 2, 3);

-- --------------------------------------------------------

--
-- Table structure for table `journal_audit`
--

CREATE TABLE `journal_audit` (
  `id_journal` int(11) NOT NULL,
  `date_heure` datetime NOT NULL,
  `action` varchar(30) NOT NULL,
  `entite_concernee` varchar(100) DEFAULT NULL,
  `detail` text DEFAULT NULL,
  `id_utilisateur` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lien_beneficiaire_aidant`
--

CREATE TABLE `lien_beneficiaire_aidant` (
  `id_beneficiaire` int(11) NOT NULL,
  `id_aidant` int(11) NOT NULL,
  `lien_parente` varchar(50) DEFAULT NULL,
  `autorisations` text DEFAULT NULL,
  `date_autorisation` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `medecin_prescripteur`
--

CREATE TABLE `medecin_prescripteur` (
  `id_medecin` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `specialite` varchar(100) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `courriel` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `id_notification` int(11) NOT NULL,
  `date_envoi` datetime NOT NULL,
  `canal` varchar(20) NOT NULL,
  `contenu` text NOT NULL,
  `lue` tinyint(1) NOT NULL DEFAULT 0,
  `id_utilisateur` int(11) NOT NULL,
  `id_intervention` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organisme_payeur`
--

CREATE TABLE `organisme_payeur` (
  `id_organisme` int(11) NOT NULL,
  `nom` varchar(150) NOT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `courriel` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `paiement`
--

CREATE TABLE `paiement` (
  `id_paiement` int(11) NOT NULL,
  `date_paiement` date NOT NULL,
  `montant` decimal(10,2) NOT NULL,
  `mode` varchar(20) NOT NULL,
  `payeur` varchar(30) DEFAULT NULL,
  `id_facture` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prise_en_charge`
--

CREATE TABLE `prise_en_charge` (
  `id_beneficiaire` int(11) NOT NULL,
  `id_organisme` int(11) NOT NULL,
  `droits_ouverts` varchar(255) DEFAULT NULL,
  `taux_prise_en_charge` decimal(5,2) DEFAULT NULL,
  `date_debut` date DEFAULT NULL,
  `date_fin` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `proche_aidant`
--

CREATE TABLE `proche_aidant` (
  `id_proche` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `courriel` varchar(150) DEFAULT NULL,
  `preference_communication` varchar(20) DEFAULT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `id_utilisateur` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `role`
--

CREATE TABLE `role` (
  `libelle` varchar(50) NOT NULL,
  `id_role` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role`
--

INSERT INTO `role` (`libelle`, `id_role`) VALUES
('administrateur', 1),
('coordinateur', 2),
('intervenant', 3);

-- --------------------------------------------------------

--
-- Table structure for table `secteur`
--

CREATE TABLE `secteur` (
  `libelle` varchar(100) NOT NULL,
  `id_secteur` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `secteur_intervenant`
--

CREATE TABLE `secteur_intervenant` (
  `id_secteur` int(11) NOT NULL,
  `id_intervenant` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tarif`
--

CREATE TABLE `tarif` (
  `id_tarif` int(11) NOT NULL,
  `type_intervention` varchar(30) NOT NULL,
  `montant_horaire` decimal(8,2) NOT NULL,
  `date_debut_validite` date NOT NULL,
  `date_fin_validite` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `utilisateur`
--

CREATE TABLE `utilisateur` (
  `id_utilisateur` int(11) NOT NULL,
  `identifiant` varchar(50) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `derniere_connexion` datetime DEFAULT NULL,
  `id_role` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `utilisateur`
--

INSERT INTO `utilisateur` (`id_utilisateur`, `identifiant`, `mot_de_passe`, `actif`, `derniere_connexion`, `id_role`) VALUES
(1, 'admin', 'HASH_A_REMPLACER', 1, NULL, 1),
(2, 'coord1', 'HASH_A_REMPLACER', 1, NULL, 2),
(3, 'inter1', 'HASH_A_REMPLACER', 1, NULL, 3);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_beneficiaires_actifs`
-- (See below for the actual view)
--
CREATE TABLE `v_beneficiaires_actifs` (
`id_beneficiaire` int(11)
,`numero_dossier` varchar(30)
,`nom` varchar(100)
,`prenom` varchar(100)
,`nb_interventions` bigint(21)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_comptes_rendus_manquants`
-- (See below for the actual view)
--
CREATE TABLE `v_comptes_rendus_manquants` (
`id_intervention` int(11)
,`date` date
,`id_intervenant` int(11)
,`id_beneficiaire` int(11)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_conflits_intervenant`
-- (See below for the actual view)
--
CREATE TABLE `v_conflits_intervenant` (
`id_intervenant` int(11)
,`date` date
,`intervention_a` int(11)
,`intervention_b` int(11)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_interventions_detail`
-- (See below for the actual view)
--
CREATE TABLE `v_interventions_detail` (
`id_intervention` int(11)
,`date` date
,`heure_debut` time
,`heure_fin` time
,`type` varchar(30)
,`lieu` varchar(20)
,`statut` varchar(20)
,`urgente` tinyint(1)
,`validee` tinyint(1)
,`id_beneficiaire` int(11)
,`beneficiaire_nom` varchar(100)
,`beneficiaire_prenom` varchar(100)
,`id_intervenant` int(11)
,`intervenant_nom` varchar(100)
,`intervenant_prenom` varchar(100)
);

-- --------------------------------------------------------

--
-- Structure for view `v_beneficiaires_actifs`
--
DROP TABLE IF EXISTS `v_beneficiaires_actifs`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_beneficiaires_actifs`  AS SELECT `beneficiaire`.`id_beneficiaire` AS `id_beneficiaire`, `beneficiaire`.`numero_dossier` AS `numero_dossier`, `beneficiaire`.`nom` AS `nom`, `beneficiaire`.`prenom` AS `prenom`, count(`id_intervention`) AS `nb_interventions` FROM (`beneficiaire` left join `intervention` on(`id_beneficiaire` = `beneficiaire`.`id_beneficiaire`)) WHERE `beneficiaire`.`archive` = 0 GROUP BY `beneficiaire`.`id_beneficiaire`, `beneficiaire`.`numero_dossier`, `beneficiaire`.`nom`, `beneficiaire`.`prenom` ;

-- --------------------------------------------------------

--
-- Structure for view `v_comptes_rendus_manquants`
--
DROP TABLE IF EXISTS `v_comptes_rendus_manquants`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_comptes_rendus_manquants`  AS SELECT `id_intervention` AS `id_intervention`, `date` AS `date`, `id_intervenant` AS `id_intervenant`, `id_beneficiaire` AS `id_beneficiaire` FROM (`intervention` left join `compte_rendu` on(`compte_rendu`.`id_intervention` = `id_intervention`)) WHERE `statut` = 'realisee' AND `compte_rendu`.`id_compte_rendu` is null ;

-- --------------------------------------------------------

--
-- Structure for view `v_conflits_intervenant`
--
DROP TABLE IF EXISTS `v_conflits_intervenant`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_conflits_intervenant`  AS SELECT `a`.`id_intervenant` AS `id_intervenant`, `a`.`date` AS `date`, `a`.`id_intervention` AS `intervention_a`, `b`.`id_intervention` AS `intervention_b` FROM (`intervention` `a` join `intervention` `b` on(`a`.`id_intervenant` = `b`.`id_intervenant` and `a`.`date` = `b`.`date` and `a`.`id_intervention` < `b`.`id_intervention` and `a`.`heure_debut` < `b`.`heure_fin` and `b`.`heure_debut` < `a`.`heure_fin`)) WHERE `a`.`statut` <> 'annul‚e' AND `b`.`statut` <> 'annul‚e' ;

-- --------------------------------------------------------

--
-- Structure for view `v_interventions_detail`
--
DROP TABLE IF EXISTS `v_interventions_detail`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_interventions_detail`  AS SELECT `id_intervention` AS `id_intervention`, `date` AS `date`, `heure_debut` AS `heure_debut`, `heure_fin` AS `heure_fin`, `type` AS `type`, `lieu` AS `lieu`, `statut` AS `statut`, `urgente` AS `urgente`, `validee` AS `validee`, `beneficiaire`.`id_beneficiaire` AS `id_beneficiaire`, `beneficiaire`.`nom` AS `beneficiaire_nom`, `beneficiaire`.`prenom` AS `beneficiaire_prenom`, `intervenant`.`id_intervenant` AS `id_intervenant`, `intervenant`.`nom` AS `intervenant_nom`, `intervenant`.`prenom` AS `intervenant_prenom` FROM ((`intervention` join `beneficiaire` on(`beneficiaire`.`id_beneficiaire` = `id_beneficiaire`)) join `intervenant` on(`intervenant`.`id_intervenant` = `id_intervenant`)) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `absence`
--
ALTER TABLE `absence`
  ADD PRIMARY KEY (`id_absence`),
  ADD KEY `fk_absence_intervenant` (`id_intervenant`);

--
-- Indexes for table `beneficiaire`
--
ALTER TABLE `beneficiaire`
  ADD PRIMARY KEY (`id_beneficiaire`),
  ADD UNIQUE KEY `uq_beneficiaire_dossier` (`numero_dossier`),
  ADD KEY `fk_beneficiaire_secteur` (`id_secteur`),
  ADD KEY `fk_beneficiaire_utilisateur` (`id_utilisateur`);

--
-- Indexes for table `compte_rendu`
--
ALTER TABLE `compte_rendu`
  ADD PRIMARY KEY (`id_compte_rendu`),
  ADD UNIQUE KEY `uq_compte_rendu_intervention` (`id_intervention`);

--
-- Indexes for table `disponibilite`
--
ALTER TABLE `disponibilite`
  ADD PRIMARY KEY (`id_disponibilite`),
  ADD KEY `fk_disponibilite_intervenant` (`id_intervenant`);

--
-- Indexes for table `document`
--
ALTER TABLE `document`
  ADD PRIMARY KEY (`id_document`),
  ADD KEY `fk_document_beneficiaire` (`id_beneficiaire`),
  ADD KEY `fk_document_intervenant` (`id_intervenant`),
  ADD KEY `fk_document_intervention` (`id_intervention`);

--
-- Indexes for table `dossier_medical`
--
ALTER TABLE `dossier_medical`
  ADD PRIMARY KEY (`id_dossier`),
  ADD UNIQUE KEY `uq_dossier_beneficiaire` (`id_beneficiaire`);

--
-- Indexes for table `evaluation`
--
ALTER TABLE `evaluation`
  ADD PRIMARY KEY (`id_evaluation`),
  ADD KEY `fk_evaluation_intervenant` (`id_intervenant`);

--
-- Indexes for table `facture`
--
ALTER TABLE `facture`
  ADD PRIMARY KEY (`id_facture`),
  ADD UNIQUE KEY `uq_facture_numero` (`numero`),
  ADD KEY `fk_facture_beneficiaire` (`id_beneficiaire`),
  ADD KEY `fk_facture_organisme` (`id_organisme`);

--
-- Indexes for table `habilitation`
--
ALTER TABLE `habilitation`
  ADD PRIMARY KEY (`id_habilitation`),
  ADD KEY `fk_habilitation_intervenant` (`id_intervenant`);

--
-- Indexes for table `incident`
--
ALTER TABLE `incident`
  ADD PRIMARY KEY (`id_incident`),
  ADD KEY `fk_incident_intervention` (`id_intervention`);

--
-- Indexes for table `intervenant`
--
ALTER TABLE `intervenant`
  ADD PRIMARY KEY (`id_intervenant`);

--
-- Indexes for table `intervention`
--
ALTER TABLE `intervention`
  ADD PRIMARY KEY (`id_intervention`),
  ADD KEY `fk_intervention_facture` (`id_facture`),
  ADD KEY `fk_intervention_medecin` (`id_medecin`),
  ADD KEY `fk_intervention_beneficiaire` (`id_beneficiaire`),
  ADD KEY `fk_intervention_intervenant` (`id_intervenant`);

--
-- Indexes for table `journal_audit`
--
ALTER TABLE `journal_audit`
  ADD PRIMARY KEY (`id_journal`),
  ADD KEY `fk_journal_utilisateur` (`id_utilisateur`);

--
-- Indexes for table `lien_beneficiaire_aidant`
--
ALTER TABLE `lien_beneficiaire_aidant`
  ADD PRIMARY KEY (`id_beneficiaire`,`id_aidant`),
  ADD KEY `id_aidant` (`id_aidant`);

--
-- Indexes for table `medecin_prescripteur`
--
ALTER TABLE `medecin_prescripteur`
  ADD PRIMARY KEY (`id_medecin`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`id_notification`),
  ADD KEY `fk_notification_utilisateur` (`id_utilisateur`),
  ADD KEY `fk_notification_intervention` (`id_intervention`);

--
-- Indexes for table `organisme_payeur`
--
ALTER TABLE `organisme_payeur`
  ADD PRIMARY KEY (`id_organisme`);

--
-- Indexes for table `paiement`
--
ALTER TABLE `paiement`
  ADD PRIMARY KEY (`id_paiement`),
  ADD KEY `fk_paiement_facture` (`id_facture`);

--
-- Indexes for table `prise_en_charge`
--
ALTER TABLE `prise_en_charge`
  ADD PRIMARY KEY (`id_beneficiaire`,`id_organisme`),
  ADD KEY `id_organisme` (`id_organisme`);

--
-- Indexes for table `proche_aidant`
--
ALTER TABLE `proche_aidant`
  ADD PRIMARY KEY (`id_proche`),
  ADD KEY `fk_aidant_utilisateur` (`id_utilisateur`);

--
-- Indexes for table `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`id_role`);

--
-- Indexes for table `secteur`
--
ALTER TABLE `secteur`
  ADD PRIMARY KEY (`id_secteur`);

--
-- Indexes for table `secteur_intervenant`
--
ALTER TABLE `secteur_intervenant`
  ADD PRIMARY KEY (`id_secteur`,`id_intervenant`),
  ADD KEY `id_intervenant` (`id_intervenant`);

--
-- Indexes for table `tarif`
--
ALTER TABLE `tarif`
  ADD PRIMARY KEY (`id_tarif`);

--
-- Indexes for table `utilisateur`
--
ALTER TABLE `utilisateur`
  ADD PRIMARY KEY (`id_utilisateur`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `absence`
--
ALTER TABLE `absence`
  MODIFY `id_absence` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `beneficiaire`
--
ALTER TABLE `beneficiaire`
  MODIFY `id_beneficiaire` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `compte_rendu`
--
ALTER TABLE `compte_rendu`
  MODIFY `id_compte_rendu` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `disponibilite`
--
ALTER TABLE `disponibilite`
  MODIFY `id_disponibilite` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `document`
--
ALTER TABLE `document`
  MODIFY `id_document` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dossier_medical`
--
ALTER TABLE `dossier_medical`
  MODIFY `id_dossier` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `evaluation`
--
ALTER TABLE `evaluation`
  MODIFY `id_evaluation` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `facture`
--
ALTER TABLE `facture`
  MODIFY `id_facture` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `habilitation`
--
ALTER TABLE `habilitation`
  MODIFY `id_habilitation` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `incident`
--
ALTER TABLE `incident`
  MODIFY `id_incident` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `intervenant`
--
ALTER TABLE `intervenant`
  MODIFY `id_intervenant` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `intervention`
--
ALTER TABLE `intervention`
  MODIFY `id_intervention` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `journal_audit`
--
ALTER TABLE `journal_audit`
  MODIFY `id_journal` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `medecin_prescripteur`
--
ALTER TABLE `medecin_prescripteur`
  MODIFY `id_medecin` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `id_notification` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organisme_payeur`
--
ALTER TABLE `organisme_payeur`
  MODIFY `id_organisme` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `paiement`
--
ALTER TABLE `paiement`
  MODIFY `id_paiement` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `proche_aidant`
--
ALTER TABLE `proche_aidant`
  MODIFY `id_proche` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `role`
--
ALTER TABLE `role`
  MODIFY `id_role` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `secteur`
--
ALTER TABLE `secteur`
  MODIFY `id_secteur` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tarif`
--
ALTER TABLE `tarif`
  MODIFY `id_tarif` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `utilisateur`
--
ALTER TABLE `utilisateur`
  MODIFY `id_utilisateur` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `absence`
--
ALTER TABLE `absence`
  ADD CONSTRAINT `fk_absence_intervenant` FOREIGN KEY (`id_intervenant`) REFERENCES `intervenant` (`id_intervenant`);

--
-- Constraints for table `beneficiaire`
--
ALTER TABLE `beneficiaire`
  ADD CONSTRAINT `fk_beneficiaire_secteur` FOREIGN KEY (`id_secteur`) REFERENCES `secteur` (`id_secteur`),
  ADD CONSTRAINT `fk_beneficiaire_utilisateur` FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateur` (`id_utilisateur`);

--
-- Constraints for table `compte_rendu`
--
ALTER TABLE `compte_rendu`
  ADD CONSTRAINT `fk_compte_rendu_intervention` FOREIGN KEY (`id_intervention`) REFERENCES `intervention` (`id_intervention`);

--
-- Constraints for table `disponibilite`
--
ALTER TABLE `disponibilite`
  ADD CONSTRAINT `fk_disponibilite_intervenant` FOREIGN KEY (`id_intervenant`) REFERENCES `intervenant` (`id_intervenant`);

--
-- Constraints for table `document`
--
ALTER TABLE `document`
  ADD CONSTRAINT `fk_document_beneficiaire` FOREIGN KEY (`id_beneficiaire`) REFERENCES `beneficiaire` (`id_beneficiaire`),
  ADD CONSTRAINT `fk_document_intervenant` FOREIGN KEY (`id_intervenant`) REFERENCES `intervenant` (`id_intervenant`),
  ADD CONSTRAINT `fk_document_intervention` FOREIGN KEY (`id_intervention`) REFERENCES `intervention` (`id_intervention`);

--
-- Constraints for table `dossier_medical`
--
ALTER TABLE `dossier_medical`
  ADD CONSTRAINT `fk_dossier_beneficiaire` FOREIGN KEY (`id_beneficiaire`) REFERENCES `beneficiaire` (`id_beneficiaire`);

--
-- Constraints for table `evaluation`
--
ALTER TABLE `evaluation`
  ADD CONSTRAINT `fk_evaluation_intervenant` FOREIGN KEY (`id_intervenant`) REFERENCES `intervenant` (`id_intervenant`);

--
-- Constraints for table `facture`
--
ALTER TABLE `facture`
  ADD CONSTRAINT `fk_facture_beneficiaire` FOREIGN KEY (`id_beneficiaire`) REFERENCES `beneficiaire` (`id_beneficiaire`),
  ADD CONSTRAINT `fk_facture_organisme` FOREIGN KEY (`id_organisme`) REFERENCES `organisme_payeur` (`id_organisme`);

--
-- Constraints for table `habilitation`
--
ALTER TABLE `habilitation`
  ADD CONSTRAINT `fk_habilitation_intervenant` FOREIGN KEY (`id_intervenant`) REFERENCES `intervenant` (`id_intervenant`);

--
-- Constraints for table `incident`
--
ALTER TABLE `incident`
  ADD CONSTRAINT `fk_incident_intervention` FOREIGN KEY (`id_intervention`) REFERENCES `intervention` (`id_intervention`);

--
-- Constraints for table `intervention`
--
ALTER TABLE `intervention`
  ADD CONSTRAINT `fk_intervention_beneficiaire` FOREIGN KEY (`id_beneficiaire`) REFERENCES `beneficiaire` (`id_beneficiaire`),
  ADD CONSTRAINT `fk_intervention_facture` FOREIGN KEY (`id_facture`) REFERENCES `facture` (`id_facture`),
  ADD CONSTRAINT `fk_intervention_intervenant` FOREIGN KEY (`id_intervenant`) REFERENCES `intervenant` (`id_intervenant`),
  ADD CONSTRAINT `fk_intervention_medecin` FOREIGN KEY (`id_medecin`) REFERENCES `medecin_prescripteur` (`id_medecin`);

--
-- Constraints for table `journal_audit`
--
ALTER TABLE `journal_audit`
  ADD CONSTRAINT `fk_journal_utilisateur` FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateur` (`id_utilisateur`);

--
-- Constraints for table `lien_beneficiaire_aidant`
--
ALTER TABLE `lien_beneficiaire_aidant`
  ADD CONSTRAINT `lien_beneficiaire_aidant_ibfk_1` FOREIGN KEY (`id_beneficiaire`) REFERENCES `beneficiaire` (`id_beneficiaire`),
  ADD CONSTRAINT `lien_beneficiaire_aidant_ibfk_2` FOREIGN KEY (`id_aidant`) REFERENCES `proche_aidant` (`id_proche`);

--
-- Constraints for table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `fk_notification_intervention` FOREIGN KEY (`id_intervention`) REFERENCES `intervention` (`id_intervention`),
  ADD CONSTRAINT `fk_notification_utilisateur` FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateur` (`id_utilisateur`);

--
-- Constraints for table `paiement`
--
ALTER TABLE `paiement`
  ADD CONSTRAINT `fk_paiement_facture` FOREIGN KEY (`id_facture`) REFERENCES `facture` (`id_facture`);

--
-- Constraints for table `prise_en_charge`
--
ALTER TABLE `prise_en_charge`
  ADD CONSTRAINT `prise_en_charge_ibfk_1` FOREIGN KEY (`id_beneficiaire`) REFERENCES `beneficiaire` (`id_beneficiaire`),
  ADD CONSTRAINT `prise_en_charge_ibfk_2` FOREIGN KEY (`id_organisme`) REFERENCES `organisme_payeur` (`id_organisme`);

--
-- Constraints for table `proche_aidant`
--
ALTER TABLE `proche_aidant`
  ADD CONSTRAINT `fk_aidant_utilisateur` FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateur` (`id_utilisateur`);

--
-- Constraints for table `secteur_intervenant`
--
ALTER TABLE `secteur_intervenant`
  ADD CONSTRAINT `secteur_intervenant_ibfk_1` FOREIGN KEY (`id_secteur`) REFERENCES `secteur` (`id_secteur`),
  ADD CONSTRAINT `secteur_intervenant_ibfk_2` FOREIGN KEY (`id_intervenant`) REFERENCES `intervenant` (`id_intervenant`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
