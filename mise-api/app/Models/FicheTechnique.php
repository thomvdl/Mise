<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class FicheTechnique extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'category_id',
        'station_id',
        'servings',
        'difficulty',
        'description',
        'equipment',
        'mise_en_place',
        'plating',
        'chef_tip',
        'haccp',
        'conservation',
    ];

    protected $casts = [
        'equipment' => 'array',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function ingredients(): BelongsToMany
    {
        return $this->belongsToMany(Ingredient::class)->withPivot('quantity', 'group_label');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(Step::class)->orderBy('position');
    }

    public function pictures(): MorphMany
    {
        return $this->morphMany(Picture::class, 'pictureable');
    }
}
