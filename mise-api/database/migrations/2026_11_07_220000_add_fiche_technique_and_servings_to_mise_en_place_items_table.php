<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Une tâche de mise en place peut désormais pointer vers une fiche technique à préparer, avec le
 * nombre de portions à prévoir. Les deux sont optionnels : une tâche libre ("éplucher les
 * oignons") reste possible. Supprimer la fiche ne supprime pas la tâche — elle garde son nom.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('mise_en_place_items', function (Blueprint $table) {
            $table->foreignId('fiche_technique_id')->nullable()->after('event_id')->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('servings')->nullable()->after('fiche_technique_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mise_en_place_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('fiche_technique_id');
            $table->dropColumn('servings');
        });
    }
};
