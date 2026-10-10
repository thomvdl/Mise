<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appareil extends Model
{
    protected $fillable = ['name', 'abbreviation', 'fonction', 'temperature_min', 'temperature_max', 'zigbee_device_id'];

    protected $casts = [
        'temperature_min' => 'float',
        'temperature_max' => 'float',
    ];

    public function temperatureReleves(): HasMany
    {
        return $this->hasMany(TemperatureReleve::class);
    }
}
