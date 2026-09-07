<?php

namespace App\Services;

/**
 * Génère le ZPL d'une étiquette HACCP pour une Zebra ZD411d chargée avec des étiquettes 57x32mm
 * (203 dpi, donc 8 dots/mm — 456x256 dots). Mise en page volontairement simple : titre du type
 * d'étiquette, nom du produit (sur 2 lignes max), date, et DLC si applicable — reprend le même
 * contenu que l'ancien système Brother QL. `^PQ` imprime les copies en une seule connexion plutôt
 * que de rouvrir un socket par exemplaire.
 */
class ZplLabelBuilder
{
    private const LABEL_TYPES = [
        'ouvert' => 'OUVERT LE',
        'produit' => 'PRODUIT LE',
        'congele' => 'CONGELÉ LE',
        'decongele' => 'DÉCONGELÉ LE',
        'jeter' => 'À JETER LE',
    ];

    public static function build(
        string $typeKey,
        string $productName,
        string $date,
        ?string $useByDate,
        int $quantity,
    ): string {
        $title = self::LABEL_TYPES[$typeKey] ?? strtoupper($typeKey);
        $product = self::sanitize($productName);
        $dateLabel = self::formatDate($date);

        $lines = [
            '^XA',
            '^CI28',
            '^PW456',
            '^LL256',
            '^CF0,34',
            "^FO16,12^FD{$title}^FS",
            '^CF0,26',
            "^FO16,54^FB424,2,2,L,0^FD{$product}^FS",
            '^CF0,22',
            "^FO16,150^FDLe : {$dateLabel}^FS",
        ];

        if ($useByDate) {
            $lines[] = '^FO16,180^FDÀ consommer avant : ' . self::formatDate($useByDate) . '^FS';
        }

        $lines[] = '^PQ' . max(1, $quantity);
        $lines[] = '^XZ';

        return implode("\n", $lines);
    }

    /** ZPL réserve `^` et `~` pour ses propres commandes — on les retire d'un texte libre utilisateur. */
    private static function sanitize(string $text): string
    {
        return str_replace(['^', '~'], ' ', $text);
    }

    private static function formatDate(string $date): string
    {
        return date('d/m/Y', strtotime($date));
    }
}
