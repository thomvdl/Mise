<?php

namespace Database\Seeders;

use App\Models\IngredientCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class IngredientCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            'Céréales & farines' => '#D97706',
            'Produits laitiers' => '#38BDF8',
            'Œufs' => '#FACC15',
            'Fruits secs & oléagineux' => '#92400E',
            'Poissons & fruits de mer' => '#0EA5E9',
            'Viandes' => '#DC2626',
            'Légumes' => '#22C55E',
            'Fruits' => '#F43F5E',
            'Condiments & épices' => '#EA580C',
            'Boissons & vins' => '#7C3AED',
        ];

        foreach ($categories as $name => $color) {
            IngredientCategory::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'color' => $color]
            );
        }
    }
}
