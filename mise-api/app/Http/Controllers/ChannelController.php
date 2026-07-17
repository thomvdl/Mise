<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use Illuminate\Http\Request;

class ChannelController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Channel::query()->orderBy('position')->get();
    }

    /**
     * Store a newly created resource in storage.
     *
     * Un chanel créé depuis l'UI est ajouté à la fin (position = max + 1) — pas de champ
     * position exposé côté formulaire, l'ordre se gère uniquement via le seeder pour l'instant.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:channels,name'],
        ]);

        $validated['position'] = ((int) Channel::max('position')) + 1;

        $channel = Channel::create($validated);

        return response()->json($channel, 201);
    }

    /**
     * Remove the specified resource from storage.
     *
     * Supprime aussi tous les messages du chanel (cascade en base).
     */
    public function destroy(Channel $channel)
    {
        $channel->delete();

        return response()->noContent();
    }
}
