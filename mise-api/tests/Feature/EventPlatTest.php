<?php

use App\Models\Event;
use App\Models\FicheTechnique;
use App\Models\Station;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $station = Station::create(['name' => 'Chaud', 'slug' => 'chaud', 'color' => '#ff0000']);
    $this->boeuf = FicheTechnique::create([
        'name' => 'Filet de bœuf', 'slug' => 'filet-de-boeuf', 'station_id' => $station->id,
        'servings' => 10, 'difficulty' => 2,
    ]);
    $this->sauce = FicheTechnique::create([
        'name' => 'Sauce béarnaise', 'slug' => 'sauce-bearnaise', 'station_id' => $station->id,
        'servings' => 10, 'difficulty' => 2,
    ]);
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
});

function eventPayload(array $plats): array
{
    return [
        'name' => 'Mariage Dupont',
        'start_date' => '2026-12-12',
        'couverts' => 40,
        'plats' => $plats,
    ];
}

it('crée un événement avec ses plats et leur nombre de pax', function () {
    $id = $this->postJson('/api/events', eventPayload([
        ['section' => 'Plat', 'name' => 'Bœuf béarnaise', 'pax' => 25, 'fiche_technique_ids' => [$this->boeuf->id, $this->sauce->id]],
        ['section' => 'Plat', 'name' => 'Poisson du jour', 'pax' => 15],
    ]))
        ->assertCreated()
        ->assertJsonCount(2, 'plats')
        ->json('id');

    $this->getJson("/api/events/{$id}")
        ->assertOk()
        ->assertJsonPath('plats.0.name', 'Bœuf béarnaise')
        ->assertJsonPath('plats.0.pax', 25)
        ->assertJsonPath('plats.0.fiche_techniques.0.id', $this->boeuf->id)
        ->assertJsonPath('plats.0.fiche_techniques.1.id', $this->sauce->id)
        ->assertJsonPath('plats.1.pax', 15)
        ->assertJsonCount(0, 'plats.1.fiche_techniques');
});

it('remplace les plats à la modification et les garde si non envoyés', function () {
    $event = Event::create(['name' => 'Groupe', 'start_date' => '2026-12-12', 'end_date' => '2026-12-12']);
    $event->plats()->create(['section' => 'Entrée', 'name' => 'Velouté', 'pax' => 10, 'position' => 1]);

    $this->patchJson("/api/events/{$event->id}", ['couverts' => 12])->assertOk()->assertJsonCount(1, 'plats');

    $this->patchJson("/api/events/{$event->id}", ['plats' => [
        ['section' => 'Dessert', 'name' => 'Tarte', 'pax' => 12],
    ]])
        ->assertOk()
        ->assertJsonCount(1, 'plats')
        ->assertJsonPath('plats.0.section', 'Dessert');
});

it('refuse un nombre de pax manquant ou négatif', function () {
    $this->postJson('/api/events', eventPayload([
        ['section' => 'Plat', 'name' => 'Bœuf', 'pax' => -1],
        ['section' => 'Plat', 'name' => 'Poisson'],
    ]))->assertUnprocessable()->assertJsonValidationErrors(['plats.0.pax', 'plats.1.pax']);
});

it('supprime les plats avec l\'événement', function () {
    $id = $this->postJson('/api/events', eventPayload([
        ['section' => 'Plat', 'name' => 'Bœuf', 'pax' => 40, 'fiche_technique_ids' => [$this->boeuf->id]],
    ]))->json('id');

    $this->deleteJson("/api/events/{$id}")->assertNoContent();

    expect(\App\Models\EventPlat::count())->toBe(0);
});

it('enregistre les allergies du groupe et les renvoie avec l\'événement', function () {
    $gluten = \App\Models\Allergen::create(['name' => 'Gluten', 'slug' => 'gluten', 'code' => 'GLU']);
    $lait = \App\Models\Allergen::create(['name' => 'Lait', 'slug' => 'lait', 'code' => 'LAI']);

    $id = $this->postJson('/api/events', [
        ...eventPayload([]),
        'allergen_ids' => [$gluten->id, $lait->id],
        'allergies_note' => '2 sans gluten (table 4), 1 végétarien',
    ])->assertCreated()->assertJsonCount(2, 'allergens')->json('id');

    $this->getJson("/api/events/{$id}")
        ->assertJsonPath('allergies_note', '2 sans gluten (table 4), 1 végétarien')
        ->assertJsonCount(2, 'allergens');

    // Non envoyés : inchangés ; envoyés vides : retirés.
    $this->patchJson("/api/events/{$id}", ['couverts' => 30])->assertJsonCount(2, 'allergens');
    $this->patchJson("/api/events/{$id}", ['allergen_ids' => []])->assertJsonCount(0, 'allergens');

    $this->getJson('/api/events')->assertOk()->assertJsonPath('0.allergens', []);
});
