# MISE — contexte du projet

Ce document sert à donner à une IA (ou un nouveau contributeur) tout le contexte nécessaire pour aider sur ce projet sans avoir à ré-explorer tout le code à chaque fois. À tenir à jour quand l'app évolue significativement.

## Qui, pourquoi

MISE est développé par un cuisinier travaillant en hôtel, pour son propre usage en cuisine (et potentiellement celui de sa brigade). Ce n'est pas un projet commercial ou un produit à vendre — c'est un outil de travail interne, pensé pour résoudre des problèmes concrets rencontrés en cuisine professionnelle (fiches techniques, HACCP, étiquetage, menus).

Le développeur n'est pas un développeur de métier : les suggestions doivent rester pragmatiques, motivées par un besoin réel de cuisine, et pas de la sur-ingénierie. Privilégier des fonctionnalités qui font gagner du temps en service ou en mise en place plutôt que des idées "cool techniquement" sans usage terrain clair.

## Architecture — 3 dépôts

Situés dans `mise/`, chacun est un projet indépendant (pas de monorepo tooling, pas de workspace partagé) :

- **`mise-api/`** — Backend Laravel 13 (PHP 8.4 — `composer.json` disait `^8.3` mais le lock résolvait des paquets symfony 8.1.x nécessitant réellement 8.4.1+, corrigé). API REST pure (`routes/api.php`). Une seule vue Blade : `/` (`routes/web.php`) sert une page de documentation API one-page auto-générée depuis les routes enregistrées (méthode/URL/action par ressource) — pas de vraies pages web au-delà de ça. **Authentification par token (Sanctum)** avec 2 rôles — voir section dédiée ci-dessous. Pest pour les tests (aucun test écrit à ce jour pour les contrôleurs/l'auth — vérifié manuellement via curl/Docker).
- **`mise-dashboard/`** — Frontend Angular 21 (standalone components, signals). C'est l'outil **d'administration/back-office** utilisé par le chef pour créer/éditer fiches techniques, ingrédients, menus, etc. Pas de PWA/service worker configuré ici (usage bureau, pas besoin de hors-ligne).
- **`mise-public/`** — Frontend Angular 21, également standalone/signals. C'est l'app **utilisée en cuisine au quotidien** : consultation des fiches techniques/menus, et surtout l'outil d'**impression d'étiquettes** (traçabilité HACCP). Configurée en **PWA** (`ngsw-config.json`, service worker actif) pour fonctionner sur une tablette de cuisine, y compris en connexion instable. Malgré le nom "public", ce n'est pas (encore) destiné aux clients de l'hôtel — c'est l'app de la brigade.

Les deux frontends consomment la même API Laravel via des services HTTP (`core/services/*.service.ts`), avec des modèles TypeScript dupliqués indépendamment dans chaque repo (`core/models/*.model.ts`) — pas de package partagé.

## Modèle de données (mise-api)

- **Category** (`name, slug, color`) — catégorie de plat (ex. Brunch, Entrée...). Utilisée pour classer les fiches techniques.
- **Station** (`name, slug, color`) — poste de cuisine (ex. Chaud, Froid, Pâtisserie). Une fiche technique appartient à une station.
- **IngredientCategory** (`name, slug, color`) — famille d'ingrédient (ex. Produits laitiers, Céréales).
- **Ingredient** (`name, slug, unit, price, ingredient_category_id`) — a des `allergens` (many-to-many) et des `pictures` (polymorphique). `price` (par unité, ex. €/kg) **est utilisé** côté public pour calculer le coût matière — voir food cost ci-dessous.
- **Allergen** (`name, slug, code, color`) — probablement les 14 allergènes UE. Lié aux ingrédients.
- **FicheTechnique** (la "recette" / fiche de production) : `name, slug, category_id, station_id, servings, difficulty (1-3), description, equipment (array), mise_en_place, plating, chef_tip, haccp, conservation`. A des `ingredients` (many-to-many avec pivot `quantity` + `group_label` pour grouper par sous-recette, ex. "Pâte" / "Garniture"), des `steps` (hasMany, ordonnées, avec `timer_minutes` optionnel), des `pictures` (polymorphique).
- **Menu** (`name, slug, description, starts_at, ends_at`) — a des `sections` (hasMany, ordonnées).
- **MenuSection** (`name, position`) — a des `plats` (hasMany, ordonnés).
- **Plat** (`name, description, position`) — un plat au sein d'une section de menu. A des `fiche_techniques` (many-to-many ordonné) : **un plat peut combiner plusieurs fiches techniques** (ex. un plat principal = fiche protéine + fiche sauce + fiche garniture). Pas de prix de vente sur le Plat/Menu actuellement.
- **Step** (`fiche_technique_id, position, instruction, timer_minutes`).
- **Picture** (`url`, polymorphique via `pictureable`) — rattachée à FicheTechnique ou Ingredient.
- **Appareil** (`name, abbreviation, fonction, temperature_min, temperature_max`) — un appareil suivi en température (frigo, chambre froide, friteuse...). `fonction` est un texte libre décrivant son usage (ex. "Chambre froide légumes"), pas une relation. `temperature_min`/`temperature_max` sont optionnels (nullable) et définissent la plage normale de l'appareil, utilisée pour flaguer les relevés hors plage côté dashboard et public.
- **TemperatureReleve** (`appareil_id, temperature, recorded_at`) — un relevé ponctuel de température pour un appareil. `recorded_at` est un datetime (date + heure). Index sur `(appareil_id, recorded_at)` pour les requêtes de courbe/rapport.
- **User** (`name` unique, `password` hashé, `role` = `user`|`admin`, `email` synthétique non utilisé) — voir "Authentification & rôles" ci-dessous. Le login se fait par `name`, pas par email — la colonne `email` n'existe que parce que la migration de base de Laravel l'exige `NOT NULL UNIQUE` ; elle est générée automatiquement (`slug(name)-random@mise.local`) et masquée des réponses API (`#[Hidden]` sur le modèle), jamais affichée ni utilisée.
- **Channel** (`name` unique) — un salon de discussion interne. `ChannelSeeder` crée un chanel "Général" + un chanel par `Station` existante (`firstOrCreate` par nom, comme les autres seeders de référentiel — tourne à chaque démarrage du conteneur, sans dupliquer). Un admin peut en créer d'autres depuis l'UI.
- **Message** (`channel_id, user_id, parent_id nullable, content`) — un message dans un chanel. `parent_id` pointe vers le message auquel il répond : un seul niveau de réponse (pas de threads imbriqués). Supprimer un message supprime ses réponses en cascade (base de données).
- **ShoppingItem** (`user_id, name, status = todo|done`) — un article de la liste de courses partagée. Texte libre uniquement, aucun lien avec `Ingredient` ni avec les quantités d'une fiche technique.
- **Event** (`name, detail, horaire, couverts, type, start_date, end_date, menu_id`) — un événement du calendrier. `type` est une chaîne validée contre une liste fermée côté contrôleur (`brunch|groupe|evenement|autre`), pas de table dédiée. `menu_id` optionnel (`nullOnDelete`) lie éventuellement un `Menu` prévu pour l'événement. `couverts` (nombre de couverts prévus) et `horaire`/`detail` (texte libre) sont tous optionnels.

Les allergènes d'une fiche technique ne sont **pas stockés directement** — ils sont recalculés côté client (`enrich-fiche-technique.ts` dans mise-public) en croisant la liste des ingrédients de la fiche avec leurs allergènes, car l'API n'eager-load pas `ingredients.allergens`.

## Fonctionnalités déjà en place (ne pas reproposer telles quelles)

- **CRUD complet** sur categories/stations/allergens/ingredient-categories/ingredients/fiche-techniques/menus/pictures (`Route::apiResource`).
- **Import/export markdown des fiches techniques** (`mise-dashboard/src/app/core/utils/fiche-technique-markdown.ts`) — fonctionnalité clé à connaître : un format texte structuré permet de coller plusieurs fiches d'un coup (une IA peut générer ce texte, le chef colle dans l'écran d'import, l'app résout automatiquement stations/catégories/ingrédients existants et crée les manquants). **Format exact** (à respecter si on génère des fiches techniques pour cette app) :

  ```
  # Nom de la fiche
  Station: <nom station>
  Catégorie: <nom catégorie>
  Portions: <nombre>
  Difficulté: <1|2|3>

  ## Description
  texte libre

  ## Matériel
  - équipement 1
  - équipement 2

  ## Ingrédients
  ### Nom du sous-groupe (optionnel, sinon pas de ### )
  - Nom ingrédient — quantité unité

  ## Mise en place
  texte libre

  ## Étapes
  1. Instruction (X min)
  2. Instruction sans minuteur

  ## Dressage
  texte libre

  ## Conseil du chef
  texte libre

  ## HACCP
  texte libre

  ## Conservation
  texte libre
  ```
  Plusieurs fiches peuvent être collées à la suite (chaque nouveau `# Titre` démarre un nouveau bloc). L'export (`ficheTechniqueToMarkdown`) régénère exactement ce même format pour permettre un aller-retour.

