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
        Schema::create('printed_labels', function (Blueprint $table) {
            $table->id();
            // nullOnDelete (pas cascade) + user_name en doublon : un compte supprimé plus tard
            // (départ d'un employé) ne doit jamais faire disparaître une preuve d'impression déjà
            // enregistrée — même principe que QueuedLabel.madeBy côté mise-public, qui capture le
            // nom au moment de l'impression plutôt que de dépendre du compte qui existe encore.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name');
            $table->string('type_key');
            $table->string('product_name');
            $table->date('date');
            $table->date('use_by_date')->nullable();
            $table->unsignedTinyInteger('quantity');
            $table->string('printed_via');
            $table->timestamps();

            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('printed_labels');
    }
};
