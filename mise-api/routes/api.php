<?php

use App\Http\Controllers\AllergenController;
use App\Http\Controllers\AppareilController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ChangementHuileController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\FicheTechniqueController;
use App\Http\Controllers\FriteuseController;
use App\Http\Controllers\IngredientCategoryController;
use App\Http\Controllers\IngredientController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\PictureController;
use App\Http\Controllers\PrintedLabelController;
use App\Http\Controllers\ShoppingItemController;
use App\Http\Controllers\StationController;
use App\Http\Controllers\TemperatureReleveController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Publiques — la liste ne renvoie que id/name, utilisée par l'écran de connexion public
// pour proposer un sélecteur de compte plutôt que de faire taper le nom.
Route::post('auth/login', [AuthController::class, 'login']);
Route::get('auth/users', [AuthController::class, 'publicUsers']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    // Lecture ouverte à tout utilisateur connecté (rôle user ou admin) — c'est ce que
    // consomme mise-public pour parcourir fiches/menus/ingrédients/appareils.
    Route::apiResource('categories', CategoryController::class)->only(['index', 'show']);
    Route::apiResource('stations', StationController::class)->only(['index', 'show']);
    Route::apiResource('allergens', AllergenController::class)->only(['index', 'show']);
    Route::apiResource('ingredient-categories', IngredientCategoryController::class)->only(['index', 'show']);
    Route::apiResource('ingredients', IngredientController::class)->only(['index', 'show']);
    Route::apiResource('fiche-techniques', FicheTechniqueController::class)->only(['index', 'show']);
    Route::apiResource('menus', MenuController::class)->only(['index', 'show']);
    Route::apiResource('appareils', AppareilController::class)->only(['index', 'show']);
    Route::apiResource('friteuses', FriteuseController::class)->only(['index', 'show'])
        ->parameters(['friteuses' => 'friteuse']);

    // Les relevés de température et les changements d'huile sont les seules écritures ouvertes
    // au rôle user (saisie côté public).
    // Paramètre explicite car l'inflecteur anglais de Laravel singularise "temperature-releves"
    // en "temperature-relefe" — ça ne correspond plus à `TemperatureReleve $temperatureReleve`
    // et le model binding implicite échoue silencieusement (modèle vide au lieu d'une 404/lookup).
    Route::apiResource('temperature-releves', TemperatureReleveController::class)
        ->parameters(['temperature-releves' => 'temperature_releve']);
    Route::apiResource('changements-huile', ChangementHuileController::class);

    // Historique des étiquettes imprimées (traçabilité HACCP) — écriture ouverte au rôle user
    // (chaque impression côté public s'enregistre elle-même), append-only (only index/store,
    // voir PrintedLabelController).
    Route::apiResource('printed-labels', PrintedLabelController::class)->only(['index', 'store']);

    // Chanel de discussion — lecture et écriture de messages ouvertes à tout utilisateur
    // connecté (user ou admin), seule la création/suppression de chanels et la suppression
    // de messages sont réservées à l'admin (groupe role:admin plus bas).
    Route::apiResource('channels', ChannelController::class)->only(['index']);
    Route::apiResource('messages', MessageController::class)->only(['index', 'store']);

    // Liste de courses — n'importe qui peut ajouter un article ; seul l'admin peut changer
    // son statut (à faire/fait) ou le supprimer (groupe role:admin plus bas).
    Route::apiResource('shopping-items', ShoppingItemController::class)->only(['index', 'store'])
        ->parameters(['shopping-items' => 'shopping_item']);

    // Calendrier d'événements — lecture ouverte (vue calendrier côté public), écriture
    // réservée à l'admin (groupe role:admin plus bas).
    Route::apiResource('events', EventController::class)->only(['index'])
        ->parameters(['events' => 'event']);

    // Tout le reste (édition du référentiel + gestion des utilisateurs) est réservé au dashboard/admin.
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('categories', CategoryController::class)->except(['index', 'show']);
        Route::apiResource('stations', StationController::class)->except(['index', 'show']);
        Route::apiResource('allergens', AllergenController::class)->except(['index', 'show']);
        Route::apiResource('ingredient-categories', IngredientCategoryController::class)->except(['index', 'show']);
        Route::apiResource('ingredients', IngredientController::class)->except(['index', 'show']);
        Route::apiResource('fiche-techniques', FicheTechniqueController::class)->except(['index', 'show']);
        Route::apiResource('menus', MenuController::class)->except(['index', 'show']);
        Route::apiResource('appareils', AppareilController::class)->except(['index', 'show']);
        Route::apiResource('friteuses', FriteuseController::class)->except(['index', 'show'])
            ->parameters(['friteuses' => 'friteuse']);
        Route::apiResource('pictures', PictureController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::apiResource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::apiResource('channels', ChannelController::class)->only(['store', 'destroy']);
        Route::apiResource('messages', MessageController::class)->only(['destroy']);
        Route::apiResource('shopping-items', ShoppingItemController::class)->only(['update', 'destroy'])
            ->parameters(['shopping-items' => 'shopping_item']);
        Route::apiResource('events', EventController::class)->only(['store', 'update', 'destroy'])
            ->parameters(['events' => 'event']);
    });
});
