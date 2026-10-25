<?php

namespace App\Http\Controllers;

use App\Models\Printer;
use Illuminate\Http\Request;

/**
 * Imprimantes Zebra, une par poste (ip = l'adresse du pont ZPL mise-app qui tourne sur cette
 * machine, voir mise-app/README.md). `index` est lisible par tout utilisateur connecté (dashboard
 * ET public) : c'est ce que consomme le sélecteur "imprimante de ce poste" de chaque navigateur
 * (réglage local, voir LocalPrinterService côté front) ; la gestion (store/update/destroy) reste
 * réservée à l'admin, comme pour Setting auparavant.
 */
class PrinterController extends Controller
{
    public function index()
    {
        return Printer::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $printer = Printer::create($validated);

        $this->ensureSingleDefault($printer);

        return response()->json($printer, 201);
    }

    public function update(Request $request, Printer $printer)
    {
        $validated = $request->validate($this->rules(forUpdate: true));

        $printer->update($validated);

        $this->ensureSingleDefault($printer);

        return $printer;
    }

    public function destroy(Printer $printer)
    {
        $printer->delete();

        return response()->noContent();
    }

    private function rules(bool $forUpdate = false): array
    {
        $required = $forUpdate ? ['sometimes', 'required'] : ['required'];

        return [
            'name' => [...$required, 'string', 'max:100'],
            'type' => ['nullable', 'string', 'in:label,thermal'],
            'ip' => [...$required, 'string', 'max:255'],
            'dpi' => ['nullable', 'integer', 'in:203,300'],
            'label_width_mm' => ['nullable', 'numeric', 'min:1'],
            'label_height_mm' => ['nullable', 'numeric', 'min:1'],
            'rotate_90' => ['nullable', 'boolean'],
            'top_offset_mm' => ['nullable', 'numeric', 'min:0'],
            // 58 et 80mm sont les deux largeurs de rouleau ESC/POS standard du marché — pas la
            // peine d'accepter une valeur libre pour un champ qui ne pilote qu'un nombre de
            // caractères par ligne (voir EscposFicheTechniqueBuilder::CHARS_PER_LINE).
            'paper_width_mm' => ['nullable', 'integer', 'in:58,80'],
            'is_default' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Une seule imprimante par défaut à la fois PAR TYPE — une Zebra et un ticket thermique
     * peuvent chacun être "la" valeur par défaut de leur type en même temps (un poste sans choix
     * explicite doit pouvoir retomber sur l'un ET l'autre, voir Printer::resolve).
     */
    private function ensureSingleDefault(Printer $printer): void
    {
        if ($printer->is_default) {
            Printer::where('id', '!=', $printer->id)
                ->where('type', $printer->type)
                ->update(['is_default' => false]);
        }
    }
}
