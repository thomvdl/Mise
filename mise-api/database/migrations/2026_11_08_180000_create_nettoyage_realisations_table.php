<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Registre du plan de nettoyage : une ligne chaque fois qu'une tâche est marquée faite, avec qui
 * et quand (`created_at`). Append-only comme `printed_labels` — voir NettoyageRealisationController.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('nettoyage_realisations', function (Blueprint $table) {
            $table->id();
            // nullOnDelete + zone/tache_name/user_name en doublon : supprimer une tâche du plan ou
            // le compte d'un employé parti ne doit jamais effacer ni rendre illisible une preuve
            // de nettoyage déjà enregistrée (même principe que printed_labels).
            $table->foreignId('nettoyage_tache_id')->nullable()->constrained()->nullOnDelete();
            $table->string('zone', 100);
            $table->string('tache_name');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name');
            $table->timestamps();

            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nettoyage_realisations');
    }
};
