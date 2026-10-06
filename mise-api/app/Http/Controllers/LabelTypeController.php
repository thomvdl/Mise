<?php

namespace App\Http\Controllers;

use App\Models\LabelType;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Types d'étiquette (OUVERT LE, PRODUIT LE, ...) — autrefois codés en dur dans
 * ZplLabelBuilder::LABEL_TYPES et dans les règles de validation `in:...` de
 * PrintedLabelController/LabelListController. `type_key` (`key` ici) reste une simple chaîne
 * référencée par `printed_labels`/`label_list_items`, pas une clé étrangère : supprimer un type ne
 * doit jamais casser l'historique déjà imprimé.
 */
class LabelTypeController extends Controller
{
    /** Jeu fixe d'icônes dessinables par ZplIconRenderer et connues du front (voir label.model.ts). */
    public const ICON_KEYS = ['flocon', 'poubelle', 'production', 'goutte', 'ouvert', 'generique'];

    public function index()
    {
        return LabelType::orderBy('position')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $labelType = LabelType::create($validated);

        return response()->json($labelType, 201);
    }

    public function update(Request $request, LabelType $labelType)
    {
        $validated = $request->validate($this->rules(forUpdate: true, ignoreId: $labelType->id));

        $labelType->update($validated);

        return $labelType;
    }

    public function destroy(LabelType $labelType)
    {
        $labelType->delete();

        return response()->noContent();
    }

    private function rules(bool $forUpdate = false, ?int $ignoreId = null): array
    {
        $required = $forUpdate ? ['sometimes', 'required'] : ['required'];

        return [
            'key' => [
                ...$required,
                'string',
                'max:50',
                'alpha_dash',
                Rule::unique('label_types', 'key')->ignore($ignoreId),
            ],
            'name' => [...$required, 'string', 'max:100'],
            'jplus_days' => ['nullable', 'integer', 'between:0,60'],
            'icon_key' => ['nullable', 'string', Rule::in(self::ICON_KEYS)],
            'position' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
