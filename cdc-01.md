# Cahier des charges

## Projet de développement web : Gestion des interventions et du suivi des bénéficiaires pour une structure d’aide à domicile

**Version :** 1.0  
**Statut :** Validé pour conception  
**Diffusion :** Direction, coordination, équipe projet, partenaires concernés

---

## 1. Préambule

### 1.1 Objet du document
Le présent cahier des charges définit les besoins, les exigences et les contraintes relatifs à la conception et à la réalisation d’une application web destinée à la gestion des interventions et au suivi des bénéficiaires d’une structure d’aide à domicile. Il constitue le document de référence contractuel entre la maîtrise d’ouvrage et la maîtrise d’œuvre. Il précise le périmètre, les acteurs, les fonctionnalités attendues, les exigences non fonctionnelles, les livrables et les critères d’acceptation.

### 1.2 Destinataires
- Direction de la structure d’aide à domicile
- Coordinateurs et responsables de secteur
- Intervenants à domicile
- Service administratif et facturation
- Responsable qualité et conformité
- Équipe de développement web
- Prestataires techniques éventuels
- Autorités de contrôle et partenaires institutionnels

### 1.3 Définitions et acronymes
- **Bénéficiaire :** personne physique faisant l’objet d’une prise en charge par la structure.
- **Proche aidant :** personne de l’entourage du bénéficiaire intervenant dans son accompagnement.
- **Intervenant :** professionnel salarié ou bénévole réalisant des interventions au domicile du bénéficiaire.
- **Coordinateur :** personne chargée de l’organisation, du suivi et de l’évaluation des interventions.
- **Intervention :** prestation réalisée au domicile du bénéficiaire par un intervenant.
- **Compte rendu :** document synthétique rédigé après une intervention.
- **RGPD :** Règlement général sur la protection des données.
- **MDPH :** Maison départementale des personnes handicapées.
- **APA :** Allocation personnalisée d’autonomie.
- **PCH :** Prestation de compensation du handicap.
- **CAF :** Caisse d’allocations familiales.
- **CPAM :** Caisse primaire d’assurance maladie.

### 1.4 Références
- Code de l’action sociale et des familles
- Code du travail
- Code de la santé publique
- Règlement général sur la protection des données (RGPD)
- Recommandations de la CNIL
- Normes ISO 9001, ISO 27001 (principes)
- Chartes professionnelles du secteur de l’aide à domicile

---

## 2. Contexte

### 2.1 Présentation de la structure
La structure est un organisme à but non lucratif ou une entreprise de services à la personne intervenant auprès de personnes âgées, en situation de handicap ou en perte d’autonomie. Elle assure des prestations d’aide à domicile, d’accompagnement, d’aide aux gestes de la vie quotidienne, de soins d’hygiène et de lien social. Son activité est répartie sur plusieurs secteurs géographiques et implique une coordination constante entre les bénéficiaires, leurs proches, les intervenants et les partenaires institutionnels.

### 2.2 Situation actuelle
À ce jour, la gestion des interventions et le suivi des bénéficiaires reposent sur des outils hétérogènes : registres papier, tableurs, échanges de courriels, appels téléphoniques. Cette organisation entraîne des difficultés de centralisation, des risques d’erreur, des pertes d’information, des retards de transmission et une visibilité limitée sur l’activité.

### 2.3 Problématique
- Absence de référentiel unique pour les bénéficiaires, les proches aidants et les intervenants.
- Difficulté à organiser et à réorganiser les interventions en cas d’absence ou d’urgence.
- Manque de traçabilité des actions réalisées et des comptes rendus.
- Lenteur dans la production des plannings et des factures.
- Risque de non-conformité réglementaire concernant la protection des données personnelles et de santé.
- Communication insuffisante entre les acteurs.
- Absence d’indicateurs de pilotage fiables.

### 2.4 Opportunité
La mise en place d’une application web dédiée permettrait de centraliser les informations, d’automatiser les tâches répétitives, d’améliorer la coordination, de sécuriser les données et de fournir des tableaux de bord décisionnels. Le projet s’inscrit dans une démarche d’amélioration continue de la qualité de service et de modernisation des outils.

---

## 3. Objet et périmètre

