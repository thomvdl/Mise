<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Setting;
use App\Services\ZplLabelBuilder;
use App\Services\ZplPrinter;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EventController extends Controller
{
    /** Catégories d'événement proposées côté formulaire — pas de table dédiée, juste une chaîne validée. */
    private const TYPES = ['brunch', 'groupe', 'evenement', 'autre'];

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
        ]);

        $validated['end_date'] ??= $validated['start_date'];

        $event = Event::create($validated);

        return response()->json($event->load('menu:id,name'), 201);
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
        ]);

        $event->update($validated);

        return $event->load('menu:id,name');
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
     * Imprime une étiquette pour cet événement (nom, pax, date) sur la Zebra configurée — pas de
     * journal d'historique contrairement à PrintedLabelController::printZebra, ce n'est pas une
     * étiquette HACCP traçable, juste une aide en cuisine.
     */
    public function printLabel(Event $event)
    {
        $zpl = ZplLabelBuilder::buildEventLabel(
            $event->name,
            $event->couverts,
            $event->start_date->format('Y-m-d'),
            (int) Setting::get('printer_dpi', '203'),
            (float) Setting::get('label_width_mm', '57'),
            (float) Setting::get('label_height_mm', '32'),
            Setting::get('label_rotate_90', '0') === '1',
        );

        if ($error = ZplPrinter::send($zpl)) {
            return response()->json(['message' => $error], str_contains($error, 'configurée') ? 422 : 502);
        }

        return response()->json(['message' => "Étiquette envoyée à l'imprimante."]);
    }
}
