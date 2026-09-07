<?php

namespace App\Services;

/**
 * Génère le ZPL d'une étiquette HACCP. Résolution (dpi) et taille du support (mm) sont
 * paramétrables (voir settings `printer_dpi`/`label_width_mm`/`label_height_mm`, réglables dans
 * Paramètres → Impression d'étiquettes) — tout le calcul de mise en page se fait en proportion de
 * la largeur/hauteur en dots plutôt qu'en valeurs absolues, pour rester correct quel que soit le
 * modèle Zebra ou le format d'étiquette chargé (203/300dpi, autre découpe, etc.).
 *
 * Contenu : titre du type d'étiquette, nom du produit (sur 2 lignes max), date, et DLC si
 * applicable — reprend le même contenu que l'ancien système Brother QL. `^PQ` imprime les copies
 * en une seule connexion plutôt que de rouvrir un socket par exemplaire.
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

    /** Proportions calées sur le calibrage d'origine (57x32mm @ 203dpi, soit 456x256 dots). */
    private const MARGIN_X_RATIO = 0.035;
    private const TITLE_Y_RATIO = 0.047;
    private const TITLE_FONT_RATIO = 0.133;
    private const NAME_Y_RATIO = 0.211;
    private const NAME_FONT_RATIO = 0.102;
    private const NAME_BLOCK_WIDTH_RATIO = 0.93;
    private const DATE_Y_RATIO = 0.586;
    private const DATE_FONT_RATIO = 0.086;
    private const DLC_Y_RATIO = 0.703;

    public static function build(
        string $typeKey,
        string $productName,
        string $date,
        ?string $useByDate,
        int $quantity,
        int $dpi = 203,
        float $widthMm = 57,
        float $heightMm = 32,
    ): string {
        $title = self::LABEL_TYPES[$typeKey] ?? strtoupper($typeKey);
        $product = self::sanitize($productName);
        $dateLabel = self::formatDate($date);

        $dotsPerMm = $dpi / 25.4;
        $widthDots = (int) round($widthMm * $dotsPerMm);
        $heightDots = (int) round($heightMm * $dotsPerMm);
        $marginX = (int) round($widthDots * self::MARGIN_X_RATIO);
        $blockWidth = (int) round($widthDots * self::NAME_BLOCK_WIDTH_RATIO);

        $lines = [
            '^XA',
            '^CI28',
            "^PW{$widthDots}",
            "^LL{$heightDots}",
            '^CF0,' . self::dots($heightDots, self::TITLE_FONT_RATIO),
            '^FO' . $marginX . ',' . self::dots($heightDots, self::TITLE_Y_RATIO) . "^FD{$title}^FS",
            '^CF0,' . self::dots($heightDots, self::NAME_FONT_RATIO),
            '^FO' . $marginX . ',' . self::dots($heightDots, self::NAME_Y_RATIO)
                . "^FB{$blockWidth},2,2,L,0^FD{$product}^FS",
            '^CF0,' . self::dots($heightDots, self::DATE_FONT_RATIO),
            '^FO' . $marginX . ',' . self::dots($heightDots, self::DATE_Y_RATIO) . "^FDLe : {$dateLabel}^FS",
        ];

        if ($useByDate) {
            $lines[] = '^FO' . $marginX . ',' . self::dots($heightDots, self::DLC_Y_RATIO)
                . '^FDÀ consommer avant : ' . self::formatDate($useByDate) . '^FS';
        }

        $lines[] = '^PQ' . max(1, $quantity);
        $lines[] = '^XZ';

        return implode("\n", $lines);
    }

    private static function dots(int $referenceDots, float $ratio): int
    {
        return (int) round($referenceDots * $ratio);
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