### 3.1 Objet du projet
Concevoir et développer une application web accessible aux acteurs autorisés, permettant :
- La gestion administrative et sociale des bénéficiaires.
- La gestion des proches aidants et des contacts.
- La gestion des intervenants et de leurs disponibilités.
- L’organisation et le suivi des interventions.
- La saisie et la consultation des comptes rendus.
- La gestion des absences et des remplacements.
- La communication et les notifications.
- La facturation et le suivi des paiements.
- La production de tableaux de bord et d’indicateurs.
- L’administration des droits et des paramètres.

### 3.2 Périmètre fonctionnel
Le projet couvre les domaines suivants :
1. Référentiel des bénéficiaires.
2. Référentiel des proches aidants.
3. Référentiel des intervenants.
4. Gestion des interventions.
5. Organisation et réorganisation des interventions.
6. Suivi des interventions et comptes rendus.
7. Gestion des absences et des remplacements.
8. Gestion documentaire.
9. Facturation et paiements.
10. Communication et notifications.
11. Tableaux de bord et indicateurs.
12. Recherche et filtres.
13. Administration et paramétrage.
14. Journalisation et audit.

### 3.3 Périmètre exclu
- La comptabilité générale et analytique.
- La paie des intervenants.
- La gestion des ressources humaines (contrats, congés payés, formation).
- La télétransmission directe avec les organismes de sécurité sociale.
- Les fonctionnalités de messagerie instantanée.
- La visioconférence.
- Les applications mobiles natives.
- L’interfaçage avec des dispositifs médicaux.

### 3.4 Utilisateurs concernés
- Bénéficiaires (accès limité à leurs informations).
- Proches aidants (accès délégué selon autorisation).
- Intervenants à domicile.
- Coordinateurs.
- Responsable qualité.
- Administrateur fonctionnel.
- Service facturation.
- Direction.
- Équipe technique de maintenance.

---

## 4. Acteurs et rôles

| Acteur | Description | Responsabilités | Droits | Interactions |
|---|---|---|---|---|
| **Bénéficiaire** | Personne prise en charge par la structure. | Fournir les informations nécessaires, signaler les changements, valider les interventions. | Consulter ses informations personnelles, ses interventions, ses comptes rendus autorisés, ses factures. | Interagit avec les proches aidants, les intervenants, le coordinateur. |
| **Proche aidant** | Personne de l’entourage du bénéficiaire. | Aider le bénéficiaire, transmettre des informations, suivre les interventions. | Consulter les informations autorisées par le bénéficiaire, recevoir des notifications, communiquer avec le coordinateur. | Interagit avec le bénéficiaire, les intervenants, le coordinateur. |
| **Intervenant à domicile** | Professionnel réalisant les interventions. | Réaliser les interventions, saisir les comptes rendus, signaler les incidents, gérer ses disponibilités. | Consulter ses interventions, saisir des comptes rendus, signaler des absences, consulter les informations nécessaires au bénéficiaire. | Interagit avec le coordinateur, les bénéficiaires, les proches aidants. |
| **Coordinateur** | Personne chargée de l’organisation et du suivi. | Planifier les interventions, affecter les intervenants, suivre les comptes rendus, gérer les urgences, communiquer avec les acteurs. | Créer, modifier, supprimer des interventions, gérer les bénéficiaires, les intervenants, les absences, consulter les tableaux de bord. | Interagit avec tous les acteurs. |
| **Responsable qualité** | Garant de la conformité et de la qualité. | Contrôler les procédures, analyser les indicateurs, mener des audits, proposer des améliorations. | Consulter les tableaux de bord, les comptes rendus, les journaux d’activité, paramétrer des indicateurs. | Interagit avec la direction, les coordinateurs, les intervenants. |
| **Administrateur fonctionnel** | Gestionnaire des paramètres et des droits. | Gérer les comptes, les rôles, les paramètres généraux, les référentiels. | Créer, modifier, désactiver des comptes, attribuer des droits, paramétrer l’application. | Interagit avec l’équipe technique, les coordinateurs. |
| **Service facturation** | Chargé de la facturation et du suivi des paiements. | Émettre les factures, suivre les règlements, relancer les impayés. | Consulter les interventions réalisées, générer des factures, enregistrer des paiements. | Interagit avec les bénéficiaires, les proches aidants, les organismes payeurs. |
| **Direction** | Responsable de la structure. | Valider les orientations, suivre les indicateurs, prendre des décisions. | Consulter tous les tableaux de bord, les rapports, les statistiques. | Interagit avec le responsable qualité, les coordinateurs, l’administrateur. |
| **Équipe technique** | Chargée de la maintenance et de l’exploitation. | Assurer la disponibilité, la sécurité, les sauvegardes, les mises à jour. | Accéder aux journaux techniques, aux paramètres d’exploitation, aux sauvegardes. | Interagit avec l’administrateur fonctionnel, les prestataires. |
| **Organisme payeur** | Partenaire institutionnel (CAF, CPAM, MDPH, etc.). | Financer tout ou partie des prestations. | Consulter les informations nécessaires à la liquidation des droits. | Interagit avec le service facturation, le bénéficiaire. |
| **Médecin prescripteur** | Professionnel de santé prescrivant des soins ou une aide. | Prescrire les interventions, transmettre les ordonnances. | Consulter les informations médicales autorisées. | Interagit avec le bénéficiaire, le coordinateur, les intervenants. |

