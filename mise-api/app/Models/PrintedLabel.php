<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Traçabilité HACCP des étiquettes réellement imprimées — voir PrintedLabelController (append-only, pas d'update/destroy). */
class PrintedLabel extends Model
{
    protected $fillable = [
        'user_id',
        'user_name',
        'type_key',
        'product_name',
        'date',
        'use_by_date',
        'quantity',
        'printed_via',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'use_by_date' => 'date:Y-m-d',
        'quantity' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
