<?php

namespace App\Http\Controllers;

use App\Models\Station;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Station::all();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:stations,slug'],
            'color' => ['nullable', 'string', 'max:255'],
        ]);

        $station = Station::create($validated);

        return response()->json($station, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Station $station)
    {
        return $station;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Station $station)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('stations', 'slug')->ignore($station->id)],
            'color' => ['nullable', 'string', 'max:255'],
        ]);

        $station->update($validated);

        return $station;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Station $station)
    {
        $station->delete();

        return response()->noContent();
    }
}