---

## 5. Besoins fonctionnels

### 5.1 Gestion des bénéficiaires
**Objectif :** Centraliser et gérer les informations relatives aux bénéficiaires.

**Données manipulées :**
- Identité : nom, prénom, date de naissance, sexe, photographie.
- Coordonnées : adresse, téléphone, courriel.
- Informations administratives : numéro de dossier, organisme payeur, droits ouverts, taux de prise en charge.
- Informations sociales : situation familiale, aidants, ressources.
- Informations médicales : pathologies, traitements, allergies, autonomie, prescriptions.
- Préférences : horaires, habitudes, animaux, accès au domicile.
- Documents : pièces d’identité, justificatifs, ordonnances, contrats.

**Règles de gestion :**
.- Un bénéficiaire est identifié par un numéro unique.
- Les informations médicales sont confidentielles et accessibles uniquement aux personnes habilitées.
- Toute modification est tracée avec date, heure et auteur.
- La suppression d’un bénéficiaire est logique (archivage) et non physique.
- Le consentement du bénéficiaire est requis pour le partage d’informations avec les proches aidants

**Cas d’usage :**
- Créer une fiche bénéficiaire.
- Modifier une fiche bénéficiaire.
- Consulter une fiche bénéficiaire.
- Archiver une fiche bénéficiaire.
- Rechercher un bénéficiaire par nom, numéro, secteur, organisme payeur.
- Imprimer ou exporter une fiche bénéficiaire.

**Acteurs concernés :** Coordinateur, administrateur, service facturation, bénéficiaire (consultation partielle), proche aidant (consultation autorisée).

**Critères d’acceptation :**
- La fiche bénéficiaire est complète et conforme aux champs obligatoires.
- Les droits d’accès sont respectés.
- L’historique des modifications est disponible.

### 5.2 Gestion des proches aidants
**Objectif :** Identifier et gérer les personnes de l’entourage intervenant dans l’accompagnement.

**Données manipulées :**
- Identité, coordonnées, lien de parenté.
- Autorisations données par le bénéficiaire.
- Préférences de communication.

**Règles de gestion :**
- Un proche aidant est rattaché à un ou plusieurs bénéficiaires.
- L’accès aux informations du bénéficiaire est conditionné à une autorisation explicite.
- Toute modification est tracée.

**Cas d’usage :**
- Créer une fiche proche aidant.
- Rattacher un proche aidant à un bénéficiaire.
- Modifier les autorisations.
- Consulter les informations autorisées.
- Recevoir des notifications.

**Acteurs concernés :** Coordinateur, administrateur, bénéficiaire, proche aidant.

**Critères d’acceptation :**
- Les autorisations sont correctement appliquées.
- Les notifications sont reçues selon les préférences.

### 5.3 Gestion des intervenants
**Objectif :** Gérer les professionnels réalisant les interventions.

**Données manipulées :**
- Identité, coordonnées, photographie.
- Statut : salarié, bénévole, prestataire.
- Qualifications, diplômes, habilitations.
- Secteurs géographiques d’intervention.
- Disponibilités et indisponibilités.
- Préférences : types de bénéficiaires, horaires.
- Évaluations et retours.

