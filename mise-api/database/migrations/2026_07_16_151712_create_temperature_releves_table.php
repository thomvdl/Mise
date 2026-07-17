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
        Schema::create('temperature_releves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appareil_id')->constrained()->cascadeOnDelete();
            $table->decimal('temperature', 4, 1);
            $table->dateTime('recorded_at');
            $table->timestamps();

            $table->index(['appareil_id', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('temperature_releves');
    }
};
