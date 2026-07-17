<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return User::orderBy('name')->get(['id', 'name', 'role']);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:users,name'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::in(['user', 'admin'])],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            // Login is by name only — email is just a DB-required placeholder, never shown or used.
            'email' => Str::slug($validated['name']).'-'.Str::random(8).'@mise.local',
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        return response()->json(['id' => $user->id, 'name' => $user->name, 'role' => $user->role], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('users', 'name')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['sometimes', 'required', Rule::in(['user', 'admin'])],
        ]);

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        if (($validated['role'] ?? $user->role) !== 'admin' && $user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => "Impossible de retirer le rôle admin du dernier administrateur."], 422);
        }

        $user->update($validated);

        return ['id' => $user->id, 'name' => $user->name, 'role' => $user->role];
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => "Impossible de supprimer le dernier administrateur."], 422);
        }

        $user->delete();

        return response()->noContent();
    }
}
