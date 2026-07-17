<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Station;
use Illuminate\Support\Str;

class StationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $stations = [
            'Viande' => '#DC2626',
            'Poisson' => '#0EA5E9',
            'Froid' => '#06B6D4',
            'Dessert' => '#EC4899',
            'Brunch' => '#F59E0B',
        ];

        foreach ($stations as $name => $color) {
            Station::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'color' => $color]
            );
        }
    }
}
