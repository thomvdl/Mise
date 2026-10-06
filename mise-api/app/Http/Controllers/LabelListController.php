<?php

namespace App\Http\Controllers;

use App\Models\LabelList;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Listes nommées et réutilisables de produits à étiqueter (voir LabelList) — distinctes du
 * journal d'étiquettes réellement imprimées (PrintedLabel, append-only). Une liste ne stocke
 * aucune date : mise-public recalcule date/DLC au moment de l'impression à partir du type.
 */
class LabelListController extends Controller
{
    private const TYPE_KEYS = 'ouvert,produit,congele,decongele,jeter';

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return LabelList::with('items')->orderBy('name')->get();
    }

    /**
     * Store a newly created resource in storage.
     *
     * Ouvert à tout utilisateur connecté — n'importe qui peut composer une liste réutilisable.
     */
    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $labelList = LabelList::create(['name' => $validated['name']]);
        $this->syncItems($labelList, $validated['items']);

        return response()->json($labelList->load('items'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(LabelList $labelList)
    {
        return $labelList->load('items');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, LabelList $labelList)
    {
        $validated = $request->validate($this->rules(forUpdate: true));

        if (array_key_exists('name', $validated)) {
            $labelList->update(['name' => $validated['name']]);
        }

        if (array_key_exists('items', $validated)) {
            $this->syncItems($labelList, $validated['items']);
        }

        return $labelList->load('items');
    }

    /**
     * Remove the specified resource from storage.
     *
     * Réservé à l'admin — éviter qu'une liste partagée disparaisse par erreur.
     */
    public function destroy(LabelList $labelList)
    {
        $labelList->delete();

        return response()->noContent();
    }

    private function rules(bool $forUpdate = false): array
    {
        $required = $forUpdate ? ['sometimes', 'required'] : ['required'];

        return [
            'name' => [...$required, 'string', 'max:255'],
            'items' => [...$required, 'array', 'min:1'],
            'items.*.type_key' => ['required_with:items', 'string', Rule::in(explode(',', self::TYPE_KEYS))],
            'items.*.product_name' => ['required_with:items', 'string', 'max:100'],
            'items.*.quantity' => ['required_with:items', 'integer', 'between:1,10'],
            'items.*.use_by_offset_days' => ['nullable', 'integer', 'between:0,60'],
        ];
    }

    /** Remplace toute la liste d'items à chaque sauvegarde — pas d'édition ligne à ligne côté
     * API, le client renvoie toujours l'état complet (même logique que FicheTechnique::steps). */
    private function syncItems(LabelList $labelList, array $items): void
    {
        $labelList->items()->delete();

        foreach ($items as $index => $item) {
            $labelList->items()->create([
                'type_key' => $item['type_key'],
                'product_name' => $item['product_name'],
                'quantity' => $item['quantity'],
                'use_by_offset_days' => $item['use_by_offset_days'] ?? null,
                'position' => $index,
            ]);
        }
    }
}
