<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Allergies d'un groupe : les allergènes à éviter (structurés, pour signaler automatiquement les
 * plats concernés) + une note libre pour le détail (qui, combien, régimes non couverts par les
 * 14 allergènes : végétarien, halal…).
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->text('allergies_note')->nullable()->after('detail');
        });

        Schema::create('allergen_event', function (Blueprint $table) {
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('allergen_id')->constrained()->cascadeOnDelete();
            $table->primary(['event_id', 'allergen_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('allergen_event');

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('allergies_note');
        });
    }
};