**Règles de gestion :**
- Un intervenant est identifié par un numéro unique.
- Les habilitations doivent être valides pour affecter un intervenant à certains actes.
- Les disponibilités sont mises à jour par l’intervenant ou le coordinateur.
- Toute modification est tracée.

**Cas d’usage :**
- Créer une fiche intervenant.
- Modifier une fiche intervenant.
- Consulter une fiche intervenant.
- Gérer les disponibilités.
- Affecter un intervenant à une intervention.
- Évaluer un intervenant.

**Acteurs concernés :** Coordinateur, administrateur, intervenant, responsable qualité.

**Critères d’acceptation :**
- Les habilitations sont contrôlées.
- Les disponibilités sont prises en compte.
- L’historique des affectations est disponible.

### 5.4 Gestion des interventions
**Objectif :** Organiser, planifier et suivre les interventions au domicile des bénéficiaires.

**Données manipulées :**
- Bénéficiaire concerné.
- Intervenant affecté.
- Date, heure de début, heure de fin, durée.
- Type d’intervention : aide à la personne, soins, accompagnement, lien social.
- Lieu : domicile, extérieur.
- Statut : planifiée, en cours, réalisée, annulée, reportée.
- Compte rendu associé.
- Incidents signalés.

**Règles de gestion :**
- Une intervention ne peut être planifiée que si le bénéficiaire et l’intervenant sont disponibles.
- Un intervenant ne peut pas avoir deux interventions simultanées.
- Un bénéficiaire ne peut pas avoir deux interventions simultanées.
- Les interventions urgentes peuvent être créées avec validation a posteriori.
- Toute modification est tracée.
- Les interventions réalisées sont verrouillées après validation du compte rendu.

**Cas d’usage :**
- Créer une intervention.
- Modifier une intervention.
- Annuler une intervention.
- Reporter une intervention.
- Affecter ou réaffecter un intervenant.
- Consulter les interventions par jour, semaine, mois, bénéficiaire, intervenant.
- Valider une intervention.

**Acteurs concernés :** Coordinateur, intervenant, bénéficiaire, proche aidant.

**Critères d’acceptation :**
- Les conflits d’horaires sont détectés.
- Les interventions sont visibles selon les droits.
- Les modifications sont historisées.

### 5.5 Organisation et réorganisation des interventions
**Objectif :** Permettre une gestion souple et réactive des interventions.

**Données manipulées :**
- Disponibilités des intervenants.
- Absences.
- Urgences.
- Priorités.
- Secteurs géographiques.

**Règles de gestion :**
- En cas d’absence, le coordinateur propose des remplaçants selon les compétences et la proximité.
- Les interventions non pourvues sont signalées.
- Les réorganisations sont tracées.
- Les bénéficiaires et proches aidants sont notifiés des changements.

**Cas d’usage :**
- Détecter une absence.
- Rechercher un remplaçant.
- Réaffecter une intervention.
- Notifier les acteurs.
- Consulter l’historique des réorganisations.

**Acteurs concernés :** Coordinateur, intervenant, bénéficiaire, proche aidant.

**Critères d’acceptation :**
- Le remplacement est effectué dans les délais.
- Les notifications sont envoyées.
- L’historique est complet.

### 5.6 Suivi des interventions et comptes rendus
**Objectif :** Assurer la traçabilité des actions réalisées et le suivi de la qualité.

**Données manipulées :**
- Compte rendu : observations, actes réalisés, état du bénéficiaire, incidents, durée réelle.
- Photos ou documents joints (si autorisé).
- Validation par le bénéficiaire ou le proche aidant.
- Signature électronique (si prévue).

**Règles de gestion :**
- Un compte rendu est obligatoire après chaque intervention.
- Le compte rendu est validé par le coordinateur.
- Les informations médicales sont confidentielles.
- Toute modification d’un compte rendu validé est tracée.
- Les comptes rendus sont conservés selon la durée légale.

**Cas d’usage :**
- Saisir un compte rendu.
- Consulter un compte rendu.
- Valider un compte rendu.
- Modifier un compte rendu (avec justification).
- Exporter des comptes rendus.

**Acteurs concernés :** Intervenant, coordinateur, bénéficiaire, proche aidant, responsable qualité.

**Critères d’acceptation :**
- Le compte rendu est complet et conforme.
- La validation est tracée.
- L’accès est restreint.

