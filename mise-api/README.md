# MISE — API

API REST (Laravel) de **MISE**, un outil de cuisine professionnelle développé par un cuisinier
pour son propre usage en cuisine (fiches techniques, HACCP, menus, étiquetage). Ce n'est pas un
produit commercial : les choix techniques restent volontairement simples et pragmatiques.

Ce dépôt est l'un des trois qui composent MISE :

- **`mise-api`** (ce dépôt) — backend Laravel, sert l'API REST consommée par les deux frontends.
- **`mise-dashboard`** — back-office Angular utilisé par le chef pour gérer le référentiel (fiches, menus, ingrédients...).
- **`mise-public`** — application Angular (PWA) utilisée en cuisine au quotidien par la brigade.

## Stack

- PHP 8.4, Laravel 13
- MySQL 8.4
- Laravel Sanctum (authentification par token bearer)
- Pest pour les tests

## Fonctionnalités

- **Référentiel cuisine** : catégories, stations, allergènes (14 UE), catégories d'ingrédients, ingrédients (prix, unité, allergènes).
- **Fiches techniques** : ingrédients (avec sous-groupes), étapes ordonnées, matériel, HACCP, conservation, photos.
- **Menus** : sections ordonnées composées de plats, chaque plat pouvant combiner plusieurs fiches techniques.
- **Suivi HACCP** : relevés de température par appareil (frigos, chambres froides...) et suivi du changement d'huile des friteuses.
- **Discussion interne** : chanels et messages (avec réponses en fil).
- **Liste de courses** partagée (todo/done).
- **Calendrier d'événements**, éventuellement liés à un menu.
- **Gestion des utilisateurs** et des rôles.

Le détail des ressources et de leurs endpoints est généré automatiquement depuis les routes
enregistrées et consultable à la racine de l'API (voir [Documentation des endpoints](#documentation-des-endpoints)).

## Authentification & rôles

Connexion par **nom d'utilisateur + mot de passe** (pas d'email) via Sanctum en mode token bearer
pur (pas de cookies/CSRF).

- `POST /api/auth/login` → `{ token, user }`
- `POST /api/auth/logout` — révoque le token courant
- `GET /api/auth/me`
- `GET /api/auth/users` — publique, ne renvoie que `id`/`name` (sélecteur de compte côté public)

Toutes les autres routes requièrent l'en-tête `Authorization: Bearer <token>`. Deux rôles :

| Rôle    | Accès |
|---------|-------|
| `user`  | Lecture du référentiel (catégories, stations, allergènes, ingrédients, fiches techniques, menus, appareils) + écriture complète sur les relevés de température, les changements d'huile, la discussion, la liste de courses (ajout) et le calendrier (lecture). |
| `admin` | Tout ce que `user` peut faire, plus l'écriture sur l'ensemble des ressources et la gestion des comptes utilisateurs. |

Le dernier compte `admin` ne peut être ni supprimé ni rétrogradé, pour ne jamais rendre le
back-office inaccessible.

## Démarrage

### Avec Docker (recommandé)

Ce dépôt est pensé pour tourner via le `docker-compose.yml` situé à la racine du projet MISE
(un niveau au-dessus), aux côtés de `mise-dashboard` et `mise-public` :

```bash
cp .env.example .env   # à la racine du projet, pas dans ce dépôt
docker compose up -d --build
```

Le conteneur `api` attend que MySQL soit prêt, joue les migrations (`--force`) puis les seeders
(idempotents — sans danger à chaque redémarrage) avant de démarrer Apache. Un compte admin est
créé au premier démarrage via `ADMIN_NAME`/`ADMIN_PASSWORD` (`.env`).

### En local, sans Docker

```bash
composer install
cp .env.example .env
php artisan key:generate
# configurer DB_* dans .env, puis :
php artisan migrate
php artisan db:seed
php artisan serve
```

## Documentation des endpoints

Une page de documentation sommaire est générée automatiquement depuis les routes enregistrées
(méthode, URL, action par ressource) — elle ne peut donc pas devenir obsolète quand une ressource
est ajoutée ou retirée. Elle est servie à la racine du site (`GET /`, hors préfixe `/api`) une fois
l'application démarrée.

## Tests

Pest est installé (`composer test`), mais aucun test n'a encore été écrit pour les contrôleurs ou
l'authentification — vérifié manuellement à ce jour (curl, Docker).
