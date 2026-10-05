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
            $table->json('plating_schema')->nullable()->after('plating');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fiche_techniques', function (Blueprint $table) {
            $table->dropColumn('plating_schema');
        });
    }
};
