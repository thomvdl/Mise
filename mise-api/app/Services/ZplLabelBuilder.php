<?php

namespace App\Services;

/**
 * Génère le ZPL d'une étiquette HACCP. Résolution (dpi) et taille du support (mm) sont
 * paramétrables (voir settings `printer_dpi`/`label_width_mm`/`label_height_mm`, réglables dans
 * Paramètres → Impression d'étiquettes). La mise en page ne suit plus des ratios figés calibrés
 * sur un seul format : chaque ligne est dimensionnée dynamiquement pour remplir l'espace
 * disponible (hauteur ET largeur) sans déborder, quel que soit le format de support chargé —
 * indispensable dès que deux formats très différents (ex. 57x32mm en paysage, 38x89mm pivoté)
 * doivent cohabiter sans recalibrage manuel.
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

    /** Marge intérieure, en proportion de chaque dimension. */
    private const MARGIN_RATIO = 0.035;

    /**
     * Largeur moyenne d'un caractère de la police ZPL 0 (proportionnelle), en fraction de sa
     * hauteur — ~0.6 pour du texte majuscule/accentué français, volontairement un peu généreux
     * pour ne jamais déborder plutôt que de couper au plus juste.
     */
    private const CHAR_WIDTH_RATIO = 0.6;

    /** Taille de police minimale, en dots, en dessous de laquelle le texte devient illisible. */
    private const MIN_FONT_DOTS = 14;

    public static function build(
        string $typeKey,
        string $productName,
        string $date,
        ?string $useByDate,
        int $quantity,
        int $dpi = 203,
        float $widthMm = 57,
        float $heightMm = 32,
        bool $rotate90 = false,
    ): string {
        $title = self::LABEL_TYPES[$typeKey] ?? strtoupper($typeKey);
        $product = self::sanitize($productName);
        $dateLine = 'Le : ' . self::formatDate($date);
        $dlcLine = $useByDate ? 'À consommer avant : ' . self::formatDate($useByDate) : null;

        $dotsPerMm = $dpi / 25.4;
        // ^PW/^LL restent calés sur le support physique (largeur = ce que la tête d'impression
        // peut couvrir, fixé par le rouleau chargé) — seule la mise en page tourne de 90°, pas le
        // sens de défilement du papier, qui ne se change pas en logiciel.
        //
        // Sous `^FWR`, le texte d'un champ avance toujours le long de l'axe Y physique (quel que
        // soit son origine ^FO) — ^FO ne change pas de repère, seul le sens d'écriture du texte
        // pivote. Du coup les champs successifs (titre/nom/date/DLC) doivent être espacés le long
        // de l'axe X physique (perpendiculaire au texte), pas Y, sous peine de se chevaucher tous
        // au même endroit (vécu en test). Sans rotation c'est l'inverse : le texte avance en X, les
        // champs s'espacent en Y — le repère "normal" de n'importe quelle étiquette.
        $physicalWidthDots = (int) round($widthMm * $dotsPerMm);
        $physicalHeightDots = (int) round($heightMm * $dotsPerMm);
        $stackDots = $rotate90 ? $physicalWidthDots : $physicalHeightDots;
        $advanceDots = $rotate90 ? $physicalHeightDots : $physicalWidthDots;

        $stackMargin = (int) round($stackDots * self::MARGIN_RATIO);
        $advanceMargin = (int) round($advanceDots * self::MARGIN_RATIO);
        $innerAdvance = max(1, $advanceDots - 2 * $advanceMargin);
        $innerStack = max(1, $stackDots - 2 * $stackMargin);

        // Le nom du produit réserve toujours 2 lignes (comme avant) — ^FB n'utilise la seconde
        // que si le texte déborde de la première, donc un nom court ne gaspille rien.
        $lineCount = 1 + 2 + 1 + ($dlcLine ? 1 : 0);
        $lineSlot = (int) floor($innerStack / $lineCount);

        $titleFont = self::fitFont($title, $innerAdvance, $lineSlot);
        $nameFont = self::fitFont($product, $innerAdvance, $lineSlot, perLine: 2);
        $dateFont = self::fitFont($dateLine, $innerAdvance, $lineSlot);

        $lines = [
            '^XA',
            '^CI28',
            "^PW{$physicalWidthDots}",
            "^LL{$physicalHeightDots}",
        ];

        if ($rotate90) {
            $lines[] = '^FWR';
        }

        // `^FB` est indispensable sur CHAQUE champ, pas seulement le nom du produit : un `^FD`
        // seul n'a aucune limite de longueur et déborderait sur le champ suivant si le texte est
        // un peu long. `^FB` le contraint à sa tranche le long de l'axe d'avance.
        $stackPos = $stackMargin;
        $lines[] = "^CF0,{$titleFont}";
        $lines[] = '^FO' . self::fo($rotate90, $stackPos, $advanceMargin) . "^FB{$innerAdvance},1,0,L,0^FD{$title}^FS";
        $stackPos += $lineSlot;

        $lines[] = "^CF0,{$nameFont}";
        $lines[] = '^FO' . self::fo($rotate90, $stackPos, $advanceMargin) . "^FB{$innerAdvance},2,2,L,0^FD{$product}^FS";
        $stackPos += $lineSlot * 2;

        $lines[] = "^CF0,{$dateFont}";
        $lines[] = '^FO' . self::fo($rotate90, $stackPos, $advanceMargin) . "^FB{$innerAdvance},1,0,L,0^FD{$dateLine}^FS";
        $stackPos += $lineSlot;

        if ($dlcLine) {
            $dlcFont = self::fitFont($dlcLine, $innerAdvance, $lineSlot);
            $lines[] = "^CF0,{$dlcFont}";
            $lines[] = '^FO' . self::fo($rotate90, $stackPos, $advanceMargin) . "^FB{$innerAdvance},1,0,L,0^FD{$dlcLine}^FS";
        }

        $lines[] = '^PQ' . max(1, $quantity);
        $lines[] = '^XZ';

        return implode("\n", $lines);
    }

    /**
     * Plus grande taille de police (en dots) qui tient à la fois dans la hauteur allouée et dans
     * la largeur disponible pour `$text` — jamais en dessous de MIN_FONT_DOTS. `$perLine` répartit
     * le texte sur plusieurs lignes pour le calcul de largeur (ex. 2 pour le nom du produit, dont
     * le ^FB fait le retour à la ligne réel ; on ne fait qu'estimer une répartition à peu près
     * égale pour dimensionner la police).
     */
    private static function fitFont(string $text, int $maxWidthDots, int $maxHeightDots, int $perLine = 1): int
    {
        $charsPerLine = max(1, (int) ceil(mb_strlen($text) / $perLine));
        $widthFit = (int) floor($maxWidthDots / ($charsPerLine * self::CHAR_WIDTH_RATIO));

        return max(self::MIN_FONT_DOTS, min($maxHeightDots, $widthFit));
    }

    /**
     * `^FO` reste toujours en coordonnées physiques (x = axe ^PW, y = axe ^LL) — `^FWR` ne change
     * que le sens d'écriture du texte, jamais le repère. `$stackPos` (position le long de l'axe
     * perpendiculaire au texte) va donc en x si pivoté, en y sinon ; `$advanceMargin` (constant,
     * marge avant le début du texte) prend l'autre axe.
     */
    private static function fo(bool $rotate90, int $stackPos, int $advanceMargin): string
    {
        return $rotate90 ? "{$stackPos},{$advanceMargin}" : "{$advanceMargin},{$stackPos}";
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
