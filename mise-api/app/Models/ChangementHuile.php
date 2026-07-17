<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChangementHuile extends Model
{
    protected $fillable = ['friteuse_id', 'date_changement'];

    protected $casts = [
        'date_changement' => 'date:Y-m-d',
    ];

    public function friteuse(): BelongsTo
    {
        return $this->belongsTo(Friteuse::class);
    }
}
