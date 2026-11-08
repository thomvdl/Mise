<?php

namespace App\Http\Controllers;

use App\Models\NettoyageTache;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NettoyageTacheController extends Controller
{
    /** Fréquences proposées côté formulaire — pas de table dédiée, juste une chaîne validée. */
    private const FREQUENCES = ['apres_utilisation', 'apres_service', 'quotidien', 'hebdomadaire', 'mensuel', 'trimestriel', 'annuel'];

    /**
     * Display a listing of the resource.
     *
     * Tout le plan d'un coup, sans pagination (quelques dizaines de lignes au plus) — le
     * regroupement par zone et le tri par fréquence se font côté client. Chaque tâche vient avec
     * sa dernière réalisation, pour afficher « fait / à faire » sans charger le registre.
     */
    public function index()
    {
        return NettoyageTache::query()->with('derniereRealisation')->orderBy('zone')->orderBy('name')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $tache = NettoyageTache::create($request->validate($this->rules()));

        return response()->json($tache, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(NettoyageTache $nettoyageTache)
    {
        return $nettoyageTache->load('derniereRealisation');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, NettoyageTache $nettoyageTache)
    {
        $nettoyageTache->update($request->validate($this->rules(forUpdate: true)));

        return $nettoyageTache;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(NettoyageTache $nettoyageTache)
    {
        $nettoyageTache->delete();

        return response()->noContent();
    }

    private function rules(bool $forUpdate = false): array
    {
        $required = $forUpdate ? ['sometimes', 'required'] : ['required'];

        return [
            'zone' => [...$required, 'string', 'max:100'],
            'name' => [...$required, 'string', 'max:255'],
            'frequence' => [...$required, 'string', Rule::in(self::FREQUENCES)],
            'moment' => ['sometimes', 'nullable', 'string', 'max:100'],
            'responsable' => ['sometimes', 'nullable', 'string', 'max:100'],
            'produit' => ['sometimes', 'nullable', 'string', 'max:255'],
            'methode' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
