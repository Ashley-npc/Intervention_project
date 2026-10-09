<?php
// POST /api/logout.php : détruit la session.
require __DIR__ . '/../includes/auth.php';

exiger_methode('POST');
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}
session_destroy();
json_out(200, ['ok' => true]);
