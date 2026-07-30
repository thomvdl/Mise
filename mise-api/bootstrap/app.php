<?php

use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['role' => EnsureUserHasRole::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();

// Un seul .env pour tout le projet, à la racine de mise/ (un niveau au-dessus de ce dépôt),
// partagé avec docker-compose. Sans effet dans le conteneur Docker : ce fichier n'y existe pas
// (hors du contexte de build), les variables y arrivent déjà via env_file/environment.
$app->useEnvironmentPath(dirname(__DIR__, 2));

return $app;
