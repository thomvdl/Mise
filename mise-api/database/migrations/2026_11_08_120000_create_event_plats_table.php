<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Plats prévus pour un événement, avec le nombre de pax de chacun (ex. 25 bœuf / 15 poisson sur
 * 40 couverts). Copie des plats du menu lié plutôt qu'une référence vers `plats` : MenuController
 * supprime et recrée tous les plats à chaque enregistrement d'un menu, une clé étrangère serait
 * perdue au premier changement. Sans menu lié, les lignes sont composées directement à partir
 * des fiches techniques.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('event_plats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('section', 100);
            $table->string('name');
            $table->unsignedInteger('pax')->default(0);
            $table->unsignedInteger('position')->default(1);
            $table->timestamps();
        });

        Schema::create('event_plat_fiche_technique', function (Blueprint $table) {
            $table->foreignId('event_plat_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fiche_technique_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position')->default(1);
            $table->primary(['event_plat_id', 'fiche_technique_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_plat_fiche_technique');
        Schema::dropIfExists('event_plats');
    }
};