### 5.7 Gestion des absences et des remplacements
**Objectif :** Gérer les indisponibilités des intervenants et des bénéficiaires.

**Données manipulées :**
- Absences planifiées : congés, formations, arrêts maladie.
- Absences imprévues.
- Absences des bénéficiaires : hospitalisation, voyage, refus.
- Motifs.
- Justificatifs.

**Règles de gestion :**
- Toute absence doit être enregistrée.
- Les interventions impactées sont signalées.
- Les remplacements sont proposés.
- Les absences sont prises en compte dans les indicateurs.

**Cas d’usage :**
- Déclarer une absence.
- Consulter les absences.
- Modifier une absence.
- Annuler une absence.
- Générer un état des absences.

**Acteurs concernés :** Intervenant, coordinateur, administrateur, bénéficiaire.

**Critères d’acceptation :**
- Les absences sont correctement enregistrées.
- Les impacts sont visibles.
- Les remplacements sont tracés.

### 5.8 Gestion documentaire
**Objectif :** Centraliser et gérer les documents associés aux bénéficiaires, intervenants et interventions.

**Données manipulées :**
- Documents administratifs : contrats, avenants, justificatifs.
- Documents médicaux : ordonnances, comptes rendus médicaux.
- Documents professionnels : diplômes, habilitations.
- Documents de suivi : évaluations, rapports.

**Règles de gestion :**
- Les documents sont classés par catégorie.
- L’accès est restreint selon les droits.
- Les documents sont versionnés.
- La suppression est logique.
- La durée de conservation est définie.

**Cas d’usage :**
- Téléverser un document.
- Consulter un document.
- Télécharger un document.
- Supprimer un document.
- Rechercher un document.

**Acteurs concernés :** Administrateur, coordinateur, service facturation, responsable qualité.

**Critères d’acceptation :**
- Les documents sont accessibles selon les droits.
- Les versions sont conservées.
- La traçabilité est assurée.

### 5.9 Facturation et paiements
**Objectif :** Générer les factures et suivre les règlements.

**Données manipulées :**
- Interventions réalisées.
- Tarifs.
- Organismes payeurs.
- Part bénéficiaire.
- Factures émises.
- Paiements reçus.
- Impayés.

**Règles de gestion :**
- Une facture est générée à partir des interventions validées.
- Les tarifs sont paramétrables.
- Les organismes payeurs sont associés aux bénéficiaires.
- Les paiements sont enregistrés.
- Les relances sont automatisées.
- Toute modification est tracée.

**Cas d’usage :**
- Générer une facture.
- Consulter une facture.
- Enregistrer un paiement.
- Relancer un impayé.
- Exporter les factures.

**Acteurs concernés :** Service facturation, coordinateur, bénéficiaire, organisme payeur.

**Critères d’acceptation :**
- Les factures sont conformes.
- Les paiements sont correctement imputés.
- Les relances sont envoyées.

### 5.10 Communication et notifications
**Objectif :** Faciliter les échanges entre les acteurs.

**Données manipulées :**
- Messages.
- Notifications.
- Alertes.
- Préférences de communication.

**Règles de gestion :**
- Les notifications sont envoyées selon les préférences.
- Les messages sont tracés.
- Les alertes critiques sont prioritaires.
- Les données personnelles ne sont pas diffusées sans consentement.

**Cas d’usage :**
- Envoyer un message.
- Recevoir une notification.
- Consulter l’historique des échanges.
- Paramétrer ses préférences.

**Acteurs concernés :** Tous les acteurs.

**Critères d’acceptation :**
- Les notifications sont reçues.
- L’historique est disponible.
- Les préférences sont respectées.

### 5.11 Tableaux de bord et indicateurs
**Objectif :** Fournir une vision synthétique de l’activité.

**Données manipulées :**
- Nombre d’interventions.
- Taux de réalisation.
- Taux d’absentéisme.
- Satisfaction des bénéficiaires.
- Délais de prise en charge.
- Coûts.
- Indicateurs qualité.

**Règles de gestion :**
- Les indicateurs sont calculés en temps réel ou différé.
- Les données sont agrégées.
- L’accès dépend du rôle.
- Les tableaux de bord sont exportables.

**Cas d’usage :**
- Consulter un tableau de bord.
- Filtrer les données.
- Exporter un rapport.
- Paramétrer un indicateur.

