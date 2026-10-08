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

    private const LOCK_FILE = '/tmp/mise-zpl-printer.lock';

    /** Renvoie null si l'impression a réussi, sinon un message d'erreur à renvoyer au client. */
    public static function send(string $zpl): ?string
    {
        $printerIp = Setting::get('printer_ip');

        if (! $printerIp) {
            return "Aucune imprimante configurée — renseigne l'adresse IP dans Paramètres.";
        }

        // Une Zebra réseau ne gère fiablement qu'UNE connexion TCP à la fois sur son port
        // JetDirect — plusieurs requêtes concurrentes (ex. imprimer toute une file de plusieurs
        // étiquettes d'un coup depuis le dashboard) ouvraient chacune leur propre socket en
        // parallèle, et l'imprimante n'en retenait qu'une, les autres étiquettes disparaissant
        // silencieusement ("plusieurs produits mis en file, une seule imprimée"). Verrou fichier
        // pour sérialiser tout envoi, quel que soit l'appelant (dashboard, public, événements) —
        // le dashboard envoie aussi désormais sa file séquentiellement en défense, mais ce verrou
        // protège tous les autres chemins d'impression de la même façon.
        $lock = fopen(self::LOCK_FILE, 'c');

        if (! $lock) {
            return "Impossible d'obtenir le verrou d'impression.";
        }

        try {
            flock($lock, LOCK_EX);

            $socket = @fsockopen($printerIp, self::PORT, $errno, $errstr, 5);

            if (! $socket) {
                return "Impossible de contacter l'imprimante à {$printerIp} : {$errstr}.";
            }

            fwrite($socket, $zpl);
            fclose($socket);

            return null;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}
