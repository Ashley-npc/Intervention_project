<?php
// Gestion documentaire : depot, versions, consultation, telechargement, recherche, suppression LOGIQUE.
// Acces : administrateur, coordinateur, facturation, responsable qualite (voir includes/documents.php pour le detail des droits).
//   GET    documents.php?q=&categorie=&id_beneficiaire=&id_intervenant=&id_intervention=&archives=1   liste (derniere version de chaque document)
//   GET    documents.php?id=5&versions=1      toutes les versions du document
//   GET    documents.php?id=5&voir=1          ouvre le fichier dans le navigateur (PDF, images)      \ chaque acces est journalise
//   GET    documents.php?id=5&telecharger=1   telecharge le fichier                                  /
//   GET    documents.php?options=1            beneficiaires et intervenants (pour choisir un rattachement)
//   POST   documents.php  (formulaire multipart : fichier, categorie, titre?, commentaire?, id_beneficiaire | id_intervenant | id_intervention)  nouveau document
//   POST   documents.php  (multipart : fichier, nouvelle_version_de=5, commentaire?)                  nouvelle version
//   DELETE documents.php?id=5                 archive le document (toutes ses versions restent conservees)
//   PUT    documents.php?id=5 {archive:false} restaure un document archive
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/journal.php';
require __DIR__ . '/../includes/validation.php';
require __DIR__ . '/../includes/documents.php';

$user = exiger_connexion(ROLES_DOCUMENTS);
$droits = droits_documents($user['role']);
$methode = $_SERVER['REQUEST_METHOD'];
$id = (int)($_GET['id'] ?? 0);
function refus_doc(int $code, string $m, array $e = []) { json_out($code, ['ok' => false, 'message' => $m] + ($e ? ['erreurs' => $e] : [])); }

const GROUPE = 'COALESCE(d.id_groupe, d.id_document)';
const SELECT_DOC = 'SELECT d.id_document, d.id_groupe, d.titre, d.nom_fichier, d.categorie, d.version, d.date_depot, d.taille, d.archive, d.date_archivage, d.commentaire, d.fichier_stocke, d.type_mime,
        d.id_beneficiaire, d.id_intervenant, d.id_intervention, b.nom AS b_nom, b.prenom AS b_prenom, v.nom AS v_nom, v.prenom AS v_prenom, i.date AS i_date, u.identifiant AS depose_par,
        (SELECT COUNT(*) FROM document x WHERE COALESCE(x.id_groupe, x.id_document) = COALESCE(d.id_groupe, d.id_document)) AS nb_versions
        FROM document d LEFT JOIN beneficiaire b ON b.id_beneficiaire = d.id_beneficiaire LEFT JOIN intervenant v ON v.id_intervenant = d.id_intervenant
        LEFT JOIN intervention i ON i.id_intervention = d.id_intervention LEFT JOIN utilisateur u ON u.id_utilisateur = d.id_utilisateur';

function doc_vers_front(array $l, int $ans): array {
    if ($l['id_beneficiaire']) $r = ['type' => 'beneficiaire', 'id' => (int)$l['id_beneficiaire'], 'libelle' => trim($l['b_prenom'] . ' ' . $l['b_nom'])];
    elseif ($l['id_intervenant']) $r = ['type' => 'intervenant', 'id' => (int)$l['id_intervenant'], 'libelle' => trim($l['v_prenom'] . ' ' . $l['v_nom'])];
    elseif ($l['id_intervention']) $r = ['type' => 'intervention', 'id' => (int)$l['id_intervention'], 'libelle' => 'Intervention du ' . $l['i_date']];
    else $r = ['type' => null, 'id' => 0, 'libelle' => ''];
    $jusqu = conserver_jusqu_au((string)$l['date_depot'], $ans);
    return ['id' => (int)$l['id_document'], 'groupe' => (int)($l['id_groupe'] ?: $l['id_document']), 'titre' => $l['titre'] !== null && $l['titre'] !== '' ? $l['titre'] : $l['nom_fichier'],
            'nom_fichier' => $l['nom_fichier'], 'categorie' => $l['categorie'], 'version' => (int)$l['version'], 'nb_versions' => (int)$l['nb_versions'],
            'date_depot' => $l['date_depot'], 'taille' => $l['taille'] === null ? null : (int)$l['taille'], 'archive' => (bool)$l['archive'], 'date_archivage' => $l['date_archivage'],
            'commentaire' => $l['commentaire'], 'depose_par' => $l['depose_par'], 'rattache' => $r, 'conserver_jusqu_au' => $jusqu, 'echu' => $jusqu !== '' && $jusqu < date('Y-m-d'),
            'affichable' => isset(AFFICHABLES_DOCUMENT[extension_document($l['nom_fichier'])])];
}
function charger_doc(int $id): array {
    $st = db()->prepare(SELECT_DOC . ' WHERE d.id_document = ?'); $st->execute([$id]);
    $l = $st->fetch();
    if (!$l) refus_doc(404, 'Document introuvable.');
    return $l;
}
function categories_deposables(array $droits): array {
    $toutes = referentiel_valeurs('categorie_document', CATEGORIES_DOCUMENT_DEFAUT);
    return array_values(array_filter($toutes, function ($c) use ($droits) { return peut_ecrire_categorie($droits, $c); }));
}
function existe_ligne(string $table, string $col, int $id): bool { $st = db()->prepare("SELECT COUNT(*) FROM $table WHERE $col = ?"); $st->execute([$id]); return (bool)(int)$st->fetchColumn(); }

