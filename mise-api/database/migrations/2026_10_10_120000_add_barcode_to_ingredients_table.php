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
        Schema::table('ingredients', function (Blueprint $table) {
            // Nullable + unique : chaque NULL compte séparément pour MySQL, donc plusieurs
            // ingrédients peuvent rester sans code-barres sans violer l'unicité — voir
            // BarcodeController::lookup(), qui cherche ici avant d'interroger Open Food Facts.
            $table->string('barcode')->nullable()->unique()->after('unit');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ingredients', function (Blueprint $table) {
            $table->dropColumn('barcode');
        });
    }
};
