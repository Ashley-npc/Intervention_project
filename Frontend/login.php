<?php
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';

// Déjà connecté : on renvoie directement vers sa page.
if (!empty($_SESSION['user']) && ($p = page_du_role($_SESSION['user']['role']))) {
    header('Location: ' . $p); exit;
}

$erreur = '';
$identifiant = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $identifiant = trim($_POST['identifiant'] ?? '');
    $mdp = $_POST['mot_de_passe'] ?? '';

    if (!csrf_ok($_POST['csrf'] ?? null)) {
        $erreur = 'La page a expiré, réessaie.';
    } else {
        // Requête préparée : l'identifiant saisi ne peut pas modifier la requête SQL.
        $st = db()->prepare(
            'SELECT u.id_utilisateur, u.identifiant, u.mot_de_passe, u.actif, r.libelle AS role
             FROM utilisateur u
             JOIN role r ON r.id_role = u.id_role
             WHERE u.identifiant = ?'
        );
        $st->execute([$identifiant]);
        $u = $st->fetch();

        // Si l'identifiant n'existe pas, on vérifie quand même un faux hachage :
        // le temps de réponse ne révèle pas si le compte existe.
        $hash = $u['mot_de_passe'] ?? '$2y$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
        $mdp_ok = password_verify($mdp, $hash);

        if ($u && $mdp_ok && (int)$u['actif'] === 1) {
            $page = page_du_role($u['role']);
            if ($page === null) {
                $erreur = 'Ce compte a un rôle non géré par l\'application.';
            } else {
                session_regenerate_id(true);      // nouvelle session : empêche le vol de session
                $_SESSION['user'] = [
                    'id'          => (int)$u['id_utilisateur'],
                    'identifiant' => $u['identifiant'],
                    'role'        => $u['role'],
                ];
                db()->prepare('UPDATE utilisateur SET derniere_connexion = NOW() WHERE id_utilisateur = ?')
                    ->execute([$u['id_utilisateur']]);
                header('Location: ' . $page); exit;
            }
        } else {
            // Même message pour : identifiant inconnu, mauvais mot de passe, compte désactivé.
            $erreur = 'Identifiant ou mot de passe incorrect.';
        }
    }
}
?>
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connexion · Suivi à domicile</title>
  <link rel="stylesheet" href="login.css">
</head>
<body>
  <main class="page">
    <div class="login">
      <div class="brand">Suivi à domicile<small>Gestion des interventions et des bénéficiaires</small></div>

      <form class="card" action="login.php" method="post">
        <h1>Connexion</h1>

        <?php if ($erreur): ?>
          <p class="erreur" role="alert"><?= h($erreur) ?></p>
        <?php endif; ?>

        <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">

        <div class="field">
          <label for="identifiant">Identifiant</label>
          <input type="text" id="identifiant" name="identifiant" value="<?= h($identifiant) ?>" autocomplete="username" required autofocus>
        </div>

        <div class="field">
          <label for="mot_de_passe">Mot de passe</label>
          <input type="password" id="mot_de_passe" name="mot_de_passe" autocomplete="current-password" required>
        </div>

        <button type="submit" class="btn">Se connecter</button>

        <p class="note">Pas de compte ? Il est créé par ton coordinateur ou l'administrateur.</p>
      </form>
    </div>
  </main>
</body>
</html>
