<?php

namespace App\Services;

use App\Models\Printer;

/**
 * Envoie du ZPL brut à une imprimante (voir Printer), en TCP sur le port JetDirect standard —
 * partagé par tout endroit qui imprime une étiquette (HACCP, événements du calendrier, etc.) pour
 * ne pas dupliquer la gestion du socket.
 */
class ZplPrinter
{
    private const PORT = 9100;

    private const LOCK_FILE_PREFIX = '/tmp/mise-zpl-printer-';

    /** Renvoie null si l'impression a réussi, sinon un message d'erreur à renvoyer au client. */
    public static function send(string $zpl, ?Printer $printer): ?string
    {
        if (! $printer) {
            return "Aucune imprimante configurée — choisis l'imprimante de ce poste dans Paramètres.";
        }

        // Une Zebra réseau ne gère fiablement qu'UNE connexion TCP à la fois sur son port
        // JetDirect — plusieurs requêtes concurrentes (ex. imprimer toute une file de plusieurs
        // étiquettes d'un coup depuis le dashboard) ouvraient chacune leur propre socket en
        // parallèle, et l'imprimante n'en retenait qu'une, les autres étiquettes disparaissant
        // silencieusement ("plusieurs produits mis en file, une seule imprimée"). Verrou fichier
        // pour sérialiser tout envoi, quel que soit l'appelant (dashboard, public, événements) —
        // un verrou PAR imprimante : deux postes qui impriment chacun sur leur propre Zebra ne
        // doivent pas s'attendre l'un l'autre.
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

            fwrite($socket, $zpl);
            fclose($socket);

            return null;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}
