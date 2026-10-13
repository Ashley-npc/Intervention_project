<?php
// Aides pour répondre en JSON. Toutes les pages de api/ passent par ces fonctions.

// Envoie une réponse JSON et arrête le script.
function json_out(int $code, array $data): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Refuse toute méthode HTTP autre que celle attendue (GET ou POST).
function exiger_methode(string $methode): void {
    if ($_SERVER['REQUEST_METHOD'] !== $methode) {
        header('Allow: ' . $methode);
        json_out(405, ['ok' => false, 'message' => 'Méthode non autorisée.']);
    }
}

// Lit le corps de la requête. On exige du JSON : un formulaire envoyé depuis un autre site
// ne peut pas fabriquer ce type de requête, ce qui protège contre le CSRF (avec SameSite=Lax).
function corps_json(): array {
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        json_out(415, ['ok' => false, 'message' => 'Format non accepté.']);
    }
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) json_out(400, ['ok' => false, 'message' => 'Requête invalide.']);
    return $data;
}

// Toute erreur imprevue (base injoignable, colonne manquante...) devient une reponse JSON propre.
// Le detail est ecrit dans la console du serveur PHP. En local (127.0.0.1) il est aussi renvoye au navigateur pour faciliter le depannage.
set_exception_handler(function ($e) {
    error_log('[API] ' . get_class($e) . ' : ' . $e->getMessage() . ' (' . $e->getFile() . ':' . $e->getLine() . ')');
    $msg = 'Erreur serveur : voir la console du serveur PHP.';
    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
    if ($local) {
        $m = $e->getMessage();
        $msg = 'Erreur serveur : ' . $m;
        if (preg_match('/42S02|42S22|no such (table|column)|Unknown column|doesn\'t exist/i', $m)) {
            $msg .= ' -> Il manque une table ou une colonne dans la base : lancez les scripts ajout-roles.sql, ajout-colonnes.sql, ajout-colonnes-phase2.sql.';
        }
    }
    json_out(500, ['ok' => false, 'message' => $msg]);
});
