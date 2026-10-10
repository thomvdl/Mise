<?php

namespace App\Http\Controllers;

use App\Models\LabelType;
use App\Models\PrintedLabel;
use App\Models\Setting;
use App\Services\ZplLabelBuilder;
use App\Services\ZplPrinter;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Historique des étiquettes réellement imprimées (traçabilité HACCP) — voir CONTEXT.md
 * "Pas d'historique/journal des étiquettes imprimées" (manque comblé ici).
 *
 * Volontairement append-only : seulement index()/store(), pas d'update()/destroy(). Un
 * historique qu'on peut modifier ou effacer après coup ne prouve plus rien en cas de contrôle
 * sanitaire — même un admin ne doit pas pouvoir corriger/supprimer une ligne déjà enregistrée.
 */
class PrintedLabelController extends Controller
{
    /**
     * Filtrable par type_key et par plage de dates (from/to, sur created_at — le moment réel de
     * l'impression, pas la date affichée sur l'étiquette elle-même), pour le rapport du dashboard.
     */
    public function index(Request $request)
    {
        $query = PrintedLabel::query()->orderBy('created_at', 'desc');

        if ($request->filled('type_key')) {
            $query->where('type_key', $request->string('type_key'));
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->date('from'));
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->date('to')->endOfDay());
        }

        return $query->get();
    }

    /**
     * `user_id`/`user_name` viennent du token authentifié, jamais du corps de la requête — même
     * convention que le reste de l'API (voir CONTEXT.md "Authentification & rôles").
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type_key' => ['required', 'string', Rule::exists('label_types', 'key')],
            'product_name' => ['required', 'string', 'max:100'],
            'date' => ['required', 'date'],
            'use_by_date' => ['nullable', 'date'],
            'quantity' => ['required', 'integer', 'between:1,10'],
            'printed_via' => ['required', 'string', 'in:browser,brother_ql,zebra_network'],
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['user_name'] = $request->user()->name;

        $printedLabel = PrintedLabel::create($validated);

        return response()->json($printedLabel, 201);
    }

    /**
     * Imprime réellement l'étiquette sur la Zebra ZD411d réseau (ZPL brut envoyé en TCP sur le
     * port JetDirect) puis journalise l'impression — les deux dans la même requête, pour ne
     * jamais logger une impression qui n'a pas eu lieu (contrairement au fallback navigateur,
     * qui journalise côté client juste avant `window.print()` sans pouvoir vérifier le succès).
     */
    public function printZebra(Request $request)
    {
        $validated = $request->validate([
            'type_key' => ['required', 'string', Rule::exists('label_types', 'key')],
            'product_name' => ['required', 'string', 'max:100'],
            'date' => ['required', 'date'],
            'use_by_date' => ['nullable', 'date'],
            'quantity' => ['required', 'integer', 'between:1,10'],
        ]);

        $type = LabelType::where('key', $validated['type_key'])->first();

        $zpl = ZplLabelBuilder::build(
            $type->name,
            $validated['product_name'],
            $validated['date'],
            $validated['use_by_date'] ?? null,
            $validated['quantity'],
            (int) Setting::get('printer_dpi', '203'),
            (float) Setting::get('label_width_mm', '57'),
            (float) Setting::get('label_height_mm', '32'),
            Setting::get('label_rotate_90', '0') === '1',
            $request->user()->name,
            $type->icon_key,
            (float) Setting::get('label_top_offset_mm', '0'),
            freeContent: $type->key === 'libre',
        );

        if ($error = ZplPrinter::send($zpl)) {
            return response()->json(['message' => $error], str_contains($error, 'configurée') ? 422 : 502);
        }

        $printedLabel = PrintedLabel::create([
            'user_id' => $request->user()->id,
            'user_name' => $request->user()->name,
            'type_key' => $validated['type_key'],
            'product_name' => $validated['product_name'],
            'date' => $validated['date'],
            'use_by_date' => $validated['use_by_date'] ?? null,
            'quantity' => $validated['quantity'],
            'printed_via' => 'zebra_network',
        ]);

        return response()->json($printedLabel, 201);
    }
}
