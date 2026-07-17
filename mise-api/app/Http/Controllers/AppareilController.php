<?php

namespace App\Http\Controllers;

use App\Models\Appareil;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppareilController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Appareil::orderBy('name')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'abbreviation' => ['required', 'string', 'max:10'],
            'fonction' => ['required', 'string', 'max:255'],
            'temperature_min' => ['nullable', 'numeric'],
            'temperature_max' => ['nullable', 'numeric', Rule::when($request->filled('temperature_min'), ['gte:temperature_min'])],
        ]);

        $appareil = Appareil::create($validated);

        return response()->json($appareil, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Appareil $appareil)
    {
        return $appareil;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Appareil $appareil)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'abbreviation' => ['sometimes', 'required', 'string', 'max:10'],
            'fonction' => ['sometimes', 'required', 'string', 'max:255'],
            'temperature_min' => ['nullable', 'numeric'],
            'temperature_max' => ['nullable', 'numeric', Rule::when($request->filled('temperature_min'), ['gte:temperature_min'])],
        ]);

        $appareil->update($validated);

        return $appareil;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Appareil $appareil)
    {
        $appareil->delete();

        return response()->noContent();
    }
}
