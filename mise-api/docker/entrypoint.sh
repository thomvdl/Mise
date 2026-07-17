#!/bin/sh
set -e

echo "En attente de la base de données ($DB_HOST:$DB_PORT)..."
until php -r "new PDO('mysql:host=${DB_HOST};port=${DB_PORT}', getenv('DB_USERNAME'), getenv('DB_PASSWORD'));" 2>/dev/null; do
  sleep 2
done
echo "Base de données prête."

php artisan migrate --force

# Every seeder uses firstOrCreate/sync, so this is safe to run on every start (a no-op once
# already seeded) rather than only trying to detect a first deploy.
php artisan db:seed --force

# Idempotent: only (re)link if the storage symlink is missing, so restarts don't error out.
[ -L /var/www/html/public/storage ] || php artisan storage:link

exec "$@"
