<?php

namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class NoteController extends Controller
{
    private const RELATIONS = ['user:id,name', 'parent:id,title', 'children.user:id,name'];

    /**
     * Display a listing of the resource.
     *
     * Renvoie uniquement les pages racines, sous-pages incluses (une seule profondeur) —
     * le frontend construit l'arborescence directement depuis cette réponse, sans appel
     * supplémentaire par page (nombre de notes attendu trop faible pour justifier une pagination).
     */
    public function index()
    {
        return Note::with(self::RELATIONS)->whereNull('parent_id')->orderBy('title')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $note = Note::create([...$validated, 'user_id' => $request->user()->id]);

        return response()->json($note->load(self::RELATIONS), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Note $note)
    {
        return $note->load(self::RELATIONS);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Note $note)
    {
        $validated = $request->validate($this->rules($note, forUpdate: true));

        if (array_key_exists('parent_id', $validated) && $validated['parent_id'] !== null && $note->children()->exists()) {
            throw ValidationException::withMessages([
                'parent_id' => ["Cette page a des sous-pages : elle ne peut pas devenir elle-même une sous-page (un seul niveau de profondeur est autorisé)."],
            ]);
        }

        $note->update($validated);

        return $note->load(self::RELATIONS);
    }

    /**
     * Remove the specified resource from storage.
     *
     * Contrairement aux messages/chanels, la suppression n'entraîne pas de cascade : une page
     * qui a encore des sous-pages doit d'abord les voir supprimées ou détachées.
     */
    public function destroy(Note $note)
    {
        if ($note->children()->exists()) {
            throw ValidationException::withMessages([
                'note' => ['Impossible de supprimer une page qui a des sous-pages : supprimez ou déplacez-les d\'abord.'],
            ]);
        }

        $note->delete();

        return response()->noContent();
    }

    private function rules(?Note $note = null, bool $forUpdate = false): array
    {
        $required = $forUpdate ? ['sometimes', 'required'] : ['required'];

        return [
            'title' => [...$required, 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('notes', 'id')->where(fn ($query) => $query->whereNull('parent_id')),
                Rule::notIn(array_filter([$note?->id])),
            ],
        ];
    }
}
