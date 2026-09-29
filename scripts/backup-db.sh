#!/bin/sh
# Sauvegarde quotidienne de la base MISE — voir DEPLOY.md pour l'installer en tâche cron.
#
# Usage : ./scripts/backup-db.sh
# Lit DB_ROOT_PASSWORD dans le .env à la racine du projet (même fichier que docker-compose).
#
# Conserve les 30 derniers jours de sauvegardes, supprime le reste automatiquement — sans quoi
# le dossier grossit indéfiniment sur un VPS qu'on ne regarde pas tous les jours.

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname -- "$SCRIPT_DIR")
BACKUP_DIR="$PROJECT_DIR/backups"
RETENTION_DAYS=30

cd "$PROJECT_DIR"
mkdir -p "$BACKUP_DIR"

# Marche pour les deux variantes (VPS ou serveur local) sans argument à retenir — détecte celle
# réellement en service sur cette machine plutôt que d'en imposer une en dur.
if [ -f docker-compose.local.yml ] && docker compose -f docker-compose.local.yml ps -q db >/dev/null 2>&1 && [ -n "$(docker compose -f docker-compose.local.yml ps -q db)" ]; then
  COMPOSE_FILE="docker-compose.local.yml"
else
  COMPOSE_FILE="docker-compose.prod.yml"
fi

DB_ROOT_PASSWORD=$(grep -E '^DB_ROOT_PASSWORD=' .env | cut -d '=' -f2-)
if [ -z "$DB_ROOT_PASSWORD" ]; then
  echo "DB_ROOT_PASSWORD introuvable dans .env — abandon." >&2
  exit 1
fi

STAMP=$(date +%Y-%m-%d_%H%M)
FILE="$BACKUP_DIR/mise-backup-${STAMP}.sql"

docker compose -f "$COMPOSE_FILE" exec -T db \
  mysqldump --no-tablespaces -uroot -p"$DB_ROOT_PASSWORD" mise > "$FILE"

gzip "$FILE"
echo "Sauvegarde créée : ${FILE}.gz"

# Supprime les sauvegardes de plus de $RETENTION_DAYS jours.
find "$BACKUP_DIR" -name 'mise-backup-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