**Acteurs concernés :** Direction, responsable qualité, coordinateur.

**Critères d’acceptation :**
- Les indicateurs sont fiables.
- Les exports sont conformes.
- L’accès est restreint.

### 5.12 Recherche et filtres
**Objectif :** Permettre une recherche rapide et précise.

**Données manipulées :**
- Critères de recherche : nom, date, statut, secteur, intervenant, bénéficiaire.
- Filtres avancés.
- Tri.

**Règles de gestion :**
- La recherche respecte les droits d’accès.
- Les résultats sont paginés.
- Les critères sont combinables.

**Cas d’usage :**
- Rechercher un bénéficiaire.
- Rechercher une intervention.
- Filtrer les comptes rendus.
- Trier les résultats.

**Acteurs concernés :** Tous les acteurs.

**Critères d’acceptation :**
- Les résultats sont pertinents.
- Les performances sont satisfaisantes.
- Les droits sont respectés.

### 5.13 Administration et paramétrage
**Objectif :** Gérer les paramètres généraux et les droits.

**Données manipulées :**
- Comptes utilisateurs.
- Rôles et permissions.
- Paramètres généraux : nom de la structure, coordonnées, tarifs, secteurs.
- Référentiels : types d’intervention, motifs d’absence, catégories de documents.

**Règles de gestion :**
- Seul l’administrateur peut modifier les paramètres.
- Les modifications sont tracées.
- Les rôles sont prédéfinis et personnalisables.
- Les comptes inactifs sont désactivés.

**Cas d’usage :**
- Créer un compte.
- Modifier un compte.
- Désactiver un compte.
- Attribuer un rôle.
- Modifier un paramètre.
- Gérer les référentiels.

**Acteurs concernés :** Administrateur fonctionnel, équipe technique.

**Critères d’acceptation :**
- Les droits sont correctement appliqués.
- Les paramètres sont pris en compte.
- La traçabilité est assurée.

### 5.14 Journalisation et audit
**Objectif :** Assurer la traçabilité des actions et faciliter les audits.

**Données manipulées :**
- Date, heure, auteur, action, objet, résultat.
- Adresse IP.
- Type d’événement : connexion, modification, suppression, consultation.

**Règles de gestion :**
- Toutes les actions sensibles sont journalisées.
- Les journaux sont conservés selon la durée légale.
- Les journaux sont inaltérables.
- L’accès aux journaux est restreint.

**Cas d’usage :**
- Consulter les journaux.
- Filtrer les journaux.
- Exporter les journaux.
- Auditer les accès.

**Acteurs concernés :** Responsable qualité, administrateur, équipe technique.

**Critères d’acceptation :**
- Les journaux sont complets.
- L’accès est restreint.
- Les exports sont conformes.

---

## 6. Besoins non fonctionnels

### 6.1 Performance
- Le temps de réponse des pages doit être inférieur à 3 secondes en conditions normales.
- Le système doit supporter au moins 100 utilisateurs simultanés.
- Les recherches doivent retourner des résultats en moins de 2 secondes.
- Les exports de données ne doivent pas bloquer l’utilisation.

### 6.2 Disponibilité
- Le système doit être disponible 24 heures sur 24, 7 jours sur 7.
- Le taux de disponibilité annuel doit être supérieur à 99,5 %.
- Les interruptions planifiées doivent être annoncées à l’avance.
- Un plan de reprise d’activité doit être défini.

### 6.3 Sécurité
- Authentification obligatoire pour tous les utilisateurs.
- Gestion des rôles et des permissions.
- Mots de passe conformes aux recommandations de la CNIL.
- Verrouillage après plusieurs tentatives échouées.
- Chiffrement des données sensibles.
- Protection contre les attaques courantes.
- Journalisation des accès.
- Sauvegardes régulières.
- Procédure de restauration.

### 6.4 Confidentialité
- Conformité au RGPD.
- Consentement explicite pour le partage de données.
- Minimisation des données collectées.
- Droit d’accès, de rectification et d’effacement.
- Durée de conservation limitée.
- Registre des traitements.
- Désignation d’un délégué à la protection des données.

