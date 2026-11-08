<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class NettoyageTache extends Model
{
    protected $table = 'nettoyage_taches';

    protected $fillable = ['zone', 'name', 'frequence', 'moment', 'responsable', 'produit', 'methode'];

    public function realisations(): HasMany
    {
        return $this->hasMany(NettoyageRealisation::class);
    }

    /** Dernière fois que la tâche a été faite — suffit à savoir si elle est faite pour sa période
     * (aujourd'hui, cette semaine…), sans rapatrier tout le registre. */
    public function derniereRealisation(): HasOne
    {
        return $this->hasOne(NettoyageRealisation::class)->latestOfMany();
    }
}
