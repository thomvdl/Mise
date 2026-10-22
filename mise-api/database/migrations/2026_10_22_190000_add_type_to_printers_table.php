<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Permet à une ligne `Printer` de désigner soit une étiqueteuse Zebra (comme avant,
     * `type = 'label'`), soit un ticket thermique ESC/POS (`type = 'thermal'`, ex. Epson TM-m30),
     * pour imprimer les fiches techniques en cuisine. Les deux imprimantes d'un même poste sont
     * deux lignes distinctes (même `ip`, pas de colonne `port` : chaque type a son port fixe côté
     * pont mise-app — 9100 pour les étiquettes comme avant, 9101 pour les tickets, voir
     * EscposPrinter/ZplPrinter) — pas un "poste" unique avec plusieurs imprimantes attachées, pour
     * rester sur le même modèle simple (une ligne = une imprimante = une adresse à contacter).
     *
     * `paper_width_mm` ne sert qu'au type thermique (58 ou 80mm, détermine le nombre de
     * caractères par ligne du ticket — voir EscposFicheTechniqueBuilder) ; les colonnes
     * `label_*`/`dpi`/`rotate_90`/`top_offset_mm` existantes ne servent elles qu'au type étiquette
     * et restent inutilisées (mais toujours valides grâce à leurs valeurs par défaut) sur une
     * ligne thermique plutôt que d'ajouter une table séparée pour une différence aussi mince.
     */
    public function up(): void
    {
        Schema::table('printers', function (Blueprint $table) {
            $table->string('type')->default('label')->after('name');
            $table->unsignedSmallInteger('paper_width_mm')->nullable()->after('top_offset_mm');
        });
    }

    public function down(): void
    {
        Schema::table('printers', function (Blueprint $table) {
            $table->dropColumn(['type', 'paper_width_mm']);
        });
    }
};