- **Impression d'étiquettes de traçabilité HACCP** (`mise-public`, page `labels`) — fonctionnalité déjà assez avancée :
  - Types d'étiquettes : Ouvert le / Produit le / Congelé le / Décongelé le / Jeter le, chacune avec une DLC suggérée (éditable) par défaut.
  - Intégration **imprimante thermique Brother QL** en direct depuis le navigateur (WebUSB/WebSerial via un service dédié `brother-ql-printer.service.ts`), avec le catalogue réel des formats d'étiquettes Brother DK (die-cut et rouleaux continus).
  - Fallback impression navigateur classique (`window.print()`).
  - File d'attente d'étiquettes à imprimer en lot, avec un compteur de quantité (1-10, +/-) par étiquette composée : `QueuedLabel.quantity` stocke le nombre de copies ; `printableLabels()` (dans `labels.ts`) déplie la file en autant d'entrées physiques pour l'impression navigateur (`.print-batch`) et pour l'impression Brother QL — `printLabelsOnBrotherQl` lui-même ignore la quantité, il imprime juste une fois par entrée du tableau qu'on lui passe.
  - **Pas d'historique/journal des étiquettes imprimées** — une fois imprimée, l'info n'est conservée nulle part côté serveur (pas de traçabilité a posteriori pour un contrôle sanitaire).
