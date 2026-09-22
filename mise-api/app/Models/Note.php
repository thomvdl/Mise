<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Note extends Model
{
    protected $fillable = ['title', 'content', 'user_id', 'parent_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Note::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Note::class, 'parent_id')->orderBy('title');
    }
}
