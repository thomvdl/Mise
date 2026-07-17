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
        Schema::create('changement_huiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('friteuse_id')->constrained()->cascadeOnDelete();
            $table->date('date_changement');
            $table->timestamps();

            $table->index(['friteuse_id', 'date_changement']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('changement_huiles');
    }
};
