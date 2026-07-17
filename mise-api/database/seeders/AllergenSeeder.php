<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Allergen;
use Illuminate\Support\Str;

class AllergenSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $allergens = [
            'gluten' => ['code' => 'GLU', 'color' => '#CA8A04'],
            'lait' => ['code' => 'LAI', 'color' => '#60A5FA'],
            'oeuf' => ['code' => 'OEU', 'color' => '#FDE047'],
            'fruits Coque' => ['code' => 'FDC', 'color' => '#92400E'],
            'poisson' => ['code' => 'POI', 'color' => '#0EA5E9'],
            'crustaces' => ['code' => 'CRU', 'color' => '#F97316'],
            'celeri' => ['code' => 'CEL', 'color' => '#4ADE80'],
            'moutarde' => ['code' => 'MOU', 'color' => '#EAB308'],
            'soja' => ['code' => 'SOJ', 'color' => '#A3E635'],
            'sulfites' => ['code' => 'SUL', 'color' => '#A855F7'],
        ];

        foreach ($allergens as $name => $data) {
            Allergen::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'code' => $data['code'], 'color' => $data['color']]
            );
        }
    }
}