### 6.5 Ergonomie
- Interface intuitive et cohérente.
- Navigation simple.
- Aide contextuelle.
- Messages d’erreur clairs.
- Accessibilité pour les personnes en situation de handicap.
- Compatibilité avec les lecteurs d’écran.
- Contraste suffisant.
- Taille de police ajustable.

### 6.6 Compatibilité
- Fonctionnement sur les principaux navigateurs du marché.
- Adaptation aux tablettes et smartphones.
- Compatibilité avec les systèmes d’exploitation courants.
- Impression des documents.

### 6.7 Maintenabilité
- Code documenté et modulaire.
- Documentation technique à jour.
- Facilité de correction et d’évolution.
- Tests automatisés.
- Environnements de développement, de recette et de production.

### 6.8 Scalabilité
- Capacité à augmenter le nombre d’utilisateurs.
- Capacité à augmenter le volume de données.
- Capacité à ajouter des fonctionnalités sans refonte majeure.

### 6.9 Sauvegarde
- Sauvegardes quotidiennes.
- Conservation des sauvegardes sur une période définie.
- Tests de restauration réguliers.
- Stockage sécurisé des sauvegardes.

### 6.10 Traçabilité
- Historique des modifications.
- Journalisation des actions.
- Traçabilité des accès.
- Traçabilité des exports.

### 6.11 Conformité réglementaire
- Respect du RGPD.
- Respect du secret professionnel.
- Respect des obligations légales du secteur.
- Respect des normes en vigueur.

### 6.12 Langue
- Interface en français.
- Documentation en français.
- Possibilité d’ajouter d’autres langues ultérieurement.

### 6.13 Support
- Assistance aux utilisateurs.
- Documentation utilisateur.
- Formation.
- Canal de signalement des incidents.

---

## 7. Contraintes

### 7.1 Contraintes légales
- Respect du RGPD.
- Respect du secret professionnel.
- Respect du code de l’action sociale et des familles.
- Respect du code du travail.
- Respect des obligations de facturation.

### 7.2 Contraintes organisationnelles
- Disponibilité limitée des acteurs pour les validations.
- Nécessité de former les utilisateurs.
- Coordination avec les partenaires.
- Respect des procédures internes.

### 7.3 Contraintes techniques
- L’application doit être accessible via un navigateur web.
- Elle doit s’intégrer à l’environnement existant.
- Elle doit respecter les politiques de sécurité.
- Elle ne doit pas imposer de technologie spécifique.
- Elle doit être compatible avec les équipements des utilisateurs.

### 7.4 Contraintes de durée
- La durée totale du projet est fixée à un mois.
- Aucun planning détaillé n’est imposé dans le présent document.
- Les livrables doivent être fournis dans ce délai.

### 7.5 Contraintes budgétaires
- Le budget alloué est défini par la direction.
- Aucun dépassement ne sera accepté sans validation.

### 7.6 Contraintes de ressources
- L’équipe projet est composée de personnes aux compétences complémentaires.
- Les ressources matérielles et logicielles sont fournies par la structure.

### 7.7 Contraintes de sécurité
- Les données doivent être hébergées dans un environnement sécurisé.
- Les accès doivent être strictement contrôlés.
- Les sauvegardes doivent être chiffrées.

---

## 8. Livrables

### 8.1 Livrables documentaires
- Cahier des charges validé.
- Spécifications fonctionnelles détaillées.
- Spécifications techniques.
- Modèle de données.
- Maquettes fonctionnelles.
- Plan de tests.
- Cahier de recette.
- Documentation utilisateur.
- Documentation technique.
- Guide d’exploitation.
- Procès-verbaux de recette.
- Rapport de fin de projet.

### 8.2 Livrables logiciels
- Application web opérationnelle.
- Composants logiciels.
- Scripts d’installation.
- Jeux de données de test.
- Sauvegardes initiales.

### 8.3 Livrables de formation
- Supports de formation.
- Sessions de formation.
- Guide de prise en main.

---

## 9. Recette

### 9.1 Recette fonctionnelle
- Vérification de chaque fonctionnalité.
- Vérification des règles de gestion.
- Vérification des cas d’usage.
- Vérification des droits d’accès.

### 9.2 Recette non fonctionnelle
- Tests de performance.
- Tests de charge.
- Tests de sécurité.
- Tests de compatibilité.
- Tests d’accessibilité.
- Tests de sauvegarde et de restauration.

