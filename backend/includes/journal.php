<?php
// Journal d'audit : on y AJOUTE des lignes, on n'en modifie ni n'en supprime jamais.
// Ne doit jamais faire echouer l'action principale : en cas de probleme (table absente...), on ecrit seulement dans la console PHP.
function journaliser(string $action, ?string $entite = null, ?string $detail = null, ?int $id_utilisateur = null): void {
    try {
        $id = $id_utilisateur ?? (utilisateur_connecte()['id'] ?? null);
        if ($id === null) return;
        db()->prepare('INSERT INTO journal_audit (date_heure, action, entite_concernee, detail, id_utilisateur) VALUES (?, ?, ?, ?, ?)')
            ->execute([date('Y-m-d H:i:s'), $action, $entite, $detail, $id]);
    } catch (Throwable $e) {
        error_log('[journal] ' . $e->getMessage());
    }
}
