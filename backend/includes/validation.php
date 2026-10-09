<?php
// Validation des données reçues. Chaque champ est décrit par une « règle » (type, longueur max, obligatoire…).
//
// valider($donnees, $regles, $complet) renvoie [valeurs_nettoyées, erreurs]
//   $complet = true  : création (tous les champs sont attendus, les champs optionnels absents deviennent NULL)
//   $complet = false : modification partielle (seuls les champs envoyés sont contrôlés)
// Règle : ['libelle' => 'Le nom', 'type' => 'texte|date|courriel|telephone|choix|booleen',
//          'max' => 100, 'requis' => true, 'options' => [...], 'pas_futur' => true, 'defaut' => 0]
function valider(array $donnees, array $regles, bool $complet): array {
    $erreurs = [];
    $valeurs = [];
    foreach ($regles as $cle => $r) {
        $libelle = $r['libelle'] ?? $cle;
        $type = $r['type'] ?? 'texte';

        if (!array_key_exists($cle, $donnees)) {
            if ($complet) {
                if (!empty($r['requis'])) $erreurs[$cle] = "$libelle est obligatoire.";
                else $valeurs[$cle] = $r['defaut'] ?? null;
            }
            continue;
        }

        $brut = $donnees[$cle];

        if ($type === 'booleen') {
            if (in_array($brut, [true, 1, '1', 'true'], true))       $valeurs[$cle] = 1;
            elseif (in_array($brut, [false, 0, '0', 'false'], true)) $valeurs[$cle] = 0;
            else $erreurs[$cle] = "$libelle est invalide.";
            continue;
        }

        $v = is_string($brut) ? trim($brut) : $brut;
        if ($v === '' || $v === null) {
            if (!empty($r['requis']) || !empty($r['requis_si_present'])) $erreurs[$cle] = "$libelle est obligatoire.";
            else $valeurs[$cle] = null;
            continue;
        }
        if (!is_string($v)) { $erreurs[$cle] = "$libelle est invalide."; continue; }

        $max = $r['max'] ?? 255;
        if (mb_strlen($v) > $max) { $erreurs[$cle] = "$libelle ne doit pas dépasser $max caractères."; continue; }

        switch ($type) {
            case 'date':
                $d = DateTime::createFromFormat('!Y-m-d', $v);
                $ok = $d && $d->format('Y-m-d') === $v && $v >= '1900-01-01';
                if (!$ok) { $erreurs[$cle] = "$libelle n'est pas une date valide."; continue 2; }
                if (!empty($r['pas_futur']) && $v > date('Y-m-d')) { $erreurs[$cle] = "$libelle ne peut pas être dans le futur."; continue 2; }
                break;
            case 'courriel':
                if (!filter_var($v, FILTER_VALIDATE_EMAIL)) { $erreurs[$cle] = "$libelle n'est pas une adresse valide."; continue 2; }
                break;
            case 'telephone':
                if (!preg_match('/^[0-9 +().-]{3,20}$/', $v)) { $erreurs[$cle] = "$libelle n'est pas un numéro valide."; continue 2; }
                break;
            case 'choix':
                if (!in_array($v, $r['options'], true)) { $erreurs[$cle] = "$libelle n'est pas une valeur autorisée."; continue 2; }
                break;
        }
        $valeurs[$cle] = $v;
    }
    return [$valeurs, $erreurs];
}

// Vrai si l'erreur SQL vient d'une contrainte d'unicité (MySQL : code 1062 ; SQLite : « UNIQUE constraint »).
function est_doublon(PDOException $e): bool {
    return (($e->errorInfo[1] ?? 0) === 1062) || strpos($e->getMessage(), 'UNIQUE constraint') !== false;
}
