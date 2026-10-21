<?php
// Gestion documentaire : regles communes (droits par role, formats acceptes, conservation).
require_once __DIR__ . '/referentiels.php';

const DOSSIER_STOCKAGE = __DIR__ . '/../stockage';
const TAILLE_MAX_DOCUMENT = 5 * 1024 * 1024;   // 5 Mo (verifier aussi upload_max_filesize dans php.ini)
const ROLES_DOCUMENTS = ['administrateur', 'coordinateur', 'facturation', 'responsable_qualite'];
const CATEGORIES_MEDICALES = ['ordonnance', 'compte rendu medical'];   // reservees au coordinateur (comme le dossier medical)
const CATEGORIES_DOCUMENT_DEFAUT = ['contrat', 'avenant', 'justificatif', 'ordonnance', 'compte rendu medical', 'diplome', 'habilitation', 'evaluation', 'rapport'];

// extension -> types MIME acceptes (verifies sur le contenu du fichier quand l'extension PHP fileinfo est disponible)
const FORMATS_DOCUMENT = [
    'pdf'  => ['application/pdf'],
    'jpg'  => ['image/jpeg'], 'jpeg' => ['image/jpeg'], 'png' => ['image/png'],
    'doc'  => ['application/msword', 'application/x-ole-storage', 'application/CDFV2', 'application/octet-stream'],
    'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    'odt'  => ['application/vnd.oasis.opendocument.text', 'application/zip'],
];
const AFFICHABLES_DOCUMENT = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png'];

// Droits d'un role : categories lisibles / deposables (null = toutes celles autorisees) et possibilite d'archiver.
//  coordinateur : tout, y compris les documents medicaux       administrateur : tout sauf les documents medicaux
//  facturation  : contrats, avenants, justificatifs des beneficiaires (lecture + depot)
//  qualite      : evaluations, rapports, diplomes, habilitations (lecture) ; evaluations et rapports (depot)
function droits_documents(string $role): array {
    switch ($role) {
        case 'coordinateur':        return ['lire' => null, 'ecrire' => null, 'archiver' => true, 'medical' => true, 'beneficiaires_seulement' => false];
        case 'administrateur':      return ['lire' => null, 'ecrire' => null, 'archiver' => true, 'medical' => false, 'beneficiaires_seulement' => false];
        case 'facturation':         return ['lire' => ['contrat', 'avenant', 'justificatif'], 'ecrire' => ['contrat', 'avenant', 'justificatif'], 'archiver' => false, 'medical' => false, 'beneficiaires_seulement' => true];
        case 'responsable_qualite': return ['lire' => ['evaluation', 'rapport', 'diplome', 'habilitation'], 'ecrire' => ['evaluation', 'rapport'], 'archiver' => false, 'medical' => false, 'beneficiaires_seulement' => false];
    }
    return ['lire' => [], 'ecrire' => [], 'archiver' => false, 'medical' => false, 'beneficiaires_seulement' => true];
}
function peut_lire_categorie(array $d, string $cat): bool {
    if (in_array($cat, CATEGORIES_MEDICALES, true)) return $d['medical'];
    return $d['lire'] === null || in_array($cat, $d['lire'], true);
}
function peut_ecrire_categorie(array $d, string $cat): bool {
    if (in_array($cat, CATEGORIES_MEDICALES, true)) return $d['medical'];
    return $d['ecrire'] === null || in_array($cat, $d['ecrire'], true);
}
// Peut-on voir/modifier CE document (ligne de la table) ?
function peut_acceder_document(array $d, array $ligne): bool {
    if ($d['beneficiaires_seulement'] && empty($ligne['id_beneficiaire'])) return false;
    return peut_lire_categorie($d, (string)$ligne['categorie']);
}

function duree_conservation_ans(): int {
    try {
        $st = db()->prepare("SELECT valeur FROM parametre WHERE cle = 'duree_conservation_ans'"); $st->execute();
        $v = (int)$st->fetchColumn();
        return $v > 0 ? $v : 5;
    } catch (Throwable $e) { return 5; }
}
// Date jusqu'a laquelle un document doit etre conserve : depot + duree.
function conserver_jusqu_au(string $date_depot, int $ans): string {
    $d = DateTime::createFromFormat('!Y-m-d', substr($date_depot, 0, 10));
    return $d ? $d->modify("+$ans years")->format('Y-m-d') : '';
}
function extension_document(string $nom): string { return strtolower(pathinfo($nom, PATHINFO_EXTENSION)); }
// Nom de fichier sans caracteres dangereux pour un en-tete HTTP.
function nom_fichier_sur(string $nom): string {
    $n = preg_replace('/[^\p{L}\p{N}._ -]+/u', '_', basename(str_replace('\\', '/', $nom)));
    return trim($n) !== '' ? mb_substr($n, 0, 150) : 'document';
}
