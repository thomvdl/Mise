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
        Schema::create('fiche_technique_component', function (Blueprint $table) {
            $table->foreignId('parent_fiche_technique_id')->constrained('fiche_techniques')->cascadeOnDelete();
            // quantity is a fraction/multiple of the component's own base recipe (e.g. 0.5 = half a
            // batch of the component at ITS OWN `servings`), not an absolute mass/volume — this way
            // scaling the parent's servings and scaling the component both compose by multiplication.
            $table->foreignId('component_fiche_technique_id')->constrained('fiche_techniques')->cascadeOnDelete();
            $table->decimal('quantity', 10, 3);
            $table->string('group_label')->nullable();
            $table->primary(['parent_fiche_technique_id', 'component_fiche_technique_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fiche_technique_component');
    }
};
