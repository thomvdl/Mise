<?php

namespace App\Http\Controllers;

use App\Models\MiseEnPlaceItem;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MiseEnPlaceItemController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return MiseEnPlaceItem::query()->with(['user:id,name', 'station'])->orderBy('created_at')->get();
    }

    /**
     * Store a newly created resource in storage.
     *
     * Ouvert à tout utilisateur connecté — n'importe qui peut ajouter une tâche de mise en place.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'station_id' => ['required', 'integer', 'exists:stations,id'],
            'deadline' => ['required', 'date'],
            'urgency' => ['required', Rule::in(['faible', 'moyenne', 'urgente'])],
        ]);

        $item = MiseEnPlaceItem::create([...$validated, 'user_id' => $request->user()->id, 'status' => 'todo']);

        return response()->json($item->load(['user:id,name', 'station']), 201);
    }

    /**
     * Update the specified resource in storage.
     *
     * Ouvert à tout utilisateur connecté — la case à cocher côté public s'appuie dessus pour
     * valider une tâche. Seul le statut (todo/done) peut être modifié.
     */
    public function update(Request $request, MiseEnPlaceItem $miseEnPlaceItem)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['todo', 'done'])],
        ]);

        $miseEnPlaceItem->update($validated);

        return $miseEnPlaceItem->load(['user:id,name', 'station']);
    }

    /**
     * Remove the specified resource from storage.
     *
     * Réservé à l'admin.
     */
    public function destroy(MiseEnPlaceItem $miseEnPlaceItem)
    {
        $miseEnPlaceItem->delete();

        return response()->noContent();
    }
}
