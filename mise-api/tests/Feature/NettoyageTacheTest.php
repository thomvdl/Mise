<?php

use App\Models\NettoyageTache;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function nettoyagePayload(array $overrides = []): array
{
    return [
        'zone' => 'Poste chaud',
        'name' => 'Plan de travail',
        'frequence' => 'apres_service',
        'produit' => 'Dégraissant désinfectant',
        'methode' => "Débarrasser, laver, rincer, désinfecter, laisser sécher.",
        ...$overrides,
    ];
}

it('permet à l\'admin de créer, modifier et supprimer une tâche', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

    $id = $this->postJson('/api/nettoyage-taches', nettoyagePayload())
        ->assertCreated()
        ->assertJsonPath('frequence', 'apres_service')
        ->json('id');

    $this->patchJson("/api/nettoyage-taches/{$id}", ['frequence' => 'hebdomadaire', 'moment' => 'Lundi'])
        ->assertOk()
        ->assertJsonPath('frequence', 'hebdomadaire')
        ->assertJsonPath('moment', 'Lundi')
        ->assertJsonPath('zone', 'Poste chaud');

    $this->deleteJson("/api/nettoyage-taches/{$id}")->assertNoContent();
    expect(NettoyageTache::count())->toBe(0);
});

it('refuse une fréquence inconnue et les champs requis manquants', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

    $this->postJson('/api/nettoyage-taches', ['frequence' => 'tous_les_ans'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['zone', 'name', 'frequence']);
});

it('laisse la brigade consulter le plan sans pouvoir le modifier', function () {
    $tache = NettoyageTache::create(nettoyagePayload());
    Sanctum::actingAs(User::factory()->create(['role' => 'user']));

    $this->getJson('/api/nettoyage-taches')->assertOk()->assertJsonCount(1);
    $this->getJson("/api/nettoyage-taches/{$tache->id}")->assertOk()->assertJsonPath('name', 'Plan de travail');
    $this->postJson('/api/nettoyage-taches', nettoyagePayload())->assertForbidden();
    $this->deleteJson("/api/nettoyage-taches/{$tache->id}")->assertForbidden();
});

it('remplit le plan de cuisine d\'hôtel sans doublon si on relance le seeder', function () {
    $this->seed(\Database\Seeders\PlanNettoyageHotelSeeder::class);
    $count = NettoyageTache::count();
    $this->seed(\Database\Seeders\PlanNettoyageHotelSeeder::class);

    expect($count)->toBeGreaterThan(40)
        ->and(NettoyageTache::count())->toBe($count)
        ->and(NettoyageTache::whereNotIn('frequence', [
            'apres_utilisation', 'apres_service', 'quotidien', 'hebdomadaire', 'mensuel', 'trimestriel', 'annuel',
        ])->count())->toBe(0);
});
