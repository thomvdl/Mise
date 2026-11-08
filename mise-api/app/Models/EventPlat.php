<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class EventPlat extends Model
{
    protected $fillable = ['event_id', 'section', 'name', 'pax', 'position'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function ficheTechniques(): BelongsToMany
    {
        return $this->belongsToMany(FicheTechnique::class)->withPivot('position')->orderByPivot('position');
    }
}
