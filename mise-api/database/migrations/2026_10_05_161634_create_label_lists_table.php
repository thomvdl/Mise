<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Liste nommée et réutilisable de produits à étiqueter (ex. "Mise en place du lundi") — voir
 * LabelListItem pour les lignes. Ne stocke aucune date : les dates (fabrication, DLC) sont
 * recalculées au moment de l'impression, pour qu'une liste reste utilisable semaine après semaine.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('label_lists', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('label_lists');
    }
};
