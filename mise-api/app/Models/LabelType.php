<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LabelType extends Model
{
    protected $fillable = ['key', 'name', 'jplus_days', 'icon_key', 'position'];

    protected $casts = [
        'jplus_days' => 'integer',
        'position' => 'integer',
    ];
}
