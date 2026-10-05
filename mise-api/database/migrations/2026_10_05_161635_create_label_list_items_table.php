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
        Schema::create('label_list_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('label_list_id')->constrained()->cascadeOnDelete();
            $table->string('type_key');
            $table->string('product_name', 55);
            $table->unsignedTinyInteger('quantity')->default(1);
            // Ordre d'affichage/impression — géré par LabelListController::syncItems (toute la
            // liste est remplacée à chaque sauvegarde, pas d'édition ligne à ligne côté API).
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('label_list_items');
    }
};
