#!/usr/bin/env bash
# Sauvegarde complète : base de données + documents déposés (backend/stockage).
# Usage : ./sauvegarder.sh        (voir LISEZMOI-sauvegarde.txt pour la planifier chaque nuit)
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/commun.sh"

HORO="$(date +%F_%H%M)"
CIBLE="$DOSSIER/$HORO"
mkdir -p "$DOSSIER"; chmod 700 "$DOSSIER"
[ -e "$CIBLE" ] && erreur "Une sauvegarde existe déjà pour cette minute ($CIBLE)."
TMP="$DOSSIER/.en-cours-$HORO"; rm -rf "$TMP"; mkdir "$TMP"
journal "Début de la sauvegarde (base « $DB_NOM »)."

# 1) La base : une seule transaction cohérente, avec procédures, déclencheurs et événements.
if ! dump_ --single-transaction --triggers --hex-blob "$DB_NOM" | gzip -9 > "$TMP/base.sql.gz"; then
  journal "ECHEC : la sauvegarde de la base a échoué."; exit 1
fi
gzip -t "$TMP/base.sql.gz" || { journal "ECHEC : fichier de sauvegarde corrompu."; exit 1; }
# mysqldump termine toujours par « Dump completed » : son absence signale un fichier tronqué.
gunzip -c "$TMP/base.sql.gz" | tail -n 3 | grep -q "Dump completed" || { journal "ECHEC : la sauvegarde de la base est incomplète."; exit 1; }
NB_TABLES="$(gunzip -c "$TMP/base.sql.gz" | grep -c '^CREATE TABLE')"

# 2) Les documents déposés dans l'application.
if [ -d "$RACINE/backend/stockage" ]; then
  tar -czf "$TMP/documents.tar.gz" -C "$RACINE/backend" stockage
  tar -tzf "$TMP/documents.tar.gz" >/dev/null || { journal "ECHEC : l'archive des documents est corrompue."; exit 1; }
fi

# 3) Empreintes (pour vérifier plus tard que rien n'a été abîmé) et fiche d'information.
( cd "$TMP" && sha256sum base.sql.gz $( [ -f documents.tar.gz ] && echo documents.tar.gz ) > SHA256SUMS )
COLL="$(mysql_ -N -B -e "SELECT CONCAT(DEFAULT_CHARACTER_SET_NAME, ' ', DEFAULT_COLLATION_NAME) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='$DB_NOM'" 2>/dev/null || true)"
{ echo "date=$(date '+%F %T')"; echo "base=$DB_NOM"; echo "tables=$NB_TABLES"
  echo "charset=${COLL%% *}"; echo "collation=${COLL##* }"
  echo "programme=$("$DUMP" --version | head -1)"; } > "$TMP/info.txt"

mv "$TMP" "$CIBLE"; TMP=""
chmod 700 "$CIBLE"; chmod 600 "$CIBLE"/* 
journal "OK : $CIBLE ($(du -sh "$CIBLE" | cut -f1), $NB_TABLES tables)."

# 4) Rotation : on supprime les sauvegardes plus vieilles que JOURS jours, mais jamais en dessous de MINIMUM sauvegardes.
TOTAL=0; VIEILLES=()
for d in "$DOSSIER"/20??-??-??_????; do [ -d "$d" ] || continue; TOTAL=$((TOTAL + 1)); done
while IFS= read -r d; do [ -n "$d" ] && VIEILLES+=("$d"); done < <(find "$DOSSIER" -maxdepth 1 -type d -name '20??-??-??_????' -mtime +"$JOURS" | sort)
if [ ${#VIEILLES[@]} -gt 0 ]; then
  if [ $((TOTAL - ${#VIEILLES[@]})) -ge $MINIMUM ]; then
    for d in "${VIEILLES[@]}"; do rm -rf "$d"; journal "Supprimée (plus de $JOURS jours) : $d"; done
  else
    journal "Rotation ignorée : il resterait moins de $MINIMUM sauvegardes."
  fi
fi
