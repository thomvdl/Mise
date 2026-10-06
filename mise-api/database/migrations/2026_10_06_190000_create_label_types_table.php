<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('label_types', function (Blueprint $table) {
            $table->id();
            // Identifiant stable référencé par `printed_labels.type_key` et
            // `label_list_items.type_key` (simples chaînes, pas de clé étrangère — supprimer un
            // type ne doit jamais casser l'historique déjà imprimé).
            $table->string('key')->unique();
            $table->string('name');
            // "J+" — nombre de jours par défaut avant DLC pour ce type ; null = pas de DLC par
            // défaut (même borne que label_list_items.use_by_offset_days, déjà existant).
            $table->unsignedTinyInteger('jplus_days')->nullable();
            $table->string('icon_key')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('label_types');
    }
};
