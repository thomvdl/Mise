<?php

namespace App\Services;

use App\Models\Setting;

/**
 * Envoie du ZPL brut à l'imprimante configurée (adresse dans Setting `printer_ip`), en TCP sur le
 * port JetDirect standard — partagé par tout endroit qui imprime une étiquette (HACCP, événements
 * du calendrier, etc.) pour ne pas dupliquer la gestion du socket.
 */
class ZplPrinter
{
    private const PORT = 9100;

    /** Renvoie null si l'impression a réussi, sinon un message d'erreur à renvoyer au client. */
    public static function send(string $zpl): ?string
    {
        $printerIp = Setting::get('printer_ip');

        if (! $printerIp) {
            return "Aucune imprimante configurée — renseigne l'adresse IP dans Paramètres.";
        }

        $socket = @fsockopen($printerIp, self::PORT, $errno, $errstr, 5);

        if (! $socket) {
            return "Impossible de contacter l'imprimante à {$printerIp} : {$errstr}.";
        }

        fwrite($socket, $zpl);
        fclose($socket);

        return null;
    }
}
