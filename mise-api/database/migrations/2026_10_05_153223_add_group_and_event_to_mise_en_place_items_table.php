<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Une tâche de mise en place se rattache désormais à une station, un groupe ou un événement — un
 * seul des trois, jamais zéro (voir MiseEnPlaceItemController::rules) — donc `station_id` devient
 * nullable en base au lieu de rester seul choix obligatoire.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // `foreignId(...)->nullable()->change()` exige doctrine/dbal, absent du projet — on
        // relâche la contrainte NOT NULL directement en SQL pour l'éviter.
        DB::statement('ALTER TABLE mise_en_place_items MODIFY station_id BIGINT UNSIGNED NULL');

        Schema::table('mise_en_place_items', function (Blueprint $table) {
            $table->foreignId('group_id')->nullable()->after('station_id')->constrained()->restrictOnDelete();
            $table->foreignId('event_id')->nullable()->after('group_id')->constrained()->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mise_en_place_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('group_id');
            $table->dropConstrainedForeignId('event_id');
        });

        DB::statement('ALTER TABLE mise_en_place_items MODIFY station_id BIGINT UNSIGNED NOT NULL');
    }
};
