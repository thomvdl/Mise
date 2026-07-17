<?php

namespace App\Http\Controllers;

use App\Models\ChangementHuile;
use Illuminate\Http\Request;

class ChangementHuileController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * Filtrable par friteuse_id et par plage de dates (from/to), utilisé par le rapport
     * semaine/mois/année du dashboard.
     */
    public function index(Request $request)
    {
        $query = ChangementHuile::query()->with('friteuse')->orderBy('date_changement', 'desc');

        if ($request->filled('friteuse_id')) {
            $query->where('friteuse_id', $request->integer('friteuse_id'));
        }

        if ($request->filled('from')) {
            $query->where('date_changement', '>=', $request->date('from'));
        }

        if ($request->filled('to')) {
            $query->where('date_changement', '<=', $request->date('to'));
        }

        return $query->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'friteuse_id' => ['required', 'exists:friteuses,id'],
            'date_changement' => ['nullable', 'date'],
        ]);

        $validated['date_changement'] ??= now()->toDateString();

        $changement = ChangementHuile::create($validated);

        return response()->json($changement->load('friteuse'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(ChangementHuile $changementHuile)
    {
        return $changementHuile->load('friteuse');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ChangementHuile $changementHuile)
    {
        $validated = $request->validate([
            'friteuse_id' => ['sometimes', 'required', 'exists:friteuses,id'],
            'date_changement' => ['sometimes', 'required', 'date'],
        ]);

        $changementHuile->update($validated);

        return $changementHuile->load('friteuse');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ChangementHuile $changementHuile)
    {
        $changementHuile->delete();

        return response()->noContent();
    }
}