if ($methode === 'GET') {
    if (isset($_GET['options'])) {
        $b = db()->query('SELECT id_beneficiaire AS id, nom, prenom FROM beneficiaire WHERE archive = 0 ORDER BY nom, prenom')->fetchAll();
        $v = $droits['beneficiaires_seulement'] ? [] : db()->query('SELECT id_intervenant AS id, nom, prenom FROM intervenant WHERE actif = 1 ORDER BY nom, prenom')->fetchAll();
        json_out(200, ['ok' => true, 'beneficiaires' => $b, 'intervenants' => $v, 'categories' => categories_deposables($droits)]);
    }
    $ans = duree_conservation_ans();
    if ($id > 0) {
        $l = charger_doc($id);
        if (!peut_acceder_document($droits, $l)) refus_doc(403, "Vous n'avez pas accès à ce document.");
        if (isset($_GET['voir']) || isset($_GET['telecharger'])) {
            $chemin = realpath(DOSSIER_STOCKAGE) . DIRECTORY_SEPARATOR . basename((string)$l['fichier_stocke']);
            if (!$l['fichier_stocke'] || !is_file($chemin)) refus_doc(404, 'Le fichier est introuvable sur le serveur.');
            $ext = extension_document($l['nom_fichier']);
            $en_ligne = isset($_GET['voir']) && isset(AFFICHABLES_DOCUMENT[$ext]);
            journaliser($en_ligne ? 'consultation' : 'telechargement', 'document', 'document ' . $l['id_document'] . ' v' . $l['version']);
            $nom = nom_fichier_sur($l['nom_fichier']);
            header('Content-Type: ' . ($en_ligne ? AFFICHABLES_DOCUMENT[$ext] : 'application/octet-stream'));
            header('Content-Length: ' . filesize($chemin));
            header('Content-Disposition: ' . ($en_ligne ? 'inline' : 'attachment') . '; filename="' . str_replace('"', '', $nom) . '"; filename*=UTF-8\'\'' . rawurlencode($nom));
            header('X-Content-Type-Options: nosniff');
            header('Cache-Control: private, no-store');
            readfile($chemin);
            exit;
        }
        if (isset($_GET['versions'])) {
            $st = db()->prepare(SELECT_DOC . ' WHERE ' . GROUPE . ' = ? ORDER BY d.version DESC, d.id_document DESC'); $st->execute([(int)($l['id_groupe'] ?: $l['id_document'])]);
            json_out(200, ['ok' => true, 'items' => array_map(function ($x) use ($ans) { return doc_vers_front($x, $ans); }, $st->fetchAll())]);
        }
        json_out(200, ['ok' => true, 'item' => doc_vers_front($l, $ans)]);
    }
    // Liste : derniere version de chaque document, limitee aux categories que le role peut lire.
    $where = ['d.id_document = (SELECT MAX(x.id_document) FROM document x WHERE COALESCE(x.id_groupe, x.id_document) = ' . GROUPE . ')']; $p = [];
    if (empty($_GET['archives'])) $where[] = 'd.archive = 0';
    $toutes = array_unique(array_merge(referentiel_valeurs('categorie_document', CATEGORIES_DOCUMENT_DEFAUT), CATEGORIES_DOCUMENT_DEFAUT));
    $lisibles = array_values(array_filter($toutes, function ($c) use ($droits) { return peut_lire_categorie($droits, $c); }));
    if ($droits['lire'] !== null) {                 // role limite a une liste
        if (!$lisibles) json_out(200, ['ok' => true, 'items' => [], 'categories' => [], 'categories_depot' => []]);
        $where[] = 'd.categorie IN (' . implode(',', array_fill(0, count($lisibles), '?')) . ')'; $p = array_merge($p, $lisibles);
    } elseif (!$droits['medical']) {                // tout sauf le medical
        $where[] = 'd.categorie NOT IN (' . implode(',', array_fill(0, count(CATEGORIES_MEDICALES), '?')) . ')'; $p = array_merge($p, CATEGORIES_MEDICALES);
    }
    if ($droits['beneficiaires_seulement']) $where[] = 'd.id_beneficiaire IS NOT NULL';
    if (!empty($_GET['categorie'])) { $where[] = 'd.categorie = ?'; $p[] = (string)$_GET['categorie']; }
    foreach (['id_beneficiaire', 'id_intervenant', 'id_intervention'] as $f) if ((int)($_GET[$f] ?? 0) > 0) { $where[] = "d.$f = ?"; $p[] = (int)$_GET[$f]; }
    $q = trim((string)($_GET['q'] ?? ''));
    if ($q !== '') {
        $where[] = '(d.titre LIKE ? OR d.nom_fichier LIKE ? OR b.nom LIKE ? OR b.prenom LIKE ? OR v.nom LIKE ? OR v.prenom LIKE ?)';
        $m = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%'; array_push($p, $m, $m, $m, $m, $m, $m);
    }
    $st = db()->prepare(SELECT_DOC . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY d.date_depot DESC, d.id_document DESC LIMIT 300');
    $st->execute($p);
    json_out(200, ['ok' => true, 'items' => array_map(function ($x) use ($ans) { return doc_vers_front($x, $ans); }, $st->fetchAll()),
        'categories' => $lisibles, 'categories_depot' => categories_deposables($droits), 'peut_archiver' => $droits['archiver'], 'duree_conservation_ans' => $ans]);
}

if ($methode === 'POST') {
    // Le depot est un formulaire multipart (pas du JSON) : on exige un en-tete que seul notre propre script envoie (protection CSRF).
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'XMLHttpRequest') refus_doc(400, 'Requête invalide.');
    if (empty($_FILES['fichier']) || !is_array($_FILES['fichier'])) refus_doc(422, 'Choisissez un fichier.', ['fichier' => 'Choisissez un fichier.']);
    $f = $_FILES['fichier'];
    if ($f['error'] === UPLOAD_ERR_NO_FILE) refus_doc(422, 'Choisissez un fichier.', ['fichier' => 'Choisissez un fichier.']);
    if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE)
        refus_doc(413, 'Fichier trop volumineux pour le serveur (limite php.ini : upload_max_filesize). Maximum de l\'application : ' . (TAILLE_MAX_DOCUMENT / 1048576) . ' Mo.', ['fichier' => 'Fichier trop volumineux.']);
    if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) refus_doc(400, "Le dépôt du fichier a échoué. Réessayez.");
    if ($f['size'] > TAILLE_MAX_DOCUMENT) refus_doc(413, 'Fichier trop volumineux (maximum ' . (TAILLE_MAX_DOCUMENT / 1048576) . ' Mo).', ['fichier' => 'Maximum ' . (TAILLE_MAX_DOCUMENT / 1048576) . ' Mo.']);
    $nom = nom_fichier_sur((string)$f['name']);
    $ext = extension_document($nom);
    if (!isset(FORMATS_DOCUMENT[$ext])) refus_doc(422, 'Format non accepté. Formats : ' . implode(', ', array_keys(FORMATS_DOCUMENT)) . '.', ['fichier' => 'Format non accepté.']);
    $mime = null;
    if (function_exists('finfo_open')) {
        $fi = finfo_open(FILEINFO_MIME_TYPE); $mime = finfo_file($fi, $f['tmp_name']); finfo_close($fi);
        if (!in_array($mime, FORMATS_DOCUMENT[$ext], true)) refus_doc(422, "Le contenu du fichier ne correspond pas à son extension (.$ext).", ['fichier' => 'Contenu non conforme.']);
    }
    $commentaire = trim((string)($_POST['commentaire'] ?? ''));
    if (mb_strlen($commentaire) > 255) refus_doc(422, 'Commentaire trop long (255 caractères).', ['commentaire' => '255 caractères maximum.']);

    $base = (int)($_POST['nouvelle_version_de'] ?? 0);
    if ($base > 0) {                                // nouvelle version d'un document existant
        $o = charger_doc($base);
        if (!peut_acceder_document($droits, $o) || !peut_ecrire_categorie($droits, (string)$o['categorie'])) refus_doc(403, "Vous n'avez pas le droit de modifier ce document.");
        if ($o['archive']) refus_doc(409, 'Ce document est archivé : restaurez-le avant d\'ajouter une version.');
        $groupe = (int)($o['id_groupe'] ?: $o['id_document']);
        $st = db()->prepare('SELECT MAX(version) FROM document d WHERE ' . GROUPE . ' = ?'); $st->execute([$groupe]);
        $version = (int)$st->fetchColumn() + 1;
        $cat = $o['categorie']; $titre = $o['titre']; $rb = $o['id_beneficiaire']; $ri = $o['id_intervenant']; $rn = $o['id_intervention'];
    } else {                                        // nouveau document
        $cat = (string)($_POST['categorie'] ?? '');
        $titre = trim((string)($_POST['titre'] ?? ''));
        if (!in_array($cat, categories_deposables($droits), true)) refus_doc(422, 'Choisissez une catégorie autorisée.', ['categorie' => 'Catégorie non autorisée.']);
        if (mb_strlen($titre) > 150) refus_doc(422, 'Titre trop long (150 caractères).', ['titre' => '150 caractères maximum.']);
        if ($titre === '') $titre = pathinfo($nom, PATHINFO_FILENAME);
        $rb = (int)($_POST['id_beneficiaire'] ?? 0) ?: null; $ri = (int)($_POST['id_intervenant'] ?? 0) ?: null; $rn = (int)($_POST['id_intervention'] ?? 0) ?: null;
        if (($rb !== null) + ($ri !== null) + ($rn !== null) !== 1) refus_doc(422, 'Rattachez le document à un bénéficiaire, un intervenant ou une intervention (un seul).', ['rattachement' => 'Choisissez à qui se rapporte le document.']);
        if ($droits['beneficiaires_seulement'] && $rb === null) refus_doc(403, 'Vous ne pouvez déposer que des documents de bénéficiaires.');
        if ($rb !== null && !existe_ligne('beneficiaire', 'id_beneficiaire', $rb)) refus_doc(404, 'Bénéficiaire introuvable.');
        if ($ri !== null && !existe_ligne('intervenant', 'id_intervenant', $ri)) refus_doc(404, 'Intervenant introuvable.');
        if ($rn !== null && !existe_ligne('intervention', 'id_intervention', $rn)) refus_doc(404, 'Intervention introuvable.');
        $groupe = null; $version = 1;
    }
    if (!is_dir(DOSSIER_STOCKAGE) && !mkdir(DOSSIER_STOCKAGE, 0775, true)) refus_doc(500, 'Dossier de stockage introuvable.');
    $stocke = bin2hex(random_bytes(16));            // nom aleatoire, sans extension : le fichier ne peut jamais etre execute
    $dest = rtrim(DOSSIER_STOCKAGE, '/\\') . DIRECTORY_SEPARATOR . $stocke;
    if (!move_uploaded_file($f['tmp_name'], $dest)) refus_doc(500, "Impossible d'enregistrer le fichier sur le serveur.");
    $pdo = db();
    try {
        $pdo->beginTransaction();
        $pdo->prepare('INSERT INTO document (nom_fichier, titre, categorie, version, date_depot, archive, id_beneficiaire, id_intervenant, id_intervention, fichier_stocke, type_mime, taille, id_groupe, id_utilisateur, commentaire)
                       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$nom, $titre, $cat, $version, date('Y-m-d'), $rb, $ri, $rn, $stocke, $mime ?: (FORMATS_DOCUMENT[$ext][0]), (int)$f['size'], $groupe, $user['id'], $commentaire === '' ? null : $commentaire]);
        $nouveau = (int)$pdo->lastInsertId();
        if ($groupe === null) { $pdo->prepare('UPDATE document SET id_groupe = ? WHERE id_document = ?')->execute([$nouveau, $nouveau]); $groupe = $nouveau; }
        $pdo->commit();
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); @unlink($dest); throw $e; }
    journaliser('creation', 'document', ($version > 1 ? 'nouvelle version v' . $version . ' du document ' : 'document ') . $groupe . ' : ' . $titre . ' (' . $cat . ')');
    json_out(201, ['ok' => true, 'id' => $nouveau, 'groupe' => $groupe, 'version' => $version]);
}

if ($methode === 'DELETE' || $methode === 'PUT') {
    if ($id <= 0) refus_doc(400, 'Identifiant manquant.');
    if (!$droits['archiver']) refus_doc(403, "Vous n'avez pas le droit d'archiver ou de restaurer un document.");
    $l = charger_doc($id);
    if (!peut_acceder_document($droits, $l)) refus_doc(403, "Vous n'avez pas accès à ce document.");
    $archiver = true;
    if ($methode === 'PUT') { $d = corps_json(); if (!array_key_exists('archive', $d)) refus_doc(400, 'Rien à modifier.'); $archiver = (bool)$d['archive']; }
    $groupe = (int)($l['id_groupe'] ?: $l['id_document']);
    db()->prepare('UPDATE document SET archive = ?, date_archivage = ? WHERE COALESCE(id_groupe, id_document) = ?')->execute([$archiver ? 1 : 0, $archiver ? date('Y-m-d') : null, $groupe]);
    journaliser($archiver ? 'archivage' : 'restauration', 'document', 'document ' . $groupe . ' : ' . ($l['titre'] ?: $l['nom_fichier']));
    json_out(200, ['ok' => true, 'archive' => $archiver]);
}
header('Allow: GET, POST, PUT, DELETE');
json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
