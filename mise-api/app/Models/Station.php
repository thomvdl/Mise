<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Station extends Model
{
    protected $fillable = ['name', 'slug', 'color'];

    public function ficheTechniques(): HasMany
    {
        return $this->hasMany(FicheTechnique::class);
    }
}
