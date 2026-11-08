<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Plan de nettoyage et de désinfection (PND) : quoi nettoyer, où, quand, qui, avec quel produit
 * et comment. Pour l'instant un référentiel affiché en cuisine — aucune validation des tâches
 * faites (pas de journal), contrairement aux relevés de température.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('nettoyage_taches', function (Blueprint $table) {
            $table->id();
            $table->string('zone', 100);
            $table->string('name');
            $table->string('frequence', 30);
            $table->string('moment', 100)->nullable();
            $table->string('responsable', 100)->nullable();
            $table->string('produit')->nullable();
            $table->text('methode')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nettoyage_taches');
    }
};
