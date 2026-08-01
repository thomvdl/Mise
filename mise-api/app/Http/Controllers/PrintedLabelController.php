<?php

namespace App\Http\Controllers;

use App\Models\PrintedLabel;
use Illuminate\Http\Request;

/**
 * Historique des étiquettes réellement imprimées (traçabilité HACCP) — voir CONTEXT.md
 * "Pas d'historique/journal des étiquettes imprimées" (manque comblé ici).
 *
 * Volontairement append-only : seulement index()/store(), pas d'update()/destroy(). Un
 * historique qu'on peut modifier ou effacer après coup ne prouve plus rien en cas de contrôle
 * sanitaire — même un admin ne doit pas pouvoir corriger/supprimer une ligne déjà enregistrée.
 */
class PrintedLabelController extends Controller
{
    /**
     * Filtrable par type_key et par plage de dates (from/to, sur created_at — le moment réel de
     * l'impression, pas la date affichée sur l'étiquette elle-même), pour le rapport du dashboard.
     */
    public function index(Request $request)
    {
        $query = PrintedLabel::query()->orderBy('created_at', 'desc');

        if ($request->filled('type_key')) {
            $query->where('type_key', $request->string('type_key'));
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->date('from'));
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->date('to')->endOfDay());
        }

        return $query->get();
    }

    /**
     * `user_id`/`user_name` viennent du token authentifié, jamais du corps de la requête — même
     * convention que le reste de l'API (voir CONTEXT.md "Authentification & rôles").
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type_key' => ['required', 'string', 'in:ouvert,produit,congele,decongele,jeter'],
            'product_name' => ['required', 'string', 'max:55'],
            'date' => ['required', 'date'],
            'use_by_date' => ['nullable', 'date'],
            'quantity' => ['required', 'integer', 'between:1,10'],
            'printed_via' => ['required', 'string', 'in:browser,brother_ql'],
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['user_name'] = $request->user()->name;

        $printedLabel = PrintedLabel::create($validated);

        return response()->json($printedLabel, 201);
    }
}
