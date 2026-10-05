#!/bin/sh
# Sauvegarde automatique de la base MISE — mysqldump quotidien, compressé, rotation sur les 14
# derniers jours. Remplace fradelg/mysql-cron-backup : même principe (image tierce + cron +
# mysqldump), mais en maison pour ne pas dépendre d'un conteneur tiers pour quelque chose d'aussi
# simple. Tourne en boucle plutôt que via un vrai crond — plus portable, pas de paquet
# supplémentaire à installer dans l'image mysql:8.4 (voir Dockerfile).
#
# Variables attendues (voir docker-compose.yml) :
#   MYSQL_HOST, MYSQL_DATABASE, MYSQL_ROOT_PASSWORD

set -eu

BACKUP_DIR=/backup
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

backup_once() {
  STAMP=$(date +%Y-%m-%d_%H%M)
  FILE="$BACKUP_DIR/mise-backup-${STAMP}.sql"

  mysqldump --no-tablespaces -h "$MYSQL_HOST" -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" > "$FILE"
  gzip "$FILE"
  ln -sf "$(basename "$FILE").gz" "$BACKUP_DIR/latest.sql.gz"

  find "$BACKUP_DIR" -name 'mise-backup-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

  echo "$(date '+%Y-%m-%d %H:%M:%S') — sauvegarde créée : ${FILE}.gz"
}

# Sauvegarde immédiate au démarrage du conteneur, puis une fois par jour à 3h du matin.
backup_once

while true; do
  NOW=$(date +%s)
  NEXT=$(date -d 'tomorrow 03:00' +%s)
  sleep $((NEXT - NOW))
  backup_once
done
