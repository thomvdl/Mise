<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NettoyageTache extends Model
{
    protected $table = 'nettoyage_taches';

    protected $fillable = ['zone', 'name', 'frequence', 'moment', 'responsable', 'produit', 'methode'];
}
