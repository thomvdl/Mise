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

# Config/route/view caching — skips re-parsing .env, routes/*.php and the one Blade view on
# every request. Regenerated from this run's actual .env on every container start, so it never
# goes stale between a config change and the next restart (env vars only take effect on restart
# anyway, in Docker). Safe with this codebase specifically: no env() calls outside config/*.php
# (checked before adding this — that's the usual footgun with artisan config:cache).
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec "$@"
