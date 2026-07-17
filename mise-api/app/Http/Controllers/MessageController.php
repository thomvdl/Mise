<?php

namespace App\Http\Controllers;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MessageController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * Renvoie tous les messages d'un chanel (fil racine + réponses à plat, triés par date) —
     * le frontend regroupe les réponses sous leur message parent via `parent_id`.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'channel_id' => ['required', 'exists:channels,id'],
        ]);

        return Message::query()
            ->with('user:id,name')
            ->where('channel_id', $validated['channel_id'])
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'channel_id' => ['required', 'exists:channels,id'],
            'content' => ['required', 'string', 'max:5000'],
            'parent_id' => [
                'nullable',
                Rule::exists('messages', 'id')->where('channel_id', $request->input('channel_id')),
            ],
        ]);

        $message = Message::create([...$validated, 'user_id' => $request->user()->id]);

        return response()->json($message->load('user:id,name'), 201);
    }

    /**
     * Remove the specified resource from storage.
     *
     * Supprime aussi ses éventuelles réponses (cascade en base).
     */
    public function destroy(Message $message)
    {
        $message->delete();

        return response()->noContent();
    }
}
