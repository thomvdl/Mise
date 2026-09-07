<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('mise_en_place_items', function (Blueprint $table) {
            // Nullable en base : les lignes existantes n'ont pas de deadline. La création via
            // l'API l'exige (voir MiseEnPlaceItemController::rules), seules les tâches déjà en
            // base avant cette migration peuvent s'en retrouver sans.
            $table->dateTime('deadline')->nullable()->after('station_id');
            $table->string('urgency')->default('moyenne')->after('deadline');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mise_en_place_items', function (Blueprint $table) {
            $table->dropColumn(['deadline', 'urgency']);
        });
    }
};
