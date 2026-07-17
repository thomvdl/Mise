<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShoppingItem extends Model
{
    protected $fillable = ['user_id', 'name', 'status'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
