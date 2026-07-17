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
            $table->text('chef_tip')->nullable()->after('plating');
            $table->text('haccp')->nullable()->after('chef_tip');
            $table->text('conservation')->nullable()->after('haccp');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fiche_techniques', function (Blueprint $table) {
            $table->dropColumn(['chef_tip', 'haccp', 'conservation']);
        });
    }
};
