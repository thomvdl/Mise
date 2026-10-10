<?php

namespace App\Http\Controllers;

use App\Models\Appareil;

class TemperatureAlertController extends Controller
{
    // Au-delà de ce délai sans nouveau relevé capteur, on ne considère plus la dernière valeur
    // connue comme fiable (capteur hors ligne, pile à plat...) plutôt que de la signaler indéfiniment.
    private const STALE_AFTER_MINUTES = 30;

    /**
     * Appareils dont le dernier relevé capteur (pas une saisie manuelle) dépasse leur plage de
     * température — consommé par mise-app pour la notification de bureau, voir
     * App\Console\Commands\ListenTemperatureSensors pour l'enregistrement des relevés.
     *
     * Public (pas de auth:sanctum) : mise-app n'a pas de compte/token, et cette route ne renvoie
     * rien de plus sensible que ce que mise-public affiche déjà à tout utilisateur connecté.
     */
    public function active()
    {
        $appareils = Appareil::query()
            ->whereNotNull('zigbee_device_id')
            ->where(function ($query) {
                $query->whereNotNull('temperature_min')->orWhereNotNull('temperature_max');
            })
            ->with(['temperatureReleves' => function ($query) {
                $query->where('source', 'capteur')->latest('recorded_at')->limit(1);
            }])
            ->get();

        $alerts = $appareils
            ->map(function (Appareil $appareil) {
                $releve = $appareil->temperatureReleves->first();
                if (! $releve || $releve->recorded_at->diffInMinutes(now()) > self::STALE_AFTER_MINUTES) {
                    return null;
                }

                $horsPlage = ($appareil->temperature_min !== null && $releve->temperature < $appareil->temperature_min)
                    || ($appareil->temperature_max !== null && $releve->temperature > $appareil->temperature_max);

                if (! $horsPlage) {
                    return null;
                }

                return [
                    'appareil_id' => $appareil->id,
                    'name' => $appareil->name,
                    'abbreviation' => $appareil->abbreviation,
                    'temperature' => $releve->temperature,
                    'temperature_min' => $appareil->temperature_min,
                    'temperature_max' => $appareil->temperature_max,
                    'recorded_at' => $releve->recorded_at,
                ];
            })
            ->filter()
            ->values();

        return response()->json($alerts);
    }
}
