<?php
// Referentiels (types d'intervention, motifs d'absence, categories de documents) : listes que l'administrateur peut completer.
// Si la table n'existe pas encore (ajout-administration.sql non execute), on retombe sur les valeurs d'origine du code.

const CATEGORIES_REFERENTIEL = [
    'type_intervention'          => "Types d'intervention",
    'motif_absence_intervenant'  => "Motifs d'absence des intervenants",
    'motif_absence_beneficiaire' => "Motifs d'absence des bénéficiaires",
    'categorie_document'         => 'Catégories de documents',
];

// Valeurs ACTIVES d'une categorie (ce que l'on peut choisir dans un formulaire).
function referentiel_valeurs(string $categorie, array $defaut): array {
    try {
        $st = db()->prepare('SELECT valeur FROM referentiel WHERE categorie = ? AND actif = 1 ORDER BY id_referentiel');
        $st->execute([$categorie]);
        $v = array_column($st->fetchAll(), 'valeur');
        return $v ?: $defaut;
    } catch (Throwable $e) { return $defaut; }
}

// « Arrêt maladie » -> « arret maladie » : valeur stockee sans accents, en minuscules.
function valeur_depuis_libelle(string $libelle): string {
    $v = strtr(mb_strtolower(trim($libelle), 'UTF-8'), [
        'à' => 'a', 'â' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'î' => 'i', 'ï' => 'i',
        'ô' => 'o', 'ö' => 'o', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c', 'œ' => 'oe', 'æ' => 'ae', '’' => ' ', "'" => ' ',
    ]);
    return trim(preg_replace('/\s+/', ' ', preg_replace('/[^a-z0-9 ]/', ' ', $v)));
}
