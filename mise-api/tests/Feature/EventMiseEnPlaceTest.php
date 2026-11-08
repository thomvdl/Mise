<?php

use App\Models\Event;
use App\Models\FicheTechnique;
use App\Models\MiseEnPlaceItem;
use App\Models\Station;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $station = Station::create(['name' => 'Viande', 'slug' => 'viande', 'color' => '#ff0000']);
    $fiche = fn ($name) => FicheTechnique::create([
        'name' => $name, 'slug' => str($name)->slug(), 'station_id' => $station->id, 'servings' => 10, 'difficulty' => 2,
    ]);
    $this->boeuf = $fiche('Filet de bœuf');
    $this->poisson = $fiche('Dos de cabillaud');
    $this->sauce = $fiche('Sauce béarnaise');

    $this->event = Event::create(['name' => 'Mariage', 'start_date' => '2026-12-12', 'end_date' => '2026-12-12', 'couverts' => 40]);
    $plat = fn ($name, $pax, $fiches, $position) => tap(
        $this->event->plats()->create(['section' => 'Plat', 'name' => $name, 'pax' => $pax, 'position' => $position]),
        fn ($p) => $p->ficheTechniques()->sync(collect($fiches)->mapWithKeys(fn ($f, $i) => [$f->id => ['position' => $i + 1]])->all()),
    );
    $plat('Bœuf béarnaise', 25, [$this->boeuf, $this->sauce], 1);
    $plat('Poisson béarnaise', 15, [$this->poisson, $this->sauce], 2);
    $plat('Option sans fiche', 0, [], 3);

    Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
});

function generate($event, array $body = [])
{
    return test()->postJson("/api/events/{$event->id}/mise-en-place", ['urgency' => 'moyenne', 'deadline' => '2026-12-12 08:00', ...$body]);
}

it('crée une tâche par fiche avec le total des pax, rattachée à l\'événement', function () {
    generate($this->event)->assertOk()->assertExactJson(['created' => 3, 'updated' => 0, 'done' => 0]);

    $servings = MiseEnPlaceItem::pluck('servings', 'fiche_technique_id');
    expect($servings[$this->boeuf->id])->toBe(25)
        ->and($servings[$this->poisson->id])->toBe(15)
        ->and($servings[$this->sauce->id])->toBe(40)
        ->and(MiseEnPlaceItem::where('event_id', $this->event->id)->whereNull('station_id')->count())->toBe(3)
        ->and(MiseEnPlaceItem::first()->status)->toBe('todo');
});

it('met à jour sans doublon si on relance, et ne touche pas une tâche déjà faite', function () {
    generate($this->event);
    MiseEnPlaceItem::where('fiche_technique_id', $this->poisson->id)->update(['status' => 'done', 'servings' => 15]);
    $this->event->plats()->where('name', 'Bœuf béarnaise')->update(['pax' => 30]);

    generate($this->event, ['urgency' => 'urgente'])->assertExactJson(['created' => 0, 'updated' => 2, 'done' => 1]);

    expect(MiseEnPlaceItem::count())->toBe(3)
        ->and(MiseEnPlaceItem::where('fiche_technique_id', $this->boeuf->id)->value('servings'))->toBe(30)
        ->and(MiseEnPlaceItem::where('fiche_technique_id', $this->boeuf->id)->value('urgency'))->toBe('urgente')
        ->and(MiseEnPlaceItem::where('fiche_technique_id', $this->poisson->id)->value('status'))->toBe('done');
});

it('est réservé à l\'admin', function () {
    Sanctum::actingAs(User::factory()->create(['role' => 'user']));
    generate($this->event)->assertForbidden();
});

it('supprime les tâches de l\'événement avec lui au lieu d\'échouer', function () {
    generate($this->event);

    $this->deleteJson("/api/events/{$this->event->id}")->assertNoContent();

    expect(MiseEnPlaceItem::count())->toBe(0);
});
