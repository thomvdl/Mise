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
        Schema::table('appareils', function (Blueprint $table) {
            $table->decimal('temperature_min', 4, 1)->nullable()->after('fonction');
            $table->decimal('temperature_max', 4, 1)->nullable()->after('temperature_min');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appareils', function (Blueprint $table) {
            $table->dropColumn(['temperature_min', 'temperature_max']);
        });
    }
};
