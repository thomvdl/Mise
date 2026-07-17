<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TemperatureReleve extends Model
{
    protected $fillable = ['appareil_id', 'temperature', 'recorded_at'];

    protected $casts = [
        'temperature' => 'float',
        'recorded_at' => 'datetime',
    ];

    public function appareil(): BelongsTo
    {
        return $this->belongsTo(Appareil::class);
    }
}
