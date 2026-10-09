<?php
// Routeur pour le serveur PHP local (remplace le .htaccess d'Apache, que php -S ne lit pas).
// Lancement, depuis ce dossier :   php -S localhost:8000 router.php
// Il bloque l'accès direct aux fichiers internes du backend ; tout le reste est servi normalement.
$chemin = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
$chemin = preg_replace('#/+#', '/', str_replace('\\', '/', $chemin));

if (preg_match('#(^|/)\.\.(/|$)#', $chemin) || preg_match('#^/backend/(config\.php|includes(/|$))#', $chemin)) {
    http_response_code(403);
    exit('Accès refusé.');
}
return false;   // serveur normal : fichiers statiques et pages PHP
