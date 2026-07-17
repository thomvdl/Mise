<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Step extends Model
{
    use HasFactory;

    protected $fillable = [
        'fiche_technique_id',
        'position',
        'instruction',
        'timer_minutes',
    ];

    public function ficheTechnique(): BelongsTo
    {
        return $this->belongsTo(FicheTechnique::class);
    }
}
