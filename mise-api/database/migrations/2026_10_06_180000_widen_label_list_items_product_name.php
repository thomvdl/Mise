<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * La limite d'affichage/saisie du nom de produit est passée de 55 à 100 caractères (voir
 * PrintedLabelController, LabelListController) — cette colonne était explicitement bornée à 55 en
 * base (`printed_labels.product_name` n'a pas cette limite, c'est un `string()` par défaut, donc
 * rien à faire côté de cette table-là). Raw SQL plutôt que `Blueprint::change()` pour ne pas
 * ajouter une dépendance sur doctrine/dbal juste pour cette seule migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE label_list_items MODIFY product_name VARCHAR(100) NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE label_list_items MODIFY product_name VARCHAR(55) NOT NULL');
    }
};
