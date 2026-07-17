<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Category;
use Illuminate\Support\Str; 


class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            'Amuse-bouche' => '#F97316',
            'Entrées' => '#84CC16',
            'Poissons' => '#0EA5E9',
            'Viandes' => '#EF4444',
            'Desserts' => '#EC4899',
            'Soupes' => '#F59E0B',
            'Salades' => '#22C55E',
            'Pâtes' => '#EAB308',
            'Riz' => '#14B8A6',
            'Légumes' => '#10B981',
            'Fromages' => '#D97706',
            'Sauces' => '#F43F5E',
            'Boissons' => '#3B82F6',
            'Cocktails' => '#D946EF',
            'Petit-déjeuner' => '#8B5CF6',
            'Brunch' => '#06B6D4',
        ];

        foreach ($categories as $name => $color) {
            Category::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'color' => $color]
            );
        }
    }
}
