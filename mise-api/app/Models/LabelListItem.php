<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabelListItem extends Model
{
    protected $fillable = ['label_list_id', 'type_key', 'product_name', 'quantity', 'use_by_offset_days', 'position'];

    public function labelList(): BelongsTo
    {
        return $this->belongsTo(LabelList::class);
    }
}