- **Filtrage des fiches techniques** côté public par station + recherche texte (pas de filtre par allergène, pas de filtre par catégorie côté ce composant).
- **Affichage des allergènes** par fiche technique côté public (agrégés depuis les ingrédients).
- **Food cost par fiche technique** (`mise-public`, `recipe-detail.ts`) : coût de chaque ligne d'ingrédient (`ingredient.price × pivot.quantity`, dans l'unité propre de l'ingrédient — pas de conversion d'unité), total de la fiche, et **prix / portion** (`totalCost() / servings()`), tous recalculés en direct quand le chef ajuste le nombre de portions (le dial +/-). Si un ingrédient de la fiche n'a pas de prix renseigné, le total/prix-portion affichés sont préfixés `≥` avec une note "Coût incomplet" — pas de silence sur une donnée manquante. Pas de prix de vente ni de marge (juste le coût matière).
- **Suivi de température des appareils (frigos, chambres froides, friteuses...)** — traçabilité HACCP numérique :
  - `mise-dashboard` : CRUD des appareils (page `/appareils` — nom, abréviation, fonction, plage normale min/max optionnelle), et une page `/temperatures` avec sélecteur d'appareil + période (semaine / mois calendaire choisi via `<input type="month">` / année calendaire choisie via un `<select>` qui ne s'affiche que si l'appareil a des relevés sur **plusieurs** années — sinon l'année unique est utilisée silencieusement), courbe (SVG, hover avec tooltip, min/max/moyenne, repères pointillés + points rouges pour la plage normale si définie, **points espacés également sur l'axe X par rang plutôt que proportionnellement au temps écoulé** — un relevé isolé après une longue période sans données n'écrase pas le reste du graphique) et tableau détaillé (lignes hors plage surlignées), avec un bouton d'impression du rapport (`window.print()` + mise en page dédiée `@media print`).
  - `mise-public` : page `/temperatures` où la brigade saisit en une fois la température de tous les appareils (un input par appareil, avec alerte visuelle immédiate si la valeur saisie sort de la plage normale de l'appareil), envoyés en une série de requêtes `POST /api/temperature-releves`.
  - API : `Route::apiResource` classique sur `appareils` (avec `temperature_min`/`temperature_max` nullable, validés `max >= min` uniquement si les deux sont fournis) et `temperature-releves`, ce dernier filtrable par `appareil_id`/`from`/`to` (utilisé par la courbe et le rapport). Aucune alerte n'est envoyée côté serveur pour un relevé hors plage — c'est purement un affichage/flag côté client, la saisie n'est jamais bloquée.
  - `/api/appareils` est mis en cache PWA côté `mise-public` (référentiel peu changeant, comme categories/stations/ingredients) ; `/api/temperature-releves` ne l'est pas (endpoint d'écriture, pas de file d'attente offline — comme le reste de l'app, une saisie nécessite une connexion).
