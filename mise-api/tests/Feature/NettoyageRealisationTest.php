<?php

use App\Models\NettoyageRealisation;
use App\Models\NettoyageTache;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->tache = NettoyageTache::create([
        'zone' => 'Viande', 'name' => 'Trancheuse', 'frequence' => 'apres_service',
    ]);
    $this->user = User::factory()->create(['role' => 'user', 'name' => 'Léa']);
    Sanctum::actingAs($this->user);
});

it('enregistre qui a fait la tâche, avec l\'heure du serveur', function () {
    Carbon::setTestNow('2026-11-08 14:32:00');

    $this->postJson('/api/nettoyage-realisations', [
        'nettoyage_tache_id' => $this->tache->id,
        // ignorés : la personne vient du token, l'heure du serveur
        'user_name' => 'Quelqu\'un d\'autre',
        'created_at' => '2020-01-01 00:00:00',
    ])
        ->assertCreated()
        ->assertJsonPath('user_name', 'Léa')
        ->assertJsonPath('zone', 'Viande')
        ->assertJsonPath('tache_name', 'Trancheuse');

    expect(NettoyageRealisation::first()->created_at->toDateTimeString())->toBe('2026-11-08 14:32:00');
});

it('renvoie la dernière réalisation avec chaque tâche du plan', function () {
    Carbon::setTestNow('2026-11-07 10:00:00');
    $this->postJson('/api/nettoyage-realisations', ['nettoyage_tache_id' => $this->tache->id]);
    Carbon::setTestNow('2026-11-08 15:00:00');
    $this->postJson('/api/nettoyage-realisations', ['nettoyage_tache_id' => $this->tache->id]);

    $this->getJson('/api/nettoyage-taches')
        ->assertOk()
        ->assertJsonPath('0.derniere_realisation.user_name', 'Léa')
        ->assertJsonPath('0.derniere_realisation.created_at', fn ($date) => str_starts_with($date, '2026-11-08'));
});

it('filtre le registre par tâche et par dates, du plus récent au plus ancien', function () {
    $autre = NettoyageTache::create(['zone' => 'Plonge', 'name' => 'Lave-vaisselle', 'frequence' => 'quotidien']);
    foreach (['2026-11-01 09:00:00', '2026-11-05 09:00:00', '2026-11-08 09:00:00'] as $date) {
        Carbon::setTestNow($date);
        $this->postJson('/api/nettoyage-realisations', ['nettoyage_tache_id' => $this->tache->id]);
    }
    $this->postJson('/api/nettoyage-realisations', ['nettoyage_tache_id' => $autre->id]);

    $this->getJson("/api/nettoyage-realisations?nettoyage_tache_id={$this->tache->id}&from=2026-11-02&to=2026-11-08")
        ->assertOk()
        ->assertJsonCount(2)
        ->assertJsonPath('0.created_at', fn ($date) => str_starts_with($date, '2026-11-08'));

    $this->getJson('/api/nettoyage-realisations?zone=Plonge')->assertJsonCount(1);
});

it('garde la preuve si la tâche est supprimée et ne permet ni modification ni suppression', function () {
    $id = $this->postJson('/api/nettoyage-realisations', ['nettoyage_tache_id' => $this->tache->id])->json('id');

    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    // Aucune route de modification/suppression n'existe, même pour un admin.
    $this->patchJson("/api/nettoyage-realisations/{$id}", ['user_name' => 'X'])->assertNotFound();
    $this->deleteJson("/api/nettoyage-realisations/{$id}")->assertNotFound();
    expect(NettoyageRealisation::find($id)->user_name)->toBe('Léa');

    $this->tache->delete();
    $this->getJson('/api/nettoyage-realisations')
        ->assertJsonCount(1)
        ->assertJsonPath('0.nettoyage_tache_id', null)
        ->assertJsonPath('0.tache_name', 'Trancheuse');
});