### 9.3 Recette utilisateur
- Tests par les utilisateurs finaux.
- Validation des parcours.
- Retours et corrections.

### 9.4 Critères d’acceptation
- Toutes les fonctionnalités sont conformes.
- Les performances sont atteintes.
- La sécurité est assurée.
- La documentation est complète.
- Les utilisateurs sont formés.
- Les livrables sont fournis.

---

## 10. Sécurité et protection des données

### 10.1 Authentification
- Identifiant unique.
- Mot de passe robuste.
- Double authentification pour les rôles sensibles.
- Réinitialisation sécurisée.

### 10.2 Autorisation
- Rôles et permissions.
- Principe du moindre privilège.
- Contrôle d’accès aux données.
- Séparation des tâches.

### 10.3 Protection des données
- Chiffrement des données sensibles.
- Anonymisation pour les statistiques.
- Pseudonymisation.
- Consentement.
- Droit à l’effacement.
- Registre des traitements.

### 10.4 Journalisation
- Journal des connexions.
- Journal des modifications.
- Journal des consultations sensibles.
- Conservation des journaux.

### 10.5 Sauvegardes
- Sauvegardes quotidiennes.
- Sauvegardes hebdomadaires complètes.
- Stockage hors site.
- Tests de restauration.

### 10.6 Gestion des incidents
- Procédure de signalement.
- Procédure de traitement.
- Notification à la CNIL en cas de violation.
- Information des personnes concernées.

---

## 11. Documentation et formation

### 11.1 Documentation technique
- Architecture.
- Modèle de données.
- Description des composants.
- Procédures d’installation.
- Procédures d’exploitation.
- Procédures de maintenance.

### 11.2 Documentation utilisateur
- Guide de prise en main.
- Manuel par rôle.
- FAQ.
- Tutoriels.
- Aide contextuelle.

### 11.3 Formation
- Formation des administrateurs.
- Formation des coordinateurs.
- Formation des intervenants.
- Formation du service facturation.
- Formation des utilisateurs bénéficiaires et proches aidants.

---

## 12. Maintenance et support

### 12.1 Maintenance corrective
- Correction des anomalies.
- Délais d’intervention définis.
- Suivi des incidents.

### 12.2 Maintenance évolutive
- Ajout de fonctionnalités.
- Adaptation aux évolutions réglementaires.
- Amélioration continue.

### 12.3 Maintenance préventive
- Mises à jour de sécurité.
- Optimisation des performances.
- Contrôles réguliers.

### 12.4 Support utilisateur
- Canal de contact.
- Horaires de support.
- Niveaux de service.
- Escalade.

---

## 13. Glossaire

| Terme | Définition |
|---|---|
| **Bénéficiaire** | Personne prise en charge par la structure. |
| **Proche aidant** | Personne de l’entourage du bénéficiaire. |
| **Intervenant** | Professionnel réalisant les interventions. |
| **Coordinateur** | Personne chargée de l’organisation et du suivi. |
| **Intervention** | Prestation réalisée au domicile. |
| **Compte rendu** | Document synthétique après intervention. |
| **RGPD** | Règlement général sur la protection des données. |
| **CNIL** | Commission nationale de l’informatique et des libertés. |
| **MDPH** | Maison départementale des personnes handicapées. |
| **APA** | Allocation personnalisée d’autonomie. |
| **PCH** | Prestation de compensation du handicap. |
| **CAF** | Caisse d’allocations familiales. |
| **CPAM** | Caisse primaire d’assurance maladie. |

---

## 14. Annexes

### 14.1 Liste des annexes
- Annexe 1 : Modèle de fiche bénéficiaire.
- Annexe 2 : Modèle de fiche intervenant.
- Annexe 3 : Modèle de compte rendu.
- Annexe 4 : Modèle de facture.
- Annexe 5 : Charte d’utilisation.
- Annexe 6 : Politique de confidentialité.
- Annexe 7 : Plan de reprise d’activité.
- Annexe 8 : Matrice des droits.

### 14.2 Validation
| Nom | Fonction | Date | Signature |
|---|---|---|---|
| | Direction | | |
| | Maîtrise d’ouvrage | | |
| | Maîtrise d’œuvre | | |
| | Responsable qualité | | |
| | Administrateur fonctionnel | | |

---

*Fin du cahier des charges.*