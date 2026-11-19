#!/usr/bin/env bash
# Restauration d'une sauvegarde, ou TEST de restauration sans toucher à la vraie base.
# Usage :
#   ./restaurer.sh --test [DOSSIER]    teste la dernière sauvegarde (ou celle indiquée) dans une base temporaire, puis la supprime
#   ./restaurer.sh [DOSSIER]           restaure vraiment (demande confirmation) ; sans DOSSIER : la dernière sauvegarde
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/commun.sh"

TEST=0; CHOIX=""
for a in "$@"; do case "$a" in --test) TEST=1 ;; -h|--help) sed -n 2,6p "$0"; exit 0 ;; *) CHOIX="$a" ;; esac; done
SAUV="${CHOIX:-$(derniere_sauvegarde)}"
[ -n "$SAUV" ] && [ -d "$SAUV" ] || erreur "Aucune sauvegarde trouvée dans $DOSSIER."
[ -f "$SAUV/base.sql.gz" ] || erreur "$SAUV ne contient pas base.sql.gz."
echo "Sauvegarde utilisée : $SAUV"
[ -f "$SAUV/info.txt" ] && sed 's/^/   /' "$SAUV/info.txt"

# Vérification de l'intégrité avant tout.
( cd "$SAUV" && sha256sum -c SHA256SUMS ) >/dev/null 2>&1 || erreur "Les empreintes ne correspondent pas : la sauvegarde est abîmée. Rien n'a été modifié."
echo "Intégrité vérifiée (empreintes SHA-256 correctes)."
CHARSET="$(grep '^charset=' "$SAUV/info.txt" 2>/dev/null | cut -d= -f2 || true)"; CHARSET="${CHARSET:-utf8mb4}"
COLLATION="$(grep '^collation=' "$SAUV/info.txt" 2>/dev/null | cut -d= -f2 || true)"; COLLATION="${COLLATION:-utf8mb4_general_ci}"
[[ "$CHARSET" =~ ^[a-z0-9_]+$ && "$COLLATION" =~ ^[a-z0-9_]+$ ]] || erreur "info.txt contient des valeurs inattendues."

recreer() { mysql_ -e "DROP DATABASE IF EXISTS \`$1\`; CREATE DATABASE \`$1\` CHARACTER SET $CHARSET COLLATE $COLLATION;"; }
charger() { gunzip -c "$SAUV/base.sql.gz" | mysql_ "$1"; }
tables()  { mysql_ -N -B -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='$1' AND TABLE_TYPE='BASE TABLE' ORDER BY 1"; }
compter() { mysql_ -N -B -e "SELECT COUNT(*) FROM \`$1\`.\`$2\`"; }

if [ $TEST -eq 1 ]; then
  BASE_TEST="${DB_NOM}_test_restauration"
  echo "Test : restauration dans la base temporaire « $BASE_TEST » (la vraie base n'est pas touchée)."
  recreer "$BASE_TEST"
  trap 'mysql_ -e "DROP DATABASE IF EXISTS \`$BASE_TEST\`" 2>/dev/null || true; nettoyer' EXIT
  charger "$BASE_TEST"
  ECARTS=0; N=0
  printf '\n%-30s %10s %12s\n' "Table" "Sauvegarde" "Base actuelle"
  while IFS= read -r t; do
    [ -n "$t" ] || continue; N=$((N + 1))
    a="$(compter "$BASE_TEST" "$t")"; b="$(compter "$DB_NOM" "$t" 2>/dev/null || echo "absente")"
    marque=""; [ "$a" != "$b" ] && { marque="  <- différent"; ECARTS=$((ECARTS + 1)); }
    printf '%-30s %10s %12s%s\n' "$t" "$a" "$b" "$marque"
  done < <(tables "$BASE_TEST")
  echo
  journal "TEST DE RESTAURATION OK : $N tables restaurées depuis $SAUV."
  [ $ECARTS -gt 0 ] && echo "Remarque : $ECARTS table(s) diffèrent de la base actuelle, ce qui est normal si des données ont été ajoutées depuis la sauvegarde."
  echo "La base temporaire a été supprimée."
  exit 0
fi

# Restauration réelle.
echo
echo "ATTENTION : la base « $DB_NOM » va être SUPPRIMÉE puis remplacée par cette sauvegarde."
echo "Tout ce qui a été saisi depuis le $(grep '^date=' "$SAUV/info.txt" 2>/dev/null | cut -d= -f2 || echo '?') sera perdu."
read -r -p 'Tape RESTAURER (en majuscules) pour continuer : ' REP
[ "$REP" = "RESTAURER" ] || { echo "Annulé, rien n'a été modifié."; exit 1; }

FILET="$DOSSIER/avant-restauration_$(date +%F_%H%M%S).sql.gz"
echo "Copie de sécurité de la base actuelle : $FILET"
dump_ --single-transaction --triggers --hex-blob "$DB_NOM" | gzip -9 > "$FILET"
recreer "$DB_NOM"
charger "$DB_NOM"
journal "RESTAURATION faite depuis $SAUV (copie de sécurité : $FILET)."

if [ -f "$SAUV/documents.tar.gz" ]; then
  read -r -p 'Restaurer aussi les documents déposés ? (o/N) ' REP2
  if [ "$REP2" = "o" ] || [ "$REP2" = "O" ]; then
    [ -d "$RACINE/backend/stockage" ] && mv "$RACINE/backend/stockage" "$RACINE/backend/stockage.avant-restauration-$(date +%F_%H%M%S)"
    tar -xzf "$SAUV/documents.tar.gz" -C "$RACINE/backend"
    journal "Documents restaurés depuis $SAUV."
  fi
fi
echo "Terminé. Recharge l'application dans le navigateur."
