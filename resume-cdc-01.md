# Résumé du cahier des charges

**Projet :** application web de gestion des interventions et du suivi des bénéficiaires pour une structure d’aide à domicile. **Version 1.0 – validé pour conception.**


## 1. Objet

Concevoir une application web centralisée pour une structure intervenant auprès de personnes âgées, en situation de handicap ou en perte d’autonomie.


## 2. Contexte et problématique

La gestion actuelle repose sur des registres papier, des tableurs, des courriels et des appels téléphoniques. Conséquences :

- pas de référentiel unique ;
- erreurs et pertes d’information ;
- plannings et factures lents à produire ;
- risque de non-conformité RGPD ;
- absence d’indicateurs de pilotage fiables.


## 3. Périmètre fonctionnel

- **Référentiels :** bénéficiaires, proches aidants, intervenants.
- **Interventions :** planification avec détection des conflits d’horaires, réorganisation en cas d’absence ou d’urgence, comptes rendus obligatoires validés par le coordinateur.
- **Absences et remplacements :** proposition de remplaçants selon les compétences et la proximité.
- **Gestion documentaire :** documents versionnés, suppression logique.
- **Facturation et paiements :** factures générées à partir des interventions validées, relances automatisées.
- **Communication et notifications**, **tableaux de bord**, **recherche et filtres**.
- **Administration** (comptes, rôles, paramètres) et **journalisation / audit**.

**Exclus :** comptabilité, paie, RH, télétransmission avec la Sécurité sociale, messagerie instantanée, visioconférence, applications mobiles natives, dispositifs médicaux.


## 4. Acteurs

Bénéficiaires, proches aidants, intervenants, coordinateurs, responsable qualité, administrateur fonctionnel, service facturation, direction, équipe technique, organismes payeurs et médecins prescripteurs. Chaque rôle a des droits précis (principe du moindre privilège).


## 5. Règles de gestion clés

- Identifiants uniques ; archivage plutôt que suppression.
- Toute modification est tracée (date, heure, auteur).
- Les données médicales sont confidentielles.
- Le consentement du bénéficiaire est requis pour partager ses informations avec ses proches.
- Un intervenant ou un bénéficiaire ne peut pas avoir deux interventions simultanées.
- Une intervention validée est verrouillée.


## 6. Exigences non fonctionnelles

- **Performance :** pages en moins de 3 s, recherches en moins de 2 s, au moins 100 utilisateurs simultanés.
- **Disponibilité :** 24h/24 et 7j/7, plus de 99,5 % par an.
- **Sécurité :** double authentification pour les rôles sensibles, chiffrement, sauvegardes quotidiennes et hebdomadaires avec stockage hors site, journaux inaltérables.
- **Conformité :** RGPD (droit à l’effacement, registre des traitements, délégué à la protection des données).
- **Accessibilité :** lecteurs d’écran, contraste, police ajustable.
- **Compatibilité :** principaux navigateurs, tablettes et smartphones (responsive).
- **Autres :** interface en français, code modulaire et testé.


## 7. Contraintes

- Durée totale du projet : **un mois**.
- Budget fixé par la direction, sans dépassement sans validation.
- Application accessible par navigateur, sans technologie imposée.
- Hébergement sécurisé et sauvegardes chiffrées.


## 8. Livrables

- **Documents :** spécifications, modèle de données, maquettes, plan de tests, cahier de recette, documentations, rapport de fin de projet.
- **Logiciel :** application opérationnelle, scripts d’installation, jeux de test.
- **Formation :** supports, sessions par rôle, guide de prise en main.


## 9. Recette et acceptation

Recette fonctionnelle, non fonctionnelle (performance, charge, sécurité, accessibilité, restauration) et utilisateur. L’acceptation exige des fonctionnalités conformes, des performances atteintes, la sécurité assurée, la documentation complète et les utilisateurs formés.


## 10. Après la livraison

Maintenance corrective, évolutive et préventive, et support utilisateur avec niveaux de service et escalade. Le document comprend aussi un glossaire, 8 annexes (modèles de fiches, charte, plan de reprise d’activité, matrice des droits…) et un tableau de validation.


## Point d’attention

Un délai d’un mois est très serré pour 14 domaines fonctionnels avec des exigences fortes de sécurité et de conformité RGPD. Il serait prudent de prioriser un socle minimal (bénéficiaires, interventions, comptes rendus).
