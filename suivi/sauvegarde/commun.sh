#!/usr/bin/env bash
# Fonctions et réglages communs à sauvegarder.sh et restaurer.sh (ne se lance pas seul).
# Réglages (tous facultatifs, à mettre devant la commande) :
#   DOSSIER_SAUVEGARDES   où ranger les sauvegardes          (défaut : ~/sauvegardes-suivi, HORS du site)
#   JOURS_CONSERVATION    durée de conservation en jours     (défaut : 30)
#   DOSSIER_SITE          dossier du site (celui qui contient backend/) si les scripts ne le trouvent pas
#   DB_HOTE, DB_SOCKET    pour forcer l'hôte ou un socket    (défaut : ceux de backend/config.php)

ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RACINE="${DOSSIER_SITE:-$(cd "$ICI/.." && pwd)}"
# Si ce dossier n'a pas de config.php (ex. : le site qui tourne est copié dans XAMPP), on cherche dans htdocs.
if [ ! -f "$RACINE/backend/config.php" ] && [ -f "$RACINE/../backend/config.php" ]; then
  RACINE="$(cd "$RACINE/.." && pwd)"   # le dossier « suivi » est posé dans le projet : le site est un cran au-dessus
fi
if [ ! -f "$RACINE/backend/config.php" ]; then
  for c in /opt/lampp/htdocs/*/backend/config.php /var/www/html/*/backend/config.php; do
    [ -f "$c" ] && { RACINE="$(cd "$(dirname "$c")/.." && pwd)"; echo "Info : config.php trouvé dans $RACINE"; break; }
  done
fi
CONFIG="$RACINE/backend/config.php"
DOSSIER="${DOSSIER_SAUVEGARDES:-$HOME/sauvegardes-suivi}"
JOURS="${JOURS_CONSERVATION:-30}"
MINIMUM=3   # on ne supprime jamais les sauvegardes s'il en resterait moins que ça

journal() { mkdir -p "$DOSSIER"; echo "$(date '+%F %T')  $*" >> "$DOSSIER/sauvegarde.log"; echo "$*"; }
erreur()  { echo "ERREUR : $*" >&2; exit 1; }

command -v php >/dev/null 2>&1 || erreur "PHP est introuvable (il sert à lire backend/config.php)."
[ -f "$CONFIG" ] || erreur "Fichier introuvable : $CONFIG
       Indique où est ton site : DOSSIER_SITE=/chemin/du/site ./sauvegarder.sh   (le dossier qui contient backend/config.php)"
lire() { php -r '$c = require $argv[1]; echo $c[$argv[2]] ?? "";' "$CONFIG" "$1" 2>/dev/null; }
DB_HOTE="${DB_HOTE:-$(lire db_host)}"
DB_NOM="$(lire db_name)"
DB_UTILISATEUR="$(lire db_user)"
DB_MDP="$(lire db_pass)"
[[ "$DB_NOM" =~ ^[A-Za-z0-9_]+$ ]] || erreur "Nom de base inattendu dans config.php : « $DB_NOM »."

# Cherche un programme dans le PATH, puis aux emplacements habituels de XAMPP.
trouver() { local c; for c in "$@"; do if command -v "$c" >/dev/null 2>&1; then command -v "$c"; return 0; elif [ -x "$c" ]; then echo "$c"; return 0; fi; done; return 1; }
DUMP="$(trouver mariadb-dump mysqldump /opt/lampp/bin/mysqldump /opt/lampp/bin/mariadb-dump)" || erreur "mysqldump est introuvable (XAMPP : /opt/lampp/bin)."
CLIENT="$(trouver mariadb mysql /opt/lampp/bin/mysql /opt/lampp/bin/mariadb)" || erreur "Le client mysql est introuvable (XAMPP : /opt/lampp/bin)."

# Le mot de passe passe par un fichier d'options temporaire (jamais dans la ligne de commande, visible par les autres utilisateurs).
umask 077
OPTS="$(mktemp)"
mdp="${DB_MDP//\\/\\\\}"; mdp="${mdp//\"/\\\"}"
{ echo "[client]"; echo "host=$DB_HOTE"; echo "user=$DB_UTILISATEUR"; echo "password=\"$mdp\""; echo "default-character-set=utf8mb4"
  # Base sur cette machine : pas de chiffrement TLS (les MariaDB récents l'exigent sinon et XAMPP ne l'a pas).
  case "$DB_HOTE" in 127.0.0.1|localhost|::1|"") echo "skip-ssl";; esac
  [ -n "${DB_SOCKET:-}" ] && echo "socket=$DB_SOCKET"; true; } > "$OPTS"
mysql_()  { "$CLIENT" --defaults-extra-file="$OPTS" "$@"; }
dump_()   { "$DUMP"   --defaults-extra-file="$OPTS" "$@"; }

TMP=""
nettoyer() { local s=$?; rm -f "$OPTS"; if [ $s -ne 0 ] && [ -n "$TMP" ] && [ -d "$TMP" ]; then rm -rf "$TMP"; fi; return $s; }
trap nettoyer EXIT

derniere_sauvegarde() { local d; for d in "$DOSSIER"/20??-??-??_????; do [ -d "$d" ] && echo "$d"; done | sort | tail -1; }
