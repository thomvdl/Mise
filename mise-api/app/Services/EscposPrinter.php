<?php

namespace App\Services;

use App\Models\Printer;

/**
 * Envoie du ESC/POS brut à un ticket thermique (voir Printer, `type = 'thermal'`), en TCP — même
 * principe que ZplPrinter pour les étiquettes Zebra, mais sur un port différent (9101, pas 9100) :
 * les deux pontes mise-app (étiquette et ticket) écoutent chacun sur leur propre port du même
 * poste, voir mise-app/app/bridge_server.py et main.py. Verrou fichier par imprimante pour la même
 * raison que ZplPrinter (sérialiser les impressions concurrentes).
 */
class EscposPrinter
{
    private const PORT = 9101;

    private const LOCK_FILE_PREFIX = '/tmp/mise-escpos-printer-';

    /** Renvoie null si l'impression a réussi, sinon un message d'erreur à renvoyer au client. */
    public static function send(string $escpos, ?Printer $printer): ?string
    {
        if (! $printer) {
            return "Aucune imprimante à ticket configurée — choisis-la dans Paramètres.";
        }

        $lock = fopen(self::LOCK_FILE_PREFIX.$printer->id.'.lock', 'c');

        if (! $lock) {
            return "Impossible d'obtenir le verrou d'impression.";
        }

        try {
            flock($lock, LOCK_EX);

            $socket = @fsockopen($printer->ip, self::PORT, $errno, $errstr, 5);

            if (! $socket) {
                return "Impossible de contacter l'imprimante à {$printer->ip} : {$errstr}.";
            }

            fwrite($socket, $escpos);
            fclose($socket);

            return null;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}
