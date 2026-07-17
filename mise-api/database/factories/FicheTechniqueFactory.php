<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\FicheTechnique;
use App\Models\Ingredient;
use App\Models\Station;
use App\Models\Step;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\Sequence;
use Illuminate\Support\Str;

/**
 * @extends Factory<FicheTechnique>
 */
class FicheTechniqueFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = ucfirst(fake()->unique()->words(3, true));

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'category_id' => Category::inRandomOrder()->value('id'),
            'station_id' => Station::inRandomOrder()->value('id'),
            'servings' => fake()->numberBetween(2, 20),
            'difficulty' => fake()->numberBetween(1, 3),
            'description' => fake()->optional()->paragraph(),
        ];
    }

    /**
     * Configure the model factory.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (FicheTechnique $ficheTechnique) {
            $ingredientIds = Ingredient::inRandomOrder()
                ->limit(fake()->numberBetween(3, 6))
                ->pluck('id');

            $ficheTechnique->ingredients()->attach(
                $ingredientIds->mapWithKeys(fn (int $id) => [
                    $id => ['quantity' => fake()->randomFloat(2, 10, 500)],
                ])
            );

            Step::factory()
                ->count(fake()->numberBetween(3, 6))
                ->sequence(fn (Sequence $sequence) => ['position' => $sequence->index + 1])
                ->for($ficheTechnique)
                ->create();
        });
    }
}
