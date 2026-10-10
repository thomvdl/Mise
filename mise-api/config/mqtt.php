<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Broker MQTT (Zigbee2MQTT)
    |--------------------------------------------------------------------------
    |
    | Lu par App\Console\Commands\ListenTemperatureSensors. "mosquitto" est le nom du service
    | Docker Compose du broker — correct par défaut tant que la commande tourne dans le même
    | réseau compose que le reste du projet (voir docker-compose.yml).
    |
    */

    'host' => env('MQTT_HOST', 'mosquitto'),
    'port' => env('MQTT_PORT', 1883),
    'client_id' => env('MQTT_CLIENT_ID', 'mise-api-temperature-listener'),

    // Préfixe de topic configuré côté Zigbee2MQTT (valeur par défaut de Z2M) — chaque capteur
    // publie sur "<topic_prefix>/<friendly_name>".
    'topic_prefix' => env('MQTT_TOPIC_PREFIX', 'zigbee2mqtt'),

];
