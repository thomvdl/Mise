<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remplace les 6 clés `printer_*`/`label_*` de `settings` (une seule imprimante possible pour
     * toute l'installation) par une table : plusieurs postes, chacun avec sa Zebra et son format
     * de rouleau. Le navigateur de chaque poste choisit ensuite lui-même sa ligne (réglage local,
     * pas en base — voir LocalPrinterService côté dashboard/public).
     */
    public function up(): void
    {
        Schema::create('printers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('ip');
            $table->unsignedSmallInteger('dpi')->default(203);
            $table->float('label_width_mm')->default(57);
            $table->float('label_height_mm')->default(32);
            $table->boolean('rotate_90')->default(false);
            $table->float('top_offset_mm')->default(0);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        // Reprend l'éventuelle imprimante déjà configurée (installs existantes) pour ne pas priver
        // un poste déjà en prod de son imprimante au moment du déploiement de cette migration.
        $settings = DB::table('settings')
            ->whereIn('key', [
                'printer_ip', 'printer_dpi', 'label_width_mm', 'label_height_mm',
                'label_rotate_90', 'label_top_offset_mm',
            ])
            ->pluck('value', 'key');

        if ($settings->get('printer_ip')) {
            DB::table('printers')->insert([
                'name' => 'Imprimante',
                'ip' => $settings->get('printer_ip'),
                'dpi' => $settings->get('printer_dpi', 203),
                'label_width_mm' => $settings->get('label_width_mm', 57),
                'label_height_mm' => $settings->get('label_height_mm', 32),
                'rotate_90' => $settings->get('label_rotate_90', '0') === '1',
                'top_offset_mm' => $settings->get('label_top_offset_mm', 0),
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('printers');
    }
};
