<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventPlat;
use App\Models\MiseEnPlaceItem;
use App\Models\Printer;
use App\Services\ZplLabelBuilder;
use App\Services\ZplPrinter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EventController extends Controller
{
    /** Catégories d'événement proposées côté formulaire — pas de table dédiée, juste une chaîne validée. */
    private const TYPES = ['brunch', 'groupe', 'evenement', 'autre'];

    private const RELATIONS = ['menu:id,name', 'allergens', 'plats.ficheTechniques'];

    /**
     * Display a listing of the resource.
     *
     * Filtrable par mois/année (utilisé par la vue calendrier) — renvoie tout événement dont
     * la plage [start_date, end_date] chevauche le mois demandé, y compris ceux qui débordent
     * sur le mois précédent/suivant. Sans filtre, renvoie tous les événements.
     */
    public function index(Request $request)
    {
        $query = Event::query()->with(['menu:id,name', 'allergens'])->orderBy('start_date');

        if ($request->filled('month') && $request->filled('year')) {
            $monthStart = sprintf('%04d-%02d-01', $request->integer('year'), $request->integer('month'));
            $monthEnd = date('Y-m-t', strtotime($monthStart));

            $query->where('start_date', '<=', $monthEnd)->where('end_date', '>=', $monthStart);
        }

        return $query->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'detail' => ['nullable', 'string'],
            'horaire' => ['nullable', 'string'],
            'couverts' => ['nullable', 'integer', 'min:0'],
            'type' => ['nullable', 'string', Rule::in(self::TYPES)],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'menu_id' => ['nullable', Rule::exists('menus', 'id')],
            ...$this->compositionRules(),
        ]);

        $validated['end_date'] ??= $validated['start_date'];

        $event = Event::create(collect($validated)->except(['plats', 'allergen_ids'])->all());

        $this->replacePlats($event, $validated['plats'] ?? []);
        $event->allergens()->sync($validated['allergen_ids'] ?? []);

        return response()->json($event->load(self::RELATIONS), 201);
    }

    /**
     * Display the specified resource — avec les plats prévus et leurs fiches techniques (page
     * d'édition d'un événement), contrairement à `index` qui reste léger pour le calendrier.
     */
    public function show(Event $event)
    {
        return $event->load(self::RELATIONS);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Event $event)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'detail' => ['sometimes', 'nullable', 'string'],
            'horaire' => ['sometimes', 'nullable', 'string'],
            'couverts' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'type' => ['sometimes', 'nullable', 'string', Rule::in(self::TYPES)],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
            'menu_id' => ['sometimes', 'nullable', Rule::exists('menus', 'id')],
            ...$this->compositionRules(),
        ]);

        $event->update(collect($validated)->except(['plats', 'allergen_ids'])->all());

        if (array_key_exists('plats', $validated)) {
            $this->replacePlats($event, $validated['plats']);
        }

        if (array_key_exists('allergen_ids', $validated)) {
            $event->allergens()->sync($validated['allergen_ids']);
        }

        return $event->load(self::RELATIONS);
    }

    /**
     * Remove the specified resource from storage.
     *
     * Les tâches de mise en place rattachées à l'événement partent avec lui : la clé étrangère est
     * en `restrictOnDelete`, la suppression échouerait sinon — et une prépa pour un événement
     * annulé n'a plus de raison d'être.
     */
    public function destroy(Event $event)
    {
        DB::transaction(function () use ($event) {
            $event->miseEnPlaceItems()->delete();
            $event->delete();
        });

        return response()->noContent();
    }

    /**
     * Crée les tâches de mise en place de l'événement à partir de ses plats : une tâche par fiche
     * technique, rattachée à l'événement (son poste reste celui de la fiche), avec le total des
     * pax des plats qui l'utilisent (une sauce servie avec deux plats = une seule tâche).
     *
     * Relançable sans doublon après un changement de répartition : une tâche encore à faire pour
     * la même fiche voit ses portions, son échéance et son urgence mises à jour ; une tâche déjà
     * faite n'est pas touchée ; une fiche retirée de l'événement garde sa tâche (à supprimer à la
     * main si besoin). Les sous-recettes ne génèrent pas de tâche : elles sont déjà comptées dans
     * la liste de marchandise de leur fiche parente.
     */
    public function generateMiseEnPlace(Request $request, Event $event)
    {
        $validated = $request->validate([
            'deadline' => ['nullable', 'date'],
            'urgency' => ['required', Rule::in(['faible', 'moyenne', 'urgente'])],
        ]);

        $servingsByFiche = [];
        $names = [];
        foreach ($event->plats()->with('ficheTechniques:id,name')->get() as $plat) {
            if ($plat->pax <= 0) {
                continue;
            }
            foreach ($plat->ficheTechniques as $fiche) {
                $servingsByFiche[$fiche->id] = ($servingsByFiche[$fiche->id] ?? 0) + $plat->pax;
                $names[$fiche->id] = $fiche->name;
            }
        }

        $summary = ['created' => 0, 'updated' => 0, 'done' => 0];

        DB::transaction(function () use ($event, $request, $validated, $servingsByFiche, $names, &$summary) {
            foreach ($servingsByFiche as $ficheId => $servings) {
                $existing = $event->miseEnPlaceItems()->where('fiche_technique_id', $ficheId)->get();

                if ($existing->contains('status', 'done') && ! $existing->contains('status', 'todo')) {
                    $summary['done']++;

                    continue;
                }

                $fields = [
                    'servings' => min($servings, 1000),
                    'deadline' => $validated['deadline'] ?? null,
                    'urgency' => $validated['urgency'],
                ];

                if ($todo = $existing->firstWhere('status', 'todo')) {
                    $todo->update($fields);
                    $summary['updated']++;
                } else {
                    MiseEnPlaceItem::create([
                        ...$fields,
                        'name' => $names[$ficheId],
                        'event_id' => $event->id,
                        'fiche_technique_id' => $ficheId,
                        'user_id' => $request->user()->id,
                        'status' => 'todo',
                    ]);
                    $summary['created']++;
                }
            }
        });

        return response()->json($summary);
    }

    /**
     * Ce qu'on sert et à qui, communs à store/update : plats prévus avec leur nombre de pax
     * (`section` est un libellé libre — Entrée, Plat, Dessert…) et allergies du groupe.
     */
    private function compositionRules(): array
    {
        return [
            'allergies_note' => ['sometimes', 'nullable', 'string'],
            'allergen_ids' => ['sometimes', 'array'],
            'allergen_ids.*' => ['integer', 'exists:allergens,id'],

            'plats' => ['sometimes', 'array'],
            'plats.*.section' => ['required', 'string', 'max:100'],
            'plats.*.name' => ['required', 'string', 'max:255'],
            'plats.*.pax' => ['required', 'integer', 'min:0'],
            'plats.*.fiche_technique_ids' => ['sometimes', 'array'],
            'plats.*.fiche_technique_ids.*' => ['integer', 'exists:fiche_techniques,id'],
        ];
    }

    /** Même principe que MenuController::replaceSections : on remplace toute la liste. */
    private function replacePlats(Event $event, array $plats): void
    {
        $event->plats()->delete();

        foreach ($plats as $index => $platData) {
            /** @var EventPlat $plat */
            $plat = $event->plats()->create([
                'section' => $platData['section'],
                'name' => $platData['name'],
                'pax' => $platData['pax'],
                'position' => $index + 1,
            ]);

            $ficheIds = collect($platData['fiche_technique_ids'] ?? [])->unique()->values();
            $plat->ficheTechniques()->sync(
                $ficheIds->mapWithKeys(fn ($id, $i) => [$id => ['position' => $i + 1]])->all(),
            );
        }
    }

    /**
     * Imprime une étiquette pour cet événement (nom, pax, date) sur la Zebra configurée — pas de
     * journal d'historique contrairement à PrintedLabelController::printZebra, ce n'est pas une
     * étiquette HACCP traçable, juste une aide en cuisine.
     */
    public function printLabel(Request $request, Event $event)
    {
        $printer = Printer::resolve($request->integer('printer_id') ?: null);

        $zpl = ZplLabelBuilder::buildEventLabel(
            $event->name,
            $event->couverts,
            $event->start_date->format('Y-m-d'),
            $printer->dpi ?? 203,
            $printer->label_width_mm ?? 57,
            $printer->label_height_mm ?? 32,
            $printer->rotate_90 ?? false,
            $printer->top_offset_mm ?? 0,
        );

        if ($error = ZplPrinter::send($zpl, $printer)) {
            return response()->json(['message' => $error], str_contains($error, 'configurée') ? 422 : 502);
        }

        return response()->json(['message' => "Étiquette envoyée à l'imprimante."]);
    }
}
