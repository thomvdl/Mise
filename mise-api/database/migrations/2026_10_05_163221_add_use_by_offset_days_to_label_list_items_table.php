<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Décalage de DLC (en jours depuis la date d'impression) propre à cette ligne — remplace le
 * défaut du type (voir LABEL_TYPES côté mise-public) quand renseigné. `null` = garder le
 * comportement par défaut du type choisi au moment d'ajouter la sélection à la file.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('label_list_items', function (Blueprint $table) {
            $table->unsignedTinyInteger('use_by_offset_days')->nullable()->after('quantity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('label_list_items', function (Blueprint $table) {
            $table->dropColumn('use_by_offset_days');
        });
    }
};
