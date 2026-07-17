<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Friteuse extends Model
{
    protected $fillable = ['name', 'duree_vie_jours'];

    protected $casts = [
        'duree_vie_jours' => 'integer',
    ];

    public function changementsHuile(): HasMany
    {
        return $this->hasMany(ChangementHuile::class)->orderBy('date_changement', 'desc');
    }
}
