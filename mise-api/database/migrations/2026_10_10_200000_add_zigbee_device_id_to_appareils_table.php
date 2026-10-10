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
            $table->string('zigbee_device_id')->nullable()->unique()->after('temperature_max');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appareils', function (Blueprint $table) {
            $table->dropColumn('zigbee_device_id');
        });
    }
};
