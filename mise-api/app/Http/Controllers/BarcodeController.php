<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * Recherche du nom d'un produit à partir de son code-barres EAN, pour préremplir le champ
 * "Produit" des étiquettes (notamment OUVERT LE) sans le retaper à la main. Proxy vers Open Food
 * Facts (base gratuite, pas de clé) plutôt qu'un appel direct côté front — évite le CORS et garde
 * la clé/l'URL du fournisseur remplaçable sans redéployer le dashboard.
 */
class BarcodeController extends Controller
{
    public function lookup(Request $request, string $ean)
    {
        $request->merge(['ean' => $ean])->validate([
            'ean' => ['required', 'digits_between:8,14'],
        ]);

        $response = Http::withHeaders([
            // Open Food Facts demande un User-Agent identifiable (voir leur charte d'usage de
            // l'API) — un client anonyme générique s'expose à être limité/bloqué.
            'User-Agent' => 'Mise-Kitchen-App - Test - https://github.com/thomvdl/Mise',
        ])
            ->timeout(5)
            ->get("https://world.openfoodfacts.org/api/v2/product/{$ean}.json", [
                'fields' => 'product_name,brands',
            ]);

        if (! $response->successful() || (int) $response->json('status') !== 1) {
            return response()->json(['message' => 'Produit introuvable pour ce code-barres.'], 404);
        }

        $product = $response->json('product', []);
        $name = trim($product['product_name'] ?? '');
        $brand = trim(explode(',', $product['brands'] ?? '')[0] ?? '');

        if ($name === '') {
            return response()->json(['message' => 'Produit trouvé mais sans nom exploitable.'], 404);
        }

        $fullName = $brand !== '' && ! str_contains(mb_strtolower($name), mb_strtolower($brand))
            ? "{$brand} {$name}"
            : $name;

        return response()->json(['name' => mb_substr($fullName, 0, 100)]);
    }
}
