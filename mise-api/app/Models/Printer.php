<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Printer extends Model
{
    protected $fillable = [
        'name', 'ip', 'dpi', 'label_width_mm', 'label_height_mm',
        'rotate_90', 'top_offset_mm', 'is_default',
    ];

    protected $casts = [
        'dpi' => 'integer',
        'label_width_mm' => 'float',
        'label_height_mm' => 'float',
        'rotate_90' => 'boolean',
        'top_offset_mm' => 'float',
        'is_default' => 'boolean',
    ];

    /**
     * Résout quelle imprimante utiliser pour une impression : celle explicitement choisie par le
     * poste (localStorage du navigateur, voir LocalPrinterService) si elle existe encore, sinon
     * celle marquée par défaut — pour qu'une install à une seule imprimante continue de marcher
     * sans qu'aucun poste n'ait besoin d'en choisir une explicitement.
     */
    public static function resolve(?int $printerId): ?self
    {
        if ($printerId) {
            $printer = static::find($printerId);

            if ($printer) {
                return $printer;
            }
        }

        return static::where('is_default', true)->first();
    }
}
