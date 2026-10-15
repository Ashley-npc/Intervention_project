<?php
// Notifications : on les CREE ici (notifier), on les LIT dans api/notifications.php.
// Comme le journal, ce module ne doit jamais faire echouer l'action principale : toute erreur va dans la console PHP.
// Canal : « application » = visible dans l'appli (statut 'envoyee'). « courriel » / « sms » = visible aussi dans l'appli,
// et marquee 'a_envoyer' : l'envoi reel (serveur mail, passerelle SMS) sera branche plus tard sans toucher au reste.

// Identifiants des comptes actifs ayant l'un de ces roles.
function utilisateurs_du_role(array $roles): array {
    try {
        $in = implode(', ', array_fill(0, count($roles), '?'));
        $st = db()->prepare("SELECT u.id_utilisateur FROM utilisateur u JOIN role r ON r.id_role = u.id_role WHERE u.actif = 1 AND r.libelle IN ($in)");
        $st->execute($roles);
        return array_map('intval', array_column($st->fetchAll(), 'id_utilisateur'));
    } catch (Throwable $e) { error_log('[notif] ' . $e->getMessage()); return []; }
}

// Comptes concernes par une intervention : l'intervenant, le beneficiaire, et les proches aidants autorises a voir le planning.
function destinataires_intervention(int $id_intervention): array {
    $ids = [];
    try {
        $st = db()->prepare('SELECT v.id_utilisateur AS iv, b.id_utilisateur AS be, b.id_beneficiaire FROM intervention i
                             JOIN intervenant v ON v.id_intervenant = i.id_intervenant JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire WHERE i.id_intervention = ?');
        $st->execute([$id_intervention]);
        if ($l = $st->fetch()) {
            foreach (['iv', 'be'] as $k) if ($l[$k] !== null) $ids[] = (int)$l[$k];
            $a = db()->prepare('SELECT pa.id_utilisateur, l.autorisations FROM lien_beneficiaire_aidant l JOIN proche_aidant pa ON pa.id_aidant = l.id_aidant
                                WHERE l.id_beneficiaire = ? AND pa.actif = 1 AND pa.id_utilisateur IS NOT NULL');
            $a->execute([$l['id_beneficiaire']]);
            foreach ($a->fetchAll() as $x) if (in_array('planning', explode(',', (string)$x['autorisations']), true)) $ids[] = (int)$x['id_utilisateur'];
        }
    } catch (Throwable $e) { error_log('[notif] ' . $e->getMessage()); }
    return $ids;
}

// Texte court d'une intervention : « Marie Rasoa · soins · 15/10/2026 09:00-10:00 ».
function resume_intervention(int $id): string {
    try {
        $st = db()->prepare('SELECT i.date, i.heure_debut, i.heure_fin, i.type, b.prenom, b.nom FROM intervention i JOIN beneficiaire b ON b.id_beneficiaire = i.id_beneficiaire WHERE i.id_intervention = ?');
        $st->execute([$id]);
        if ($l = $st->fetch()) return $l['prenom'] . ' ' . $l['nom'] . ' · ' . str_replace('aide a la', 'aide à la', $l['type']) . ' · ' . date('d/m/Y', strtotime($l['date'])) . ' ' . substr($l['heure_debut'], 0, 5) . '-' . substr($l['heure_fin'], 0, 5);
    } catch (Throwable $e) { error_log('[notif] ' . $e->getMessage()); }
    return 'intervention ' . $id;
}

// Cree une notification pour chaque compte (sans doublon, sans l'auteur de l'action).
function notifier(array $ids_utilisateurs, string $contenu, ?int $id_intervention = null, bool $critique = false): void {
    try {
        $moi = utilisateur_connecte()['id'] ?? null;
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids_utilisateurs), function ($i) use ($moi) { return $i > 0 && $i !== $moi; })));
        if (!$ids) return;
        $in = implode(', ', array_fill(0, count($ids), '?'));
        $st = db()->prepare("SELECT id_utilisateur, preference_communication FROM utilisateur WHERE actif = 1 AND id_utilisateur IN ($in)");
        $st->execute($ids);
        $ins = db()->prepare('INSERT INTO notification (date_envoi, canal, contenu, lue, critique, statut_envoi, id_utilisateur, id_intervention) VALUES (?, ?, ?, 0, ?, ?, ?, ?)');
        foreach ($st->fetchAll() as $u) {
            $canal = in_array($u['preference_communication'], ['application', 'courriel', 'sms'], true) ? $u['preference_communication'] : 'application';
            $ins->execute([date('Y-m-d H:i:s'), $canal, $contenu, $critique ? 1 : 0, $canal === 'application' ? 'envoyee' : 'a_envoyer', $u['id_utilisateur'], $id_intervention]);
        }
    } catch (Throwable $e) { error_log('[notif] ' . $e->getMessage()); }
}

// Relances : intervention terminee (7 derniers jours) sans compte rendu -> relance l'intervenant, une fois par jour et par intervention.
function relancer_comptes_rendus_manquants(): void {
    try {
        $st = db()->prepare("SELECT i.id_intervention, v.id_utilisateur FROM intervention i JOIN intervenant v ON v.id_intervenant = i.id_intervenant
            LEFT JOIN compte_rendu c ON c.id_intervention = i.id_intervention
            WHERE c.id_compte_rendu IS NULL AND i.statut <> 'annulee' AND v.id_utilisateur IS NOT NULL AND i.date >= ? AND " . SQL_TERMINEE . "
              AND NOT EXISTS (SELECT 1 FROM notification n WHERE n.id_intervention = i.id_intervention AND n.contenu LIKE 'Relance%' AND n.date_envoi >= ?)
            LIMIT 50");
        $st->execute(array_merge([date('Y-m-d', strtotime('-7 days'))], params_terminee(), [date('Y-m-d') . ' 00:00:00']));
        foreach ($st->fetchAll() as $l) notifier([(int)$l['id_utilisateur']], 'Relance : compte rendu à saisir pour ' . resume_intervention((int)$l['id_intervention']), (int)$l['id_intervention']);
    } catch (Throwable $e) { error_log('[notif] relances : ' . $e->getMessage()); }
}

// Compte de l'intervenant d'une intervention (0 ou 1 identifiant).
function intervenant_de(int $id_intervention): array {
    try {
        $st = db()->prepare('SELECT v.id_utilisateur FROM intervention i JOIN intervenant v ON v.id_intervenant = i.id_intervenant WHERE i.id_intervention = ?');
        $st->execute([$id_intervention]);
        $u = $st->fetchColumn();
        return $u === false || $u === null ? [] : [(int)$u];
    } catch (Throwable $e) { error_log('[notif] ' . $e->getMessage()); return []; }
}
