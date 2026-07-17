<?php

namespace App\Http\Controllers;

use App\Models\Friteuse;
use Illuminate\Http\Request;

class FriteuseController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * Eager-loads the full change history (ordered newest first) so the public page can show
     * "changée le..." and the suggested next date for every friteuse in a single request.
     */
    public function index()
    {
        return Friteuse::with('changementsHuile')->orderBy('name')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'duree_vie_jours' => ['required', 'integer', 'min:1'],
        ]);

        $friteuse = Friteuse::create($validated);

        return response()->json($friteuse, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Friteuse $friteuse)
    {
        return $friteuse->load('changementsHuile');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Friteuse $friteuse)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'duree_vie_jours' => ['sometimes', 'required', 'integer', 'min:1'],
        ]);

        $friteuse->update($validated);

        return $friteuse;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Friteuse $friteuse)
    {
        $friteuse->delete();

        return response()->noContent();
    }
}
