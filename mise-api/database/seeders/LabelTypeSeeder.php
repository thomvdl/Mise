<?php

namespace Database\Seeders;

use App\Models\LabelType;
use Illuminate\Database\Seeder;

/**
 * Reprend les 5 types historiquement codés en dur (voir ZplLabelBuilder::LABEL_TYPES et le
 * `LABEL_TYPES` front supprimés au profit de cette table) avec leurs `defaultShelfLifeDays`
 * actuels et une icône par défaut — idempotent comme les autres seeders de référence
 * (Station/Category), rejoué à chaque démarrage de conteneur.
 */
class LabelTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['key' => 'ouvert', 'name' => 'OUVERT LE', 'jplus_days' => null, 'icon_key' => 'ouvert', 'position' => 0],
            ['key' => 'produit', 'name' => 'PRODUIT LE', 'jplus_days' => 3, 'icon_key' => 'production', 'position' => 1],
            ['key' => 'congele', 'name' => 'CONGELÉ LE', 'jplus_days' => null, 'icon_key' => 'flocon', 'position' => 2],
            ['key' => 'decongele', 'name' => 'DÉCONGELÉ LE', 'jplus_days' => 2, 'icon_key' => 'goutte', 'position' => 3],
            ['key' => 'jeter', 'name' => 'À JETER LE', 'jplus_days' => 3, 'icon_key' => 'poubelle', 'position' => 4],
        ];

        foreach ($types as $type) {
            LabelType::firstOrCreate(['key' => $type['key']], $type);
        }
    }
}
