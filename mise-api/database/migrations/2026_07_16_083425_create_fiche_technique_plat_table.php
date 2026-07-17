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
        Schema::create('fiche_technique_plat', function (Blueprint $table) {
            $table->foreignId('plat_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fiche_technique_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position')->default(1);
            $table->primary(['plat_id', 'fiche_technique_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fiche_technique_plat');
    }
};
