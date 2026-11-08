<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    protected $fillable = ['name', 'detail', 'allergies_note', 'horaire', 'couverts', 'type', 'start_date', 'end_date', 'menu_id'];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
    ];

    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class);
    }

    /** Allergènes à éviter pour ce groupe. */
    public function allergens(): BelongsToMany
    {
        return $this->belongsToMany(Allergen::class);
    }

    public function miseEnPlaceItems(): HasMany
    {
        return $this->hasMany(MiseEnPlaceItem::class);
    }

    public function plats(): HasMany
    {
        return $this->hasMany(EventPlat::class)->orderBy('position');
    }
}