- **Suivi du changement d'huile des friteuses** — même schéma que le suivi de température, adapté à un événement discret plutôt qu'une mesure continue :
  - Modèles : **Friteuse** (`name, duree_vie_jours`) et **ChangementHuile** (`friteuse_id, date_changement` — date seule, pas d'heure). `Friteuse::changementsHuile()` est eager-loadée sur `index`/`show` (triée par date desc) pour que le front n'ait besoin que d'un seul appel pour afficher historique + date conseillée.
  - "Date de changement conseillée" = dernier changement + `duree_vie_jours`, calculée **côté client** (`core/utils/friteuse-schedule.ts`, dupliqué dans les deux frontends comme le reste des modèles) — jamais stockée en base. `isChangeOverdue()` compare cette date à aujourd'hui pour le flag visuel "À changer" (rouge), même logique que le hors-plage des températures.
  - `mise-dashboard` : CRUD des friteuses (page `/friteuses`, liste avec dernier changement + prochain conseillé), et un rapport `/huile` (sélecteur friteuse + période semaine/mois/année, même mécanique que `/temperatures` sans le graphique — un événement discret n'a pas de courbe à tracer, juste un tableau de dates) avec impression.
  - `mise-public` : page `/huile`, une carte par friteuse (dernier changement, prochain conseillé, historique dépliable, bouton "Marquer changée"). **La date est volontairement non modifiable** : le champ `<input type="date">` est affiché (pour montrer quelle date sera enregistrée) mais `disabled`, toujours calé sur aujourd'hui — impossible d'antidater ou postdater un changement depuis cette page (contrairement aux relevés de température, où la date/heure est automatique côté serveur de toute façon).
  - API : `Route::apiResource` sur `friteuses` (lecture ouverte à `user`, écriture `admin`) et `changements-huile` (CRUD complet ouvert à `user`, comme `temperature-releves`).
- **Discussion interne** (`mise-dashboard` et `mise-public`, page `/discussion`) — chanels façon messagerie simple, pas une fonctionnalité "cuisine" à proprement parler mais un outil de coordination interne :
  - Plusieurs `channels`, création/suppression réservées à l'admin (nom unique validé) ; tout utilisateur connecté (`user` ou `admin`) peut lire et poster des messages dans n'importe quel chanel existant, avec un seul niveau de réponse (`parent_id`) — pas de threads imbriqués au-delà. `ChannelSeeder` pré-crée "Général" + un chanel par station (voir modèle `Channel` ci-dessus) ; ces chanels ne se resynchronisent pas si une station est renommée/supprimée après coup (pas de lien en base entre `Channel` et `Station`, juste un nom identique au moment du seed).
  - Suppression d'un message réservée à l'admin (cascade sur ses réponses).
  - **Pas de temps réel** : rafraîchissement par polling toutes les 8 secondes (`POLL_INTERVAL_MS`) tant qu'un chanel est ouvert à l'écran — pas de WebSocket/SSE/notification.
  - `mise-public` réutilise la même logique que `mise-dashboard` mais son écran n'expose pas les contrôles de création/suppression de chanel ni de suppression de message (même si un compte `admin` connecté côté public en aurait le droit via l'API).
- **Liste de courses partagée** (`mise-dashboard` et `mise-public`, page `/courses`) :
  - N'importe quel utilisateur connecté peut ajouter un article — texte libre uniquement, pas de quantité/unité, pas de lien avec `Ingredient`.
  - Seul l'admin peut cocher un article comme fait (bascule `todo`/`done`) ou le supprimer ; ces actions (+ tri par statut, "tout vider") ne sont exposées que côté `mise-dashboard`. `mise-public` n'affiche que le formulaire d'ajout et la liste en lecture, sans action de modification/suppression.
- **Calendrier d'événements** (`mise-dashboard` et `mise-public`, page `/calendrier`) — répond en partie au manque "notion d'événement/banquet" identifié plus bas :
  - Un `Event` a un nom, une plage de dates (`start_date`/`end_date`, sur plusieurs jours possible), un `type` (brunch/groupe/événement/autre), un nombre de couverts prévus, un horaire et un détail en texte libre, et peut optionnellement être lié à un `Menu` existant.
  - Vue calendrier mensuelle (grille Lun→Dim), navigation mois précédent/suivant/aujourd'hui. `GET /api/events?month&year` renvoie aussi les événements qui débordent depuis/vers le mois voisin (chevauchement de plage, pas juste `start_date` dans le mois).
  - Création/édition/suppression réservées à l'admin, y compris depuis `mise-public` (le chef peut gérer le calendrier depuis la cuisine) ; côté `mise-public`, l'écran reste en lecture avec un détail au clic sur un événement, pas de formulaire d'édition.

## Authentification & rôles

Login par **nom seul** (pas d'email) + mot de passe, volontairement très simple (ex. `1234abcd`) — outil interne à faible enjeu de sécurité, pas de complexité de mot de passe imposée.

- **API** : `laravel/sanctum` en mode **token bearer pur** (pas le mode SPA/cookie — évite tout le sujet CSRF/`stateful domains`, inutile ici puisque chaque frontend proxie déjà `/api` en same-origin via son propre nginx/`proxy.conf.json`). `POST /api/auth/login` (`{name, password}` → `{token, user}`), `POST /api/auth/logout` (révoque le token courant), `GET /api/auth/me`. `GET /api/auth/users` est **publique** (pas d'auth) et ne renvoie que `id`+`name` — sert uniquement au sélecteur de compte sur l'écran de connexion public, jamais de rôle ni mot de passe.
- **2 rôles**, portés par `User.role` (`user` | `admin`), imposés serveur-side (middleware `role:admin`, alias défini dans `bootstrap/app.php` → `App\Http\Middleware\EnsureUserHasRole`) :
  - `user` : lecture (`index`/`show`) sur categories/stations/allergens/ingredient-categories/ingredients/fiche-techniques/menus/appareils/friteuses/channels/events. Écritures ouvertes en plus de cette lecture : CRUD complet sur `temperature-releves` et `changements-huile` (saisies côté public), lecture + création de messages dans les chanels existants (pas de suppression, pas de gestion de chanel), création d'articles sur la liste de courses (pas de changement de statut ni suppression) — pas de création/édition/suppression d'événements.
  - `admin` : tout ce que `user` peut faire, plus écriture sur toutes les autres ressources, plus `users` (CRUD, gestion des comptes).
  - Routes définies dans `routes/api.php` : un groupe `auth:sanctum` pour tout ce qui nécessite une session, puis un sous-groupe `role:admin` imbriqué pour les routes d'écriture réservées.
- **Bootstrap** : `UserSeeder` crée un unique compte admin **seulement si la table `users` est totalement vide** (`User::query()->exists()` — contrairement aux autres seeders qui tournent à chaque démarrage via `firstOrCreate`, celui-ci ne doit jamais recréer le compte si un admin l'a renommé/supprimé). Nom/mot de passe via `ADMIN_NAME`/`ADMIN_PASSWORD` (`.env` docker, défaut `Thomas`/`1234abcd`).
- **Garde-fou** : impossible de supprimer ou de rétrograder le **dernier compte admin** (`UserController::destroy`/`update` vérifient `User::where('role','admin')->count() <= 1`) — évite un dashboard qui devient inaccessible à tout le monde.
- **`mise-dashboard`** : réservé au rôle `admin`. `AuthService`/`auth.interceptor.ts` (ajoute `Authorization: Bearer`, déconnecte sur 401)/`admin.guard.ts` (redirige vers `/login` si non connecté OU si connecté mais pas admin — dans ce cas déconnecte aussi). Page `/login` pleine page (topbar masquée, cf. `App.isLoginPage` basé sur les événements du routeur) ; si un compte `user` tente de se connecter, le message "réservé aux administrateurs" s'affiche côté client (l'API refuserait de toute façon chaque appel réel). Page `/utilisateurs` (admin) : CRUD des comptes, mot de passe laissé vide à l'édition = inchangé.
- **`mise-public`** : accessible aux deux rôles. Page `/login` avec un **sélecteur de comptes** (chips cliquables, alimentés par `GET /api/auth/users`) en plus de la saisie libre nom/mot de passe — un compte `admin` peut aussi se connecter ici (ex. le chef qui consulte une fiche technique depuis la cuisine).
- Token stocké en `localStorage` (`mise_token`/`mise_user`) dans les deux apps — pas de refresh token, pas d'expiration configurée côté Sanctum (`config/sanctum.php` par défaut : tokens valables indéfiniment jusqu'à déconnexion explicite).

## Ce qui n'existe pas encore (vrais manques, pas juste des détails)

- Food cost (total + prix/portion) existe côté public (voir ci-dessus) mais aucun prix de vente ni marge — pas de notion de prix de vente sur Plat/Menu.
- Mise à l'échelle des portions **existe** côté public (`recipe-detail.ts` — dial +/-, `scaleFactor`, quantités et coût recalculés en direct) ; rien côté dashboard.
- Aucune agrégation des besoins entre plusieurs fiches/menus (pas de génération de liste de courses ou de prépa consolidée pour un service/événement). La liste de courses partagée (voir ci-dessus) ne résout pas ce manque : c'est un simple pense-bête en texte libre, sans lien avec les ingrédients/quantités des fiches techniques.
- Aucun historique de modification des fiches techniques (versioning).
- Notion d'événement/banquet (nombre de couverts, menu dédié, horaire, type) **désormais couverte** par le calendrier d'événements (voir ci-dessus), distincte du `Menu` daté générique. Reste manquant : pas de contraintes structurées (allergies du groupe, régimes spécifiques) au-delà d'un champ `detail` en texte libre, et aucun rattachement d'un événement à une prépa/liste de courses dédiée (rejoint le manque d'agrégation ci-dessus).
- Suivi du changement d'huile de friteuse **fait** (voir ci-dessus) — comme le suivi de température, l'alerte "à changer" reste un flag visuel client, pas une notification serveur.
- La plage normale (min/max) par appareil n'entraîne qu'un flag visuel côté client (dashboard + public) — pas d'alerte push/email/notification serveur quand un relevé sort de la plage.
- Discussion interne **faite** (voir ci-dessus) mais sans aucune notification (pas de badge "non lu", pas de push) — il faut avoir l'écran `/discussion` ouvert et attendre le polling pour voir un nouveau message.
- Le "Impréssion" mentionné dans `mise/Readme` comme fonction attendue couvre désormais les étiquettes et le rapport de température, mais pas forcément l'impression "propre" d'une fiche technique complète ou d'un menu en PDF/format présentable.

## Déploiement Docker

`docker-compose.yml` à la racine de `mise/` (créé lui-même à partir de rien — ne pas confondre avec `dev/docker-composer.yaml`, un fichier générique préexistant à la racine du dépôt `dev/`, sans rapport avec MISE). Cinq services :

- **`db`** — `mysql:8.4`, volume nommé `mise_db_data`, pas de port publié sur l'hôte (accès uniquement via le réseau interne du compose).
- **`api`** — build `./mise-api` (image `php:8.4-apache`, docroot pointé sur `public/`). L'entrypoint (`mise-api/docker/entrypoint.sh`) attend que MySQL réponde (boucle PDO), lance `php artisan migrate --force` puis `php artisan db:seed --force` (catégories/stations/allergènes/catégories d'ingrédients/ingrédients de base), puis `php artisan storage:link` si absent, avant de démarrer Apache. Le seed tourne à **chaque démarrage du conteneur**, pas seulement au premier déploiement — sans danger car ces seeders utilisent `firstOrCreate`/`sync` (no-op une fois les données déjà présentes). Exception : `UserSeeder` (compte admin bootstrap `ADMIN_NAME`/`ADMIN_PASSWORD`, voir "Authentification & rôles") ne s'exécute réellement que si la table `users` est encore vide, pour ne jamais recréer le compte après coup. Port `8000`. Stockage des photos (`storage/app/public`) sur un volume nommé `mise_api_storage`.
- **`dashboard`** / **`public`** — build multi-stage (node 22 → `ng build --configuration production` → nginx alpine servant `dist/*/browser`). `docker/nginx.conf` de chaque repo fait le fallback SPA (`try_files … /index.html`) et proxy `/api/` vers le service `api` (même origine relative que `environment.apiUrl = '/api'`, donc aucun CORS à gérer — même principe que `proxy.conf.json` en dev). Ports `8081` (dashboard) et `8082` (public). Celui de `mise-public` ajoute un `location = /ngsw.json { add_header Cache-Control "no-cache"; }` pour que le service worker détecte toujours les nouvelles versions.
- **`phpmyadmin`** — `phpmyadmin/phpmyadmin`, pointé sur `db`, port `8083`. Ajouté à la demande, non testé après ajout (pas de rebuild/up lancé pour cette étape-là).

Config : copier `mise/.env.example` en `mise/.env` (gitignoré via `/mise/.env` dans le `.gitignore` racine de `dev/`) et ajuster `DB_*`/`APP_KEY`/`APP_URL`. Le `docker-compose.yml` fixe lui-même le reste (host DB interne, drivers session/cache/queue en base) via son propre bloc `environment:`, pas éditable depuis `.env`.

**Build testé de bout en bout** (build + up + migrations + proxy /api sur les deux frontends + persistance des données après un `down`/`up`) — a mis au jour et corrigé deux bugs de portabilité préexistants, sans rapport direct avec Docker mais qui cassaient tout build hors Windows :
- `mise-dashboard/package.json` et `mise-public/package.json` listaient `@esbuild/win32-x64` et `@rollup/rollup-win32-x64-msvc` en dépendances **obligatoires** (probablement ajoutées par erreur lors d'un `npm install` sous Windows) — cassait `npm ci` sur toute machine Linux/Mac. Retirées ; ces paquets restent installés normalement comme dépendances optionnelles propres à la plateforme d'esbuild/rollup. **Sur Windows, après un `npm install` frais, il peut falloir un `npm install @esbuild/win32-x64 @rollup/rollup-win32-x64-msvc --no-save` en plus** — bug connu de npm avec les `optionalDependencies` (npm/cli#4828) qui ne les réinstalle pas toujours tout seul.
- `mise-api/composer.json` déclarait `"php": "^8.3"` mais le `composer.lock` verrouillait des paquets symfony nécessitant PHP 8.4.1+ — corrigé en `^8.4` (qui correspond à ce que la machine de dev locale fait tourner de toute façon).

## Conventions de code observées

- Angular : standalone components, `signal`/`computed`/`input`/`output`/`model`, pas de NgModules, RxJS uniquement à l'interop (`toSignal`) pour les appels HTTP.
- Commentaires rares mais présents quand une décision n'est pas évidente (ex. pourquoi `ingredients.allergens` n'est pas eager-loadé).
- Laravel : contrôleurs `apiResource` classiques, pas de Form Requests dédiées identifiées, pas de policies/gates.
- Tout le texte utilisateur (UI, messages d'erreur, contenu des fiches) est en français.
