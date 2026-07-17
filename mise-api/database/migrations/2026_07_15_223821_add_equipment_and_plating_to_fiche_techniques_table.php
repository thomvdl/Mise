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
        Schema::table('fiche_techniques', function (Blueprint $table) {
            $table->json('equipment')->nullable()->after('description');
            $table->text('mise_en_place')->nullable()->after('equipment');
            $table->text('plating')->nullable()->after('mise_en_place');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fiche_techniques', function (Blueprint $table) {
            $table->dropColumn(['equipment', 'mise_en_place', 'plating']);
        });
    }
};
