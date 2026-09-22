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
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->longText('content')->nullable();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Une seule profondeur de sous-page : restrictOnDelete (plutôt que cascade comme les
            // messages) pour empêcher de supprimer une page qui a encore des sous-pages — le
            // contrôleur renvoie une erreur de validation claire avant même d'atteindre la base.
            $table->foreignId('parent_id')->nullable()->constrained('notes')->restrictOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
