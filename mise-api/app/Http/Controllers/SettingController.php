<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

/**
 * Petit magasin clé/valeur pour la config globale de l'app (ex. IP de l'imprimante d'étiquettes)
 * — réservé à l'admin/dashboard, mise-public n'y touche jamais directement (voir
 * LabelPrintController, qui lit l'IP côté serveur pour imprimer).
 */
class SettingController extends Controller
{
    public function index()
    {
        return Setting::all(['key', 'value']);
    }

    public function update(Request $request, string $key)
    {
        $validated = $request->validate([
            'value' => ['nullable', 'string', 'max:255'],
        ]);

        Setting::set($key, $validated['value'] ?? null);

        return ['key' => $key, 'value' => $validated['value'] ?? null];
    }
}
