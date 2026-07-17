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
     * le sélecteur de compte sur l'écran de connexion (pas d'email, pas de rôle, pas de mot de passe).
     */
    public function publicUsers()
    {
        return User::orderBy('name')->get(['id', 'name']);
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
