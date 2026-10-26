<?php

namespace Database\Seeders;

use App\Models\Printer;
use Illuminate\Database\Seeder;

/**
 * Crée les imprimantes déclarées dans .env (LABEL_PRINTERS / THERMAL_PRINTERS, voir
 * config/printers.php) — pour pouvoir préparer une installation sans passer par Paramètres du
 * dashboard. Rejoué à chaque démarrage comme les autres seeders :
 *
 * - une imprimante est reconnue par son nom ET son type (une Zebra et un ticket peuvent porter
 *   le même nom de poste, ce sont deux lignes distinctes — voir add_type_to_printers_table) ;
 * - absente : créée, avec les valeurs par défaut de la table pour le reste (format de rouleau,
 *   dpi... à ajuster ensuite dans le dashboard) ;
 * - déjà là : seule son IP est remise à celle du .env, qui fait foi pour l'adresse — les autres
 *   réglages faits dans le dashboard sont conservés ;
 * - retirée du .env : jamais supprimée (une suppression se fait depuis le dashboard).
 *
 * Si aucune imprimante de ce type n'est encore « par défaut », la première de la liste le
 * devient — sinon une install à une seule imprimante ne marcherait sur aucun poste tant que
 * personne ne l'a choisie explicitement (voir Printer::resolve).
 */
class PrinterSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['label', 'thermal'] as $type) {
            $entries = $this->parse((string) config("printers.$type"));
            if (! $entries) {
                continue;
            }

            foreach ($entries as $name => $ip) {
                $printer = Printer::firstOrCreate(
                    ['name' => $name, 'type' => $type],
                    ['ip' => $ip, 'paper_width_mm' => $type === 'thermal' ? 80 : null],
                );

                if ($printer->ip !== $ip) {
                    $printer->update(['ip' => $ip]);
                }
            }

            if (! Printer::where('type', $type)->where('is_default', true)->exists()) {
                Printer::where('type', $type)
                    ->where('name', array_key_first($entries))
                    ->update(['is_default' => true]);
            }
        }
    }

    /**
     * « Garde-manger@192.168.1.50, Pâtisserie@192.168.1.51 » → [nom => ip]. Une entrée sans
     * « @ » ou au nom/à l'IP vide est ignorée plutôt que de faire échouer tout le démarrage de
     * l'API pour une faute de frappe dans .env.
     */
    private function parse(string $raw): array
    {
        $entries = [];

        foreach (explode(',', $raw) as $item) {
            [$name, $ip] = array_pad(array_map('trim', explode('@', $item, 2)), 2, '');

            if ($name !== '' && $ip !== '') {
                $entries[$name] = $ip;
            }
        }

        return $entries;
    }
}
