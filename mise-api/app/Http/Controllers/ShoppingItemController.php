<?php

namespace App\Http\Controllers;

use App\Models\ShoppingItem;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ShoppingItemController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return ShoppingItem::query()->with('user:id,name')->orderBy('created_at')->get();
    }

    /**
     * Store a newly created resource in storage.
     *
     * Ouvert à tout utilisateur connecté — n'importe qui peut ajouter un article à la liste.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $item = ShoppingItem::create([...$validated, 'user_id' => $request->user()->id, 'status' => 'todo']);

        return response()->json($item->load('user:id,name'), 201);
    }

    /**
     * Update the specified resource in storage.
     *
     * Réservé à l'admin — seul le statut (todo/done) peut être modifié.
     */
    public function update(Request $request, ShoppingItem $shoppingItem)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['todo', 'done'])],
        ]);

        $shoppingItem->update($validated);

        return $shoppingItem->load('user:id,name');
    }

    /**
     * Remove the specified resource from storage.
     *
     * Réservé à l'admin.
     */
    public function destroy(ShoppingItem $shoppingItem)
    {
        $shoppingItem->delete();

        return response()->noContent();
    }
}
