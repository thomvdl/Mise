<?php

namespace App\Http\Controllers;

use App\Models\Menu;
use App\Models\MenuSection;
use App\Models\Plat;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MenuController extends Controller
{
    private const RELATIONS = ['sections.plats.ficheTechniques'];

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Menu::with(self::RELATIONS)->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $menu = Menu::create(collect($validated)->except('sections')->all())->refresh();

        $this->replaceSections($menu, $validated['sections'] ?? []);

        return response()->json($menu->load(self::RELATIONS), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Menu $menu)
    {
        return $menu->load(self::RELATIONS);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Menu $menu)
    {
        $validated = $request->validate($this->rules($menu, forUpdate: true));

        $menu->update(collect($validated)->except('sections')->all());

        if (array_key_exists('sections', $validated)) {
            $this->replaceSections($menu, $validated['sections']);
        }

        return $menu->load(self::RELATIONS);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Menu $menu)
    {
        $this->deleteSections($menu);
        $menu->delete();

        return response()->noContent();
    }

    private function rules(?Menu $menu = null, bool $forUpdate = false): array
    {
        $required = $forUpdate ? ['sometimes', 'required'] : ['required'];

        return [
            'name' => [...$required, 'string', 'max:255'],
            'slug' => [...$required, 'string', 'max:255', Rule::unique('menus', 'slug')->ignore($menu?->id)],
            'description' => ['nullable', 'string'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'sections' => ['sometimes', 'array'],
            'sections.*.name' => ['required_with:sections', 'string', 'max:255'],
            'sections.*.plats' => ['sometimes', 'array'],
            'sections.*.plats.*.name' => ['required_with:sections', 'string', 'max:255'],
            'sections.*.plats.*.description' => ['nullable', 'string'],
            'sections.*.plats.*.fiche_technique_ids' => ['sometimes', 'array'],
            'sections.*.plats.*.fiche_technique_ids.*' => ['integer', 'exists:fiche_techniques,id'],
        ];
    }

    private function deleteSections(Menu $menu): void
    {
        foreach ($menu->sections as $section) {
            foreach ($section->plats as $plat) {
                $plat->ficheTechniques()->detach();
            }
            $section->plats()->delete();
        }
        $menu->sections()->delete();
    }

    private function replaceSections(Menu $menu, array $sections): void
    {
        $this->deleteSections($menu);

        foreach ($sections as $sectionIndex => $sectionData) {
            /** @var MenuSection $section */
            $section = $menu->sections()->create([
                'name' => $sectionData['name'],
                'position' => $sectionIndex + 1,
            ]);

            foreach ($sectionData['plats'] ?? [] as $platIndex => $platData) {
                /** @var Plat $plat */
                $plat = $section->plats()->create([
                    'name' => $platData['name'],
                    'description' => $platData['description'] ?? null,
                    'position' => $platIndex + 1,
                ]);

                $ficheIds = collect($platData['fiche_technique_ids'] ?? [])->values();
                $pivotData = $ficheIds->mapWithKeys(fn ($id, $i) => [$id => ['position' => $i + 1]])->all();
                $plat->ficheTechniques()->sync($pivotData);
            }
        }
    }
}
