<?php

namespace App\Http\Controllers;

use App\Models\Ingredient;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IngredientController extends Controller
{
    private const RELATIONS = ['category', 'allergens', 'pictures'];

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Ingredient::with(self::RELATIONS)->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:ingredients,slug'],
            'unit' => ['required', 'string', 'max:50'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'ingredient_category_id' => ['nullable', 'integer', 'exists:ingredient_categories,id'],
            'allergen_ids' => ['sometimes', 'array'],
            'allergen_ids.*' => ['integer', 'exists:allergens,id'],
            'pictures' => ['sometimes', 'array'],
            'pictures.*' => ['url'],
        ]);

        $ingredient = Ingredient::create(collect($validated)->except(['allergen_ids', 'pictures'])->all());

        $ingredient->allergens()->sync($validated['allergen_ids'] ?? []);

        foreach ($validated['pictures'] ?? [] as $url) {
            $ingredient->pictures()->create(['url' => $url]);
        }

        return response()->json($ingredient->load(self::RELATIONS), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Ingredient $ingredient)
    {
        return $ingredient->load(self::RELATIONS);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Ingredient $ingredient)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('ingredients', 'slug')->ignore($ingredient->id)],
            'unit' => ['sometimes', 'required', 'string', 'max:50'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'ingredient_category_id' => ['nullable', 'integer', 'exists:ingredient_categories,id'],
            'allergen_ids' => ['sometimes', 'array'],
            'allergen_ids.*' => ['integer', 'exists:allergens,id'],
            'pictures' => ['sometimes', 'array'],
            'pictures.*' => ['url'],
        ]);

        $ingredient->update(collect($validated)->except(['allergen_ids', 'pictures'])->all());

        if (array_key_exists('allergen_ids', $validated)) {
            $ingredient->allergens()->sync($validated['allergen_ids']);
        }

        if (array_key_exists('pictures', $validated)) {
            $ingredient->pictures()->delete();

            foreach ($validated['pictures'] as $url) {
                $ingredient->pictures()->create(['url' => $url]);
            }
        }

        return $ingredient->load(self::RELATIONS);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Ingredient $ingredient)
    {
        $ingredient->pictures()->delete();
        $ingredient->delete();

        return response()->noContent();
    }
}
