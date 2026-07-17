<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    /**
     * Crée le premier compte admin s'il n'existe encore aucun utilisateur — sert de bootstrap
     * pour pouvoir se connecter et créer les autres comptes depuis le dashboard. Nom/mot de
     * passe configurables via ADMIN_NAME/ADMIN_PASSWORD (ex. docker-compose .env) ; à changer
     * depuis la gestion des utilisateurs une fois connecté.
     */
    public function run(): void
    {
        if (User::query()->exists()) {
            return;
        }

        $name = env('ADMIN_NAME', 'Thomas');

        User::firstOrCreate(
            ['name' => $name],
            [
                'email' => Str::slug($name).'-'.Str::random(8).'@mise.local',
                'password' => Hash::make(env('ADMIN_PASSWORD', '1234abcd')),
                'role' => 'admin',
            ]
        );
    }
}
