<?php
// Pagination et tri partagés par les listes de l'API (CDC 5.12 : résultats paginés, tri, critères combinables).
//   GET ...?page=2&taille=20&tri=nom&sens=desc
// Réponse : les lignes de la page + 'meta' => {total, page, pages, taille}.

const TAILLE_PAGE_DEFAUT = 20;
const TAILLE_PAGE_MAX = 100;

// [page, taille, décalage] à partir de ?page= et ?taille= (valeurs bornées).
// ?tout=1 : tout renvoyer d'un coup (menus déroulants des formulaires), dans la limite de 1000 lignes.
function params_page(int $taille_defaut = TAILLE_PAGE_DEFAUT): array {
    if (($_GET['tout'] ?? '') === '1') return [1, 1000, 0];
    $taille = (int)($_GET['taille'] ?? $taille_defaut);
    if ($taille < 1) $taille = $taille_defaut;
    if ($taille > TAILLE_PAGE_MAX) $taille = TAILLE_PAGE_MAX;
    $page = max(1, (int)($_GET['page'] ?? 1));
    return [$page, $taille, ($page - 1) * $taille];
}

// ORDER BY sûr : ?tri= doit être une clé de $autorises (clé => expression SQL), ?sens= asc|desc.
// $secondaire : tri de départage, ajouté à la fin (ex. 'beneficiaire.nom, beneficiaire.prenom').
function ordre_tri(array $autorises, string $defaut, string $sens_defaut = 'asc', string $secondaire = ''): string {
    $cle = (string)($_GET['tri'] ?? $defaut);
    if (!isset($autorises[$cle])) $cle = $defaut;
    $sens = strtolower((string)($_GET['sens'] ?? $sens_defaut));
    if ($sens !== 'asc' && $sens !== 'desc') $sens = $sens_defaut;
    return $autorises[$cle] . ' ' . strtoupper($sens) . ($secondaire !== '' ? ', ' . $secondaire : '');
}

// Lit une page. $select = liste des colonnes, $from_where = « FROM … WHERE … » (sans ORDER BY).
// Renvoie [lignes, meta]. Si la page demandée dépasse la dernière, on renvoie la dernière.
function lire_page(string $select, string $from_where, array $params, string $ordre, int $page, int $taille): array {
    $st = db()->prepare("SELECT COUNT(*) $from_where");
    $st->execute($params);
    $total = (int)$st->fetchColumn();
    $pages = max(1, (int)ceil($total / $taille));
    if ($page > $pages) $page = $pages;
    $decalage = ($page - 1) * $taille;
    $st = db()->prepare("SELECT $select $from_where ORDER BY $ordre LIMIT " . (int)$taille . ' OFFSET ' . (int)$decalage);
    $st->execute($params);
    return [$st->fetchAll(), ['total' => $total, 'page' => $page, 'pages' => $pages, 'taille' => $taille]];
}
