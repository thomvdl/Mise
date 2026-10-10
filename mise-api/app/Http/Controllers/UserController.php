<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\User;
use App\Services\ZplLabelBuilder;
use App\Services\ZplPrinter;
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
        return User::orderBy('name')->get(['id', 'name', 'role', 'login_barcode']);
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
     * (Re)génère le badge de connexion de cet utilisateur — régénérer invalide l'ancien code
     * (utile si un badge est perdu ou volé : il suffit de réimprimer, l'ancien ne connecte plus
     * personne). Alphabet volontairement sans caractères ambigus (0/O, 1/I/L) — scanné, pas tapé,
     * mais autant rester lisible si quelqu'un doit un jour le relire à l'œil.
     */
    public function generateBarcode(User $user)
    {
        $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

        do {
            $code = '';
            for ($i = 0; $i < 12; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
        } while (User::where('login_barcode', $code)->exists());

        $user->update(['login_barcode' => $code]);

        return ['id' => $user->id, 'name' => $user->name, 'role' => $user->role, 'login_barcode' => $user->login_barcode];
    }

    /**
     * Imprime le badge sur la Zebra configurée (même mécanisme que PrintedLabelController::printZebra,
     * mais pas journalisé dans printed_labels : ce n'est pas une étiquette HACCP).
     */
    public function printBarcode(User $user)
    {
        if (! $user->login_barcode) {
            return response()->json(['message' => "Cet utilisateur n'a pas encore de code-barres généré."], 422);
        }

        $zpl = ZplLabelBuilder::buildUserBarcodeLabel(
            $user->name,
            $user->login_barcode,
            (int) Setting::get('printer_dpi', '203'),
            (float) Setting::get('label_width_mm', '57'),
            (float) Setting::get('label_height_mm', '32'),
            Setting::get('label_rotate_90', '0') === '1',
            (float) Setting::get('label_top_offset_mm', '0'),
        );

        if ($error = ZplPrinter::send($zpl)) {
            return response()->json(['message' => $error], str_contains($error, 'configurée') ? 422 : 502);
        }

        return response()->noContent();
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
