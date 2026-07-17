<?php

namespace Database\Factories;

use App\Models\FicheTechnique;
use App\Models\Step;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Step>
 */
class StepFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'fiche_technique_id' => FicheTechnique::factory(),
            'position' => 1,
            'instruction' => fake()->sentence(),
            'timer_minutes' => fake()->optional(0.5)->numberBetween(1, 60),
        ];
    }
}
