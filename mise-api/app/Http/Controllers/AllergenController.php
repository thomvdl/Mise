<?php

namespace App\Http\Controllers;

use App\Models\Allergen;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AllergenController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Allergen::all();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:allergens,name'],
            'slug' => ['required', 'string', 'max:255', 'unique:allergens,slug'],
            'code' => ['required', 'string', 'max:255', 'unique:allergens,code'],
            'color' => ['nullable', 'string', 'max:255'],
        ]);

        $allergen = Allergen::create($validated);

        return response()->json($allergen, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Allergen $allergen)
    {
        return $allergen;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Allergen $allergen)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('allergens', 'name')->ignore($allergen->id)],
            'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('allergens', 'slug')->ignore($allergen->id)],
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('allergens', 'code')->ignore($allergen->id)],
            'color' => ['nullable', 'string', 'max:255'],
        ]);

        $allergen->update($validated);

        return $allergen;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Allergen $allergen)
    {
        $allergen->delete();

        return response()->noContent();
    }
}
