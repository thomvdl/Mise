<?php

namespace App\Console\Commands;

use App\Models\Appareil;
use App\Models\TemperatureReleve;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use PhpMqtt\Client\ConnectionSettings;
use PhpMqtt\Client\Exceptions\MqttClientException;
use PhpMqtt\Client\MqttClient;
use Throwable;

class ListenTemperatureSensors extends Command
{
    protected $signature = 'temperature:listen';

    protected $description = 'Écoute en continu les relevés Zigbee2MQTT des capteurs de température '
        .'et les enregistre dans temperature_releves (voir docker-compose.yml, service zigbee2mqtt)';

    // Un SNZB-02D republie à chaque petite variation — on ne garde qu'un relevé toutes les 10
    // minutes par appareil pour ne pas noyer l'historique HACCP sous des doublons quasi identiques.
    private const MIN_INTERVAL_BETWEEN_RELEVES_MINUTES = 10;

    public function handle(): int
    {
        while (true) {
            try {
                $this->listenOnce();
            } catch (Throwable $exception) {
                Log::error('temperature:listen — connexion MQTT perdue, nouvelle tentative dans 5s', [
                    'exception' => $exception->getMessage(),
                ]);
                $this->error("Connexion MQTT perdue : {$exception->getMessage()}");
            }

            sleep(5);
        }
    }

    /**
     * @throws MqttClientException
     */
    private function listenOnce(): void
    {
        $client = new MqttClient(
            host: config('mqtt.host'),
            port: config('mqtt.port'),
            clientId: config('mqtt.client_id'),
        );

        $client->connect((new ConnectionSettings())->setKeepAliveInterval(60), true);
        $this->info('Connecté au broker MQTT, en écoute des capteurs Zigbee2MQTT…');

        $topic = config('mqtt.topic_prefix').'/+';

        $client->subscribe($topic, function (string $topic, string $message): void {
            $this->handleMessage($topic, $message);
        }, MqttClient::QOS_AT_MOST_ONCE);

        $client->loop(true);
    }

    private function handleMessage(string $topic, string $message): void
    {
        // "zigbee2mqtt/Frigo cuisine" -> "Frigo cuisine" (le friendly_name donné dans Zigbee2MQTT,
        // voir appareils.zigbee_device_id).
        $friendlyName = substr($topic, strlen(config('mqtt.topic_prefix')) + 1);

        $payload = json_decode($message, associative: true);
        if (! is_array($payload) || ! array_key_exists('temperature', $payload)) {
            // Messages de statut Zigbee2MQTT (bridge/*, availability...) ou capteur sans relevé de
            // température dans ce message — rien à faire.
            return;
        }

        $appareil = Appareil::where('zigbee_device_id', $friendlyName)->first();
        if (! $appareil) {
            // Capteur Zigbee pas (encore) relié à un appareil depuis mise-dashboard — on ignore
            // plutôt que d'échouer, le réseau Zigbee peut avoir d'autres appareils non liés à Mise.
            return;
        }

        $lastReleve = TemperatureReleve::where('appareil_id', $appareil->id)
            ->where('source', 'capteur')
            ->latest('recorded_at')
            ->first();

        if ($lastReleve && $lastReleve->recorded_at->diffInMinutes(now()) < self::MIN_INTERVAL_BETWEEN_RELEVES_MINUTES) {
            return;
        }

        TemperatureReleve::create([
            'appareil_id' => $appareil->id,
            'temperature' => (float) $payload['temperature'],
            'recorded_at' => now(),
            'source' => 'capteur',
        ]);

        $this->line("{$appareil->name} : {$payload['temperature']}°C");
    }
}
