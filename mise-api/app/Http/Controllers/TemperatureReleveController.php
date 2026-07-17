<?php

namespace App\Http\Controllers;

use App\Models\TemperatureReleve;
use Illuminate\Http\Request;

class TemperatureReleveController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * Filtrable par appareil_id et par plage de dates (from/to), utilisé pour
     * les courbes de température et les rapports imprimables du dashboard.
     */
    public function index(Request $request)
    {
        $query = TemperatureReleve::query()->with('appareil')->orderBy('recorded_at');

        if ($request->filled('appareil_id')) {
            $query->where('appareil_id', $request->integer('appareil_id'));
        }

        if ($request->filled('from')) {
            $query->where('recorded_at', '>=', $request->date('from'));
        }

        if ($request->filled('to')) {
            $query->where('recorded_at', '<=', $request->date('to')->endOfDay());
        }

        return $query->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'appareil_id' => ['required', 'exists:appareils,id'],
            'temperature' => ['required', 'numeric', 'between:-99.9,999.9'],
            'recorded_at' => ['nullable', 'date'],
        ]);

        $validated['recorded_at'] ??= now();

        $releve = TemperatureReleve::create($validated);

        return response()->json($releve->load('appareil'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(TemperatureReleve $temperatureReleve)
    {
        return $temperatureReleve->load('appareil');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, TemperatureReleve $temperatureReleve)
    {
        $validated = $request->validate([
            'appareil_id' => ['sometimes', 'required', 'exists:appareils,id'],
            'temperature' => ['sometimes', 'required', 'numeric', 'between:-99.9,999.9'],
            'recorded_at' => ['sometimes', 'required', 'date'],
        ]);

        $temperatureReleve->update($validated);

        return $temperatureReleve->load('appareil');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TemperatureReleve $temperatureReleve)
    {
        $temperatureReleve->delete();

        return response()->noContent();
    }
}
