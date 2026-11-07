<?php

use App\Models\FicheTechnique;
use App\Models\Station;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->station = Station::create(['name' => 'Chaud', 'slug' => 'chaud', 'color' => '#ff0000']);
    $this->fiche = FicheTechnique::create([
        'name' => 'Sauce béarnaise', 'slug' => 'sauce-bearnaise', 'station_id' => $this->station->id,
        'servings' => 10, 'difficulty' => 2,
    ]);
    Sanctum::actingAs(User::factory()->create(['role' => 'user']));
});

it('crée une tâche liée à une fiche technique avec les portions à prévoir', function () {
    $this->postJson('/api/mise-en-place-items', [
        'name' => 'Sauce béarnaise',
        'station_id' => $this->station->id,
        'fiche_technique_id' => $this->fiche->id,
        'servings' => 40,
        'urgency' => 'moyenne',
    ])
        ->assertCreated()
        ->assertJsonPath('servings', 40)
        ->assertJsonPath('fiche_technique.id', $this->fiche->id)
        ->assertJsonPath('fiche_technique.name', 'Sauce béarnaise')
        ->assertJsonPath('fiche_technique.servings', 10);
});

it('exige les portions quand une fiche est choisie', function () {
    $this->postJson('/api/mise-en-place-items', [
        'name' => 'Sauce béarnaise',
        'station_id' => $this->station->id,
        'fiche_technique_id' => $this->fiche->id,
        'urgency' => 'moyenne',
    ])->assertUnprocessable()->assertJsonValidationErrors('servings');
});

it('accepte toujours une tâche libre sans fiche', function () {
    $this->postJson('/api/mise-en-place-items', [
        'name' => 'Éplucher les oignons',
        'station_id' => $this->station->id,
        'urgency' => 'faible',
    ])
        ->assertCreated()
        ->assertJsonPath('fiche_technique', null)
        ->assertJsonPath('servings', null);
});

it('garde la tâche si la fiche est supprimée', function () {
    $id = $this->postJson('/api/mise-en-place-items', [
        'name' => 'Sauce béarnaise',
        'station_id' => $this->station->id,
        'fiche_technique_id' => $this->fiche->id,
        'servings' => 40,
        'urgency' => 'moyenne',
    ])->json('id');

    $this->fiche->delete();

    $this->getJson('/api/mise-en-place-items')
        ->assertOk()
        ->assertJsonPath('0.id', $id)
        ->assertJsonPath('0.fiche_technique', null);
});
