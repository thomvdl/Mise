<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Printer extends Model
{
    protected $fillable = [
        'name', 'type', 'ip', 'dpi', 'label_width_mm', 'label_height_mm',
        'rotate_90', 'top_offset_mm', 'paper_width_mm', 'is_default',
    ];

    protected $casts = [
        'dpi' => 'integer',
        'label_width_mm' => 'float',
        'label_height_mm' => 'float',
        'rotate_90' => 'boolean',
        'top_offset_mm' => 'float',
        'paper_width_mm' => 'integer',
        'is_default' => 'boolean',
    ];

    /**
     * Résout quelle imprimante utiliser pour une impression : celle explicitement choisie par le
     * poste (localStorage du navigateur, voir LocalPrinterService) si elle existe encore ET est
     * bien du type demandé, sinon celle marquée par défaut POUR CE TYPE — pour qu'une install à
     * une seule imprimante par type continue de marcher sans qu'aucun poste n'ait besoin d'en
     * choisir une explicitement. `$type` par défaut à 'label' : les appelants existants (étiquettes
     * HACCP/événements), écrits avant l'introduction du ticket thermique, n'ont pas besoin de le
     * préciser.
     */
    public static function resolve(?int $printerId, string $type = 'label'): ?self
    {
        if ($printerId) {
            $printer = static::where('id', $printerId)->where('type', $type)->first();

            if ($printer) {
                return $printer;
            }
        }

        return static::where('type', $type)->where('is_default', true)->first();
    }
}
