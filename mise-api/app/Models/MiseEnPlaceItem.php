<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MiseEnPlaceItem extends Model
{
    protected $fillable = ['user_id', 'station_id', 'name', 'status', 'deadline', 'urgency'];

    protected $casts = ['deadline' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }
}
