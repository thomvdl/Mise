<?php

namespace App\Http\Controllers;

use App\Models\FicheTechnique;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FicheTechniqueController extends Controller
{
    private const RELATIONS = ['category', 'station', 'ingredients', 'steps', 'pictures', 'components'];

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return FicheTechnique::with(self::RELATIONS)->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $ficheTechnique = FicheTechnique::create(
            collect($validated)->except(['ingredients', 'steps', 'components'])->all()
        )->refresh();

        $this->syncIngredients($ficheTechnique, $validated['ingredients'] ?? []);
        $this->replaceSteps($ficheTechnique, $validated['steps'] ?? []);
        $this->syncComponents($ficheTechnique, $validated['components'] ?? []);

        return response()->json($ficheTechnique->load(self::RELATIONS), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(FicheTechnique $ficheTechnique)
    {
        return $ficheTechnique->load(self::RELATIONS);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, FicheTechnique $ficheTechnique)
    {
        $validated = $request->validate($this->rules($ficheTechnique, forUpdate: true));

        if (array_key_exists('components', $validated)) {
            $this->guardAgainstInvalidComponents($ficheTechnique, $validated['components']);
        }

        $ficheTechnique->update(
            collect($validated)->except(['ingredients', 'steps', 'components'])->all()
        );

        if (array_key_exists('ingredients', $validated)) {
            $this->syncIngredients($ficheTechnique, $validated['ingredients']);
        }

        if (array_key_exists('steps', $validated)) {
            $this->replaceSteps($ficheTechnique, $validated['steps']);
        }

        if (array_key_exists('components', $validated)) {
            $this->syncComponents($ficheTechnique, $validated['components']);
        }

        return $ficheTechnique->load(self::RELATIONS);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FicheTechnique $ficheTechnique)
    {
        // Pictures are owned by the shared photo library, not by the fiche technique itself —
        // deleting the fiche only unlinks them so they stay available for reuse.
        $ficheTechnique->pictures()->update(['pictureable_id' => null, 'pictureable_type' => null]);
        $ficheTechnique->steps()->delete();
        $ficheTechnique->delete();

        return response()->noContent();
    }

    private function rules(?FicheTechnique $ficheTechnique = null, bool $forUpdate = false): array
    {
        $required = $forUpdate ? ['sometimes', 'required'] : ['required'];

        return [
            'name' => [...$required, 'string', 'max:255'],
            'slug' => [...$required, 'string', 'max:255', Rule::unique('fiche_techniques', 'slug')->ignore($ficheTechnique?->id)],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'station_id' => ['nullable', 'integer', 'exists:stations,id'],
            'servings' => ['sometimes', 'integer', 'min:1'],
            'difficulty' => [...$required, 'integer', 'between:1,3'],
            'description' => ['nullable', 'string'],
            'equipment' => ['sometimes', 'array'],
            'equipment.*' => ['string', 'max:255'],
            'mise_en_place' => ['nullable', 'string'],
            'plating' => ['nullable', 'string'],
            'chef_tip' => ['nullable', 'string'],
            'haccp' => ['nullable', 'string'],
            'conservation' => ['nullable', 'string'],
            'ingredients' => ['sometimes', 'array'],
            'ingredients.*.ingredient_id' => ['required_with:ingredients', 'integer', 'exists:ingredients,id'],
            'ingredients.*.quantity' => ['required_with:ingredients', 'numeric', 'min:0'],
            'ingredients.*.group_label' => ['nullable', 'string', 'max:255'],
            'steps' => ['sometimes', 'array'],
            'steps.*.instruction' => ['required_with:steps', 'string'],
            'steps.*.timer_minutes' => ['nullable', 'integer', 'min:0'],
            'components' => ['sometimes', 'array'],
            'components.*.component_fiche_technique_id' => ['required_with:components', 'integer', 'exists:fiche_techniques,id'],
            'components.*.quantity' => ['required_with:components', 'numeric', 'min:0.001'],
            'components.*.group_label' => ['nullable', 'string', 'max:255'],
        ];
    }

    private function syncIngredients(FicheTechnique $ficheTechnique, array $ingredients): void
    {
        $pivotData = collect($ingredients)->mapWithKeys(fn (array $item) => [
            $item['ingredient_id'] => ['quantity' => $item['quantity'], 'group_label' => $item['group_label'] ?? null],
        ])->all();

        $ficheTechnique->ingredients()->sync($pivotData);
    }

    private function replaceSteps(FicheTechnique $ficheTechnique, array $steps): void
    {
        $ficheTechnique->steps()->delete();

        foreach ($steps as $index => $step) {
            $ficheTechnique->steps()->create([
                'position' => $index + 1,
                'instruction' => $step['instruction'],
                'timer_minutes' => $step['timer_minutes'] ?? null,
            ]);
        }
    }

    private function syncComponents(FicheTechnique $ficheTechnique, array $components): void
    {
        $pivotData = collect($components)->mapWithKeys(fn (array $item) => [
            $item['component_fiche_technique_id'] => [
                'quantity' => $item['quantity'],
                'group_label' => $item['group_label'] ?? null,
            ],
        ])->all();

        $ficheTechnique->components()->sync($pivotData);
    }

    /**
     * Rejects a fiche referencing itself, directly or through a chain of components, as one of its
     * own components — the pivot has no way to express or safely resolve a cyclic composition.
     */
    private function guardAgainstInvalidComponents(FicheTechnique $ficheTechnique, array $components): void
    {
        foreach ($components as $component) {
            $componentId = $component['component_fiche_technique_id'];

            if ($componentId === $ficheTechnique->id) {
                throw ValidationException::withMessages([
                    'components' => ["Une fiche technique ne peut pas s'utiliser elle-même comme composant."],
                ]);
            }

            if ($this->isReachable($componentId, $ficheTechnique->id)) {
                throw ValidationException::withMessages([
                    'components' => ['Ce composant créerait une référence circulaire entre fiches techniques.'],
                ]);
            }
        }
    }

    /** Breadth-first search over the fiche_technique_component graph, from $fromId towards $targetId. */
    private function isReachable(int $fromId, int $targetId): bool
    {
        $visited = [];
        $queue = [$fromId];

        while ($queue) {
            $currentId = array_shift($queue);

            if ($currentId === $targetId) {
                return true;
            }

            if (isset($visited[$currentId])) {
                continue;
            }

            $visited[$currentId] = true;

            $childIds = DB::table('fiche_technique_component')
                ->where('parent_fiche_technique_id', $currentId)
                ->pluck('component_fiche_technique_id');

            foreach ($childIds as $childId) {
                $queue[] = $childId;
            }
        }

        return false;
    }
}
