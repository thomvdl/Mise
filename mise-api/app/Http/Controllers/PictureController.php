<?php

namespace App\Http\Controllers;

use App\Models\FicheTechnique;
use App\Models\Picture;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PictureController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Picture::with('pictureable')->latest()->get();
    }

    /**
     * Store newly uploaded pictures in the library (unlinked until assigned to a fiche technique).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'files' => ['required', 'array', 'min:1'],
            'files.*' => ['image', 'max:2048'],
        ]);

        $pictures = collect($validated['files'])->map(
            fn ($file) => Picture::create(['url' => Storage::disk('public')->url($file->store('pictures', 'public'))])
        );

        return response()->json($pictures->values(), 201);
    }

    /**
     * Link (or unlink) a picture to a fiche technique.
     */
    public function update(Request $request, Picture $picture)
    {
        $validated = $request->validate([
            'fiche_technique_id' => ['nullable', 'integer', 'exists:fiche_techniques,id'],
        ]);

        $ficheTechniqueId = $validated['fiche_technique_id'] ?? null;

        if ($ficheTechniqueId) {
            $picture->pictureable()->associate(FicheTechnique::findOrFail($ficheTechniqueId));
        } else {
            $picture->pictureable()->dissociate();
        }

        $picture->save();

        return $picture->load('pictureable');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Picture $picture)
    {
        $path = ltrim(str_replace('/storage/', '', parse_url($picture->url, PHP_URL_PATH)), '/');
        Storage::disk('public')->delete($path);
        $picture->delete();

        return response()->noContent();
    }
}
