<?php

/*
 * Imprimantes déclarées dans .env (voir .env.example, section « Imprimantes ») — lues par
 * PrinterSeeder au démarrage du conteneur. Liste brute « Nom@IP » séparée par des virgules,
 * découpée par le seeder.
 */
return [
    'label' => env('LABEL_PRINTERS', ''),
    'thermal' => env('THERMAL_PRINTERS', ''),
];
