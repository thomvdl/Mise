<?php

namespace App\Http\Controllers;

use App\Models\IngredientCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IngredientCategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return IngredientCategory::all();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:ingredient_categories,slug'],
            'color' => ['nullable', 'string', 'max:255'],
        ]);

        $ingredientCategory = IngredientCategory::create($validated);

        return response()->json($ingredientCategory, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(IngredientCategory $ingredientCategory)
    {
        return $ingredientCategory;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, IngredientCategory $ingredientCategory)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('ingredient_categories', 'slug')->ignore($ingredientCategory->id)],
            'color' => ['nullable', 'string', 'max:255'],
        ]);

        $ingredientCategory->update($validated);

        return $ingredientCategory;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(IngredientCategory $ingredientCategory)
    {
        $ingredientCategory->delete();

        return response()->noContent();
    }
}
