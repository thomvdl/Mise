<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            CategorySeeder::class,
            StationSeeder::class,
            AllergenSeeder::class,
            IngredientCategorySeeder::class,
            IngredientSeeder::class,
            ChannelSeeder::class,
            ExampleDataSeeder::class,
        ]);
    }
}
