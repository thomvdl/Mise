<?php

namespace Database\Seeders;

use App\Models\Channel;
use App\Models\Station;
use Illuminate\Database\Seeder;

class ChannelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // updateOrCreate (pas firstOrCreate) : la position doit rester fixée à chaque
        // démarrage même si l'ordre des stations change, "Général" doit toujours passer en premier.
        Channel::updateOrCreate(['name' => 'Général'], ['position' => 0]);

        foreach (Station::all() as $index => $station) {
            Channel::updateOrCreate(['name' => $station->name], ['position' => $index + 1]);
        }
    }
}
