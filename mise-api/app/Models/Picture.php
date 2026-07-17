<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Picture extends Model
{
    protected $fillable = [
        'url',
    ];

    protected $appends = [
        'fiche_technique',
    ];

    protected $hidden = [
        'pictureable_type',
        'pictureable_id',
        'pictureable',
    ];

    public function pictureable(): MorphTo
    {
        return $this->morphTo();
    }

    public function getFicheTechniqueAttribute(): ?FicheTechnique
    {
        return $this->pictureable_type === FicheTechnique::class ? $this->pictureable : null;
    }
}
