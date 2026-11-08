<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventPlat;
use App\Models\Printer;
use App\Services\ZplLabelBuilder;
use App\Services\ZplPrinter;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EventController extends Controller
{
    /** Catégories d'événement proposées côté formulaire — pas de table dédiée, juste une chaîne validée. */
    private const TYPES = ['brunch', 'groupe', 'evenement', 'autre'];

    private const RELATIONS = ['menu:id,name', 'plats.ficheTechniques'];

    /**
     * Display a listing of the resource.
     *
     * Filtrable par mois/année (utilisé par la vue calendrier) — renvoie tout événement dont
     * la plage [start_date, end_date] chevauche le mois demandé, y compris ceux qui débordent
     * sur le mois précédent/suivant. Sans filtre, renvoie tous les événements.
     */
    public function index(Request $request)
    {
        $query = Event::query()->with('menu:id,name')->orderBy('start_date');

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
            ...$this->platRules(),
        ]);

        $validated['end_date'] ??= $validated['start_date'];

        $event = Event::create(collect($validated)->except('plats')->all());

        $this->replacePlats($event, $validated['plats'] ?? []);

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
            ...$this->platRules(),
        ]);

        $event->update(collect($validated)->except('plats')->all());

        if (array_key_exists('plats', $validated)) {
            $this->replacePlats($event, $validated['plats']);
        }

        return $event->load(self::RELATIONS);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Event $event)
    {
        $event->delete();

        return response()->noContent();
    }

    /**
     * Plats prévus, chacun avec son nombre de pax — `section` est un libellé libre (Entrée, Plat,
     * Dessert…), comme le nom d'une section de menu.
     */
    private function platRules(): array
    {
        return [
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
