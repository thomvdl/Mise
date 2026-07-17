<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    // Une description humaine ne peut pas se déduire des routes elles-mêmes — le reste
    // (méthode, URL, action) est lu directement depuis les routes enregistrées, pour que
    // cette page ne devienne jamais obsolète quand une ressource est ajoutée/retirée.
    $descriptions = [
        'auth' => 'Connexion par nom + mot de passe (Sanctum, token bearer), session courante.',
        'categories' => 'Catégories de plats (ex. Brunch, Entrée...).',
        'stations' => 'Postes de cuisine (ex. Chaud, Froid, Pâtisserie).',
        'allergens' => 'Les 14 allergènes UE, liés aux ingrédients.',
        'ingredient-categories' => "Familles d'ingrédients (ex. Produits laitiers, Céréales).",
        'ingredients' => 'Ingrédients : unité, prix, allergènes, catégorie.',
        'fiche-techniques' => 'Fiches techniques (recettes) : ingrédients, étapes, HACCP...',
        'menus' => 'Menus, organisés en sections puis en plats.',
        'pictures' => "Photos rattachées à une fiche technique ou un ingrédient.",
        'appareils' => 'Appareils suivis en température (frigos, chambres froides, friteuses...).',
        'temperature-releves' => 'Relevés de température ponctuels pour un appareil.',
        'friteuses' => "Friteuses suivies pour le changement d'huile.",
        'changements-huile' => "Historique des changements d'huile par friteuse.",
        'channels' => 'Chanels de la discussion interne à la brigade.',
        'messages' => "Messages d'un chanel, avec réponses en fil (parent_id).",
        'shopping-items' => 'Articles de la liste de courses partagée (todo/done).',
        'events' => "Événements du calendrier (banquets, événements...), liés à un menu.",
    ];

    $actionLabels = [
        'index' => 'Liste',
        'show' => 'Détail',
        'store' => 'Créer',
        'update' => 'Modifier',
        'destroy' => 'Supprimer',
    ];

    $resources = [];
    foreach (Route::getRoutes() as $route) {
        $uri = $route->uri();
        if (! str_starts_with($uri, 'api/')) {
            continue;
        }

        $resource = explode('/', substr($uri, 4))[0];
        $methods = implode('/', array_diff($route->methods(), ['HEAD']));
        $action = $actionLabels[$route->getActionMethod()] ?? $route->getActionMethod();

        $resources[$resource][] = [
            'action' => $action,
            'method' => $methods,
            'uri' => '/'.$uri,
        ];
    }

    ksort($resources);

    return view('api-docs', ['resources' => $resources, 'descriptions' => $descriptions]);
});
