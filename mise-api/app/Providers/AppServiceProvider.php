<?php

namespace App\Providers;

use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Pure JSON API, no 'login' web route to redirect guests to — without this, the default
        // Authenticate middleware crashes trying to resolve that route on any unauthenticated
        // request lacking an explicit `Accept: application/json` header.
        Authenticate::redirectUsing(fn () => null);
    }
}
