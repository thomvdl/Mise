<?php

namespace App\Http\Controllers;

use App\Models\MiseEnPlaceItem;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MiseEnPlaceItemController extends Controller
{
    private const RELATIONS = ['user:id,name', 'station', 'group', 'event'];

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return MiseEnPlaceItem::query()->with(self::RELATIONS)->orderBy('created_at')->get();
    }

    /**
     * Store a newly created resource in storage.
     *
     * Ouvert à tout utilisateur connecté — n'importe qui peut ajouter une tâche de mise en place.
     */
    public function store(Request $request)
    {
        // Une tâche se rattache à une station, un groupe ou un événement — jamais zéro, jamais
        // plusieurs : `required_without_all` impose au moins un des trois, `prohibits` interdit
        // d'en cocher un second dès que l'un est renseigné.
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'station_id' => [
                'nullable', 'integer', 'exists:stations,id',
                'required_without_all:group_id,event_id', 'prohibits:group_id,event_id',
            ],
            'group_id' => [
                'nullable', 'integer', 'exists:groups,id',
                'required_without_all:station_id,event_id', 'prohibits:station_id,event_id',
            ],
            'event_id' => [
                'nullable', 'integer', 'exists:events,id',
                'required_without_all:station_id,group_id', 'prohibits:station_id,group_id',
            ],
            'deadline' => ['nullable', 'date'],
            'urgency' => ['required', Rule::in(['faible', 'moyenne', 'urgente'])],
        ]);

        $item = MiseEnPlaceItem::create([...$validated, 'user_id' => $request->user()->id, 'status' => 'todo']);

        return response()->json($item->load(self::RELATIONS), 201);
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

        return $miseEnPlaceItem->load(self::RELATIONS);
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
