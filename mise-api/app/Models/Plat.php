<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Plat extends Model
{
    protected $fillable = [
        'menu_section_id',
        'name',
        'description',
        'position',
    ];

    public function menuSection(): BelongsTo
    {
        return $this->belongsTo(MenuSection::class);
    }

    public function ficheTechniques(): BelongsToMany
    {
        return $this->belongsToMany(FicheTechnique::class)->withPivot('position')->orderByPivot('position');
    }
}
