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
        Schema::table('users', function (Blueprint $table) {
            // Code opaque généré côté serveur (pas un EAN produit) — imprimé sur un badge, scanné
            // sur l'écran de connexion de mise-public pour se connecter sans mot de passe. Nullable
            // : un utilisateur sans badge continue de se connecter par nom + mot de passe comme
            // aujourd'hui.
            $table->string('login_barcode')->nullable()->unique()->after('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('login_barcode');
        });
    }
};
