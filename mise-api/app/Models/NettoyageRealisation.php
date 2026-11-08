<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NettoyageRealisation extends Model
{
    protected $fillable = ['nettoyage_tache_id', 'zone', 'tache_name', 'user_id', 'user_name'];

    public function nettoyageTache(): BelongsTo
    {
        return $this->belongsTo(NettoyageTache::class);
    }
}
