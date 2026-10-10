<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Liste des noms d'utilisateurs, publique et non authentifiée — sert uniquement à afficher
     * le sélecteur de compte sur l'écran de connexion de mise-public (pas d'email, pas de rôle,
     * pas de mot de passe). N'est consommée que par mise-public — le dashboard a son propre
     * formulaire de connexion sans sélecteur, pas concerné par ce filtre.
     *
     * Les comptes admin sont exclus : cet écran est celui de la brigade en cuisine (potentiellement
     * affiché en kiosque sur un écran partagé), pas un outil d'administration — pas de raison d'y
     * afficher les comptes admin. Rien n'empêche un admin de se connecter quand même depuis
     * mise-public en tapant son nom à la main : seul l'affichage dans le sélecteur est filtré.
     */
    public function publicUsers()
    {
        return User::where('role', '!=', 'admin')->orderBy('name')->get(['id', 'name']);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('name', $validated['name'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'name' => ["Nom ou mot de passe incorrect."],
            ]);
        }

        return response()->json([
            'token' => $user->createToken('api')->plainTextToken,
            'user' => ['id' => $user->id, 'name' => $user->name, 'role' => $user->role],
        ]);
    }

    /**
     * Connexion par badge scanné (écran de connexion de mise-public, voir login.ts côté front) —
     * pas de mot de passe : le code imprimé sur le badge EST le credential, comme une pointeuse.
     * Public comme login() ci-dessus, pour la même raison (même écran, même niveau de confiance).
     */
    public function loginBarcode(Request $request)
    {
        $validated = $request->validate([
            'barcode' => ['required', 'string'],
        ]);

        $user = User::where('login_barcode', $validated['barcode'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'barcode' => ["Badge non reconnu."],
            ]);
        }

        return response()->json([
            'token' => $user->createToken('api')->plainTextToken,
            'user' => ['id' => $user->id, 'name' => $user->name, 'role' => $user->role],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return ['id' => $user->id, 'name' => $user->name, 'role' => $user->role];
    }
}
