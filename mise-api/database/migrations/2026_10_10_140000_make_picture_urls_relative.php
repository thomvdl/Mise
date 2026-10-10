<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Les photos importées avant ce correctif ont une URL absolue figée sur APP_URL (ex.
     * http://localhost:8000/storage/...) — ne charge que depuis cette origine précise, jamais
     * depuis le LAN ni le tunnel Cloudflare (voir PictureController::store()). On retire le
     * schéma+hôte, quel qu'il soit, pour ne garder que le chemin — résolu par le navigateur
     * contre l'origine courante une fois servi par le proxy nginx /storage/.
     */
    public function up(): void
    {
        DB::table('pictures')->get(['id', 'url'])->each(function ($picture) {
            $relative = preg_replace('#^https?://[^/]+#', '', $picture->url);

            if ($relative !== $picture->url) {
                DB::table('pictures')->where('id', $picture->id)->update(['url' => $relative]);
            }
        });
    }

    /**
     * Pas de down() utile : on ne connaît plus l'origine d'origine une fois retirée, et la
     * remettre ne serait de toute façon pas plus correct (c'était le bug).
     */
    public function down(): void {}
};
