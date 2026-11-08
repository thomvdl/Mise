<?php

namespace App\Http\Controllers;

use App\Models\NettoyageRealisation;
use App\Models\NettoyageTache;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Registre du plan de nettoyage (qui a fait quoi, quand).
 *
 * Volontairement append-only, comme PrintedLabelController : seulement index()/store(), pas
 * d'update()/destroy(), même pour un admin — un registre qu'on peut corriger après coup ne prouve
 * plus rien lors d'un contrôle sanitaire.
 */
class NettoyageRealisationController extends Controller
{
    /**
     * Filtrable par tâche, zone et plage de dates (from/to, sur created_at). `limit` sert à
     * l'historique court d'une tâche côté cuisine ; le registre du dashboard n'en met pas.
     */
    public function index(Request $request)
    {
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $query = NettoyageRealisation::query()->orderByDesc('created_at')->orderByDesc('id');

        if ($request->filled('nettoyage_tache_id')) {
            $query->where('nettoyage_tache_id', $request->integer('nettoyage_tache_id'));
        }

        if ($request->filled('zone')) {
            $query->where('zone', $request->string('zone'));
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->date('from')->startOfDay());
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->date('to')->endOfDay());
        }

        if ($request->filled('limit')) {
            $query->limit($request->integer('limit'));
        }

        return $query->get();
    }

    /**
     * Seule la tâche est envoyée : l'heure est celle du serveur (pas d'antidate possible) et la
     * personne celle du token, jamais le corps de la requête. Zone et nom de la tâche sont
     * recopiés tels qu'ils sont au moment où c'est fait.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nettoyage_tache_id' => ['required', 'integer', Rule::exists('nettoyage_taches', 'id')],
        ]);

        $tache = NettoyageTache::findOrFail($validated['nettoyage_tache_id']);

        $realisation = NettoyageRealisation::create([
            'nettoyage_tache_id' => $tache->id,
            'zone' => $tache->zone,
            'tache_name' => $tache->name,
            'user_id' => $request->user()->id,
            'user_name' => $request->user()->name,
        ]);

        return response()->json($realisation, 201);
    }
}
