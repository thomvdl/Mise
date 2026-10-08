<?php

namespace App\Services;

/**
 * Génère le ZPL des étiquettes imprimées depuis Mise. Résolution (dpi) et taille du support (mm)
 * sont paramétrables (voir settings `printer_dpi`/`label_width_mm`/`label_height_mm`, réglables
 * dans Paramètres → Impression d'étiquettes). La mise en page ne suit pas des ratios figés
 * calibrés sur un seul format : chaque ligne est dimensionnée dynamiquement pour remplir l'espace
 * disponible (hauteur ET largeur) sans déborder, quel que soit le format de support chargé —
 * indispensable dès que deux formats très différents (ex. 57x32mm en paysage, 38x89mm pivoté)
 * doivent cohabiter sans recalibrage manuel.
 *
 * Deux formats de contenu partagent le même moteur de rendu (`render()`) :
 * - `build()` : étiquette HACCP (nom du produit, type -> date, DLC -> date, utilisateur).
 * - `buildEventLabel()` : étiquette d'événement du calendrier (nom, pax, date).
 */
class ZplLabelBuilder
{
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

    /**
     * Étiquette HACCP, dans l'ordre : nom du produit (sur 2 lignes max), type d'étiquette -> date,
     * DLC -> date si applicable, puis le nom de l'utilisateur connecté qui imprime. `$title` et
     * `$iconKey` viennent du `LabelType` résolu par le contrôleur (table `label_types`,
     * configurable — voir LabelTypeController) : ce service reste un pur générateur ZPL à partir
     * de primitives, sans dépendance Eloquent.
     */
    public static function build(
        string $title,
        string $productName,
        string $date,
        ?string $useByDate,
        int $quantity,
        int $dpi = 203,
        float $widthMm = 57,
        float $heightMm = 32,
        bool $rotate90 = false,
        ?string $userName = null,
        ?string $iconKey = null,
        float $topOffsetMm = 0,
    ): string {
        $typeLine = $title . ' -> ' . self::formatDate($date);
        $dlcLine = $useByDate ? 'DLC -> ' . self::formatDate($useByDate) : null;

        $fields = [
            ['text' => self::sanitize($productName), 'lines' => 2],
            ['text' => $typeLine, 'lines' => 1, 'icon' => $iconKey],
        ];

        if ($dlcLine) {
            $fields[] = ['text' => $dlcLine, 'lines' => 1];
        }

        if ($userName) {
            $fields[] = ['text' => self::sanitize($userName), 'lines' => 1];
        }

        return self::render($widthMm, $heightMm, $dpi, $rotate90, $fields, $quantity, $topOffsetMm);
    }

    /**
     * Étiquette d'événement du calendrier, dans l'ordre : nom de l'événement (sur 2 lignes max),
     * nombre de pax si renseigné, puis la date de l'événement. Toujours imprimée en un seul
     * exemplaire — pas de notion de quantité pour ce type d'étiquette.
     */
    public static function buildEventLabel(
        string $name,
        ?int $pax,
        string $date,
        int $dpi = 203,
        float $widthMm = 57,
        float $heightMm = 32,
        bool $rotate90 = false,
        float $topOffsetMm = 0,
    ): string {
        $fields = [
            ['text' => self::sanitize($name), 'lines' => 2],
        ];

        if ($pax !== null) {
            $fields[] = ['text' => "{$pax} pax", 'lines' => 1];
        }

        $fields[] = ['text' => 'Le : ' . self::formatDate($date), 'lines' => 1];

        return self::render($widthMm, $heightMm, $dpi, $rotate90, $fields, 1, $topOffsetMm);
    }

    /**
     * Moteur de rendu commun : place une liste de champs (texte + nombre de lignes réservées) en
     * les empilant pour remplir l'espace disponible, police dimensionnée au cas par cas.
     *
     * ^PW/^LL restent calés sur le support physique (largeur = ce que la tête d'impression peut
     * couvrir, fixé par le rouleau chargé) — seule la mise en page tourne de 90°, pas le sens de
     * défilement du papier, qui ne se change pas en logiciel.
     *
     * Sous `^FWR`, le texte d'un champ avance toujours le long de l'axe Y physique (quel que soit
     * son origine ^FO) — ^FO ne change pas de repère, seul le sens d'écriture du texte pivote. Du
     * coup les champs successifs doivent être espacés le long de l'axe X physique (perpendiculaire
     * au texte), pas Y, sous peine de se chevaucher tous au même endroit (vécu en test). Sans
     * rotation c'est l'inverse : le texte avance en X, les champs s'espacent en Y — le repère
     * "normal" de n'importe quelle étiquette.
     *
     * Et sous rotation, le sens de lecture physique (une fois l'étiquette tournée) va du X
     * physique le plus GRAND vers le plus PETIT — l'inverse du sens normal (constaté en test : en
     * empilant les champs par X croissant, l'ordre lu était inversé). Le premier champ de `$fields`
     * est donc placé au bout le plus loin de la marge sous rotation, et au début sinon.
     *
     * Un champ peut porter une `icon` (clé reconnue par ZplIconRenderer) : elle est dessinée en
     * carré occupant toute la tranche déjà allouée au champ (`$lineSlot`), au tout début de l'axe
     * d'avance, et le texte du champ démarre juste après (budget de largeur réduit d'autant).
     *
     * `$topOffsetMm` compense une zone morte mécanique mesurée sur l'imprimante (tête/capteur de
     * gap décalés physiquement) — rien à voir avec `^LT`/`zpl.label_top` côté firmware (déjà à 0,
     * vérifié) ni avec la marge de mise en page ci-dessus : c'est un trou constaté à l'impression
     * (mesuré à ~7,5mm sur la Zebra ZD410 en 57x32mm non pivoté, via une étiquette graduée).
     * **Ne PAS utiliser `^LT` pour ça** (testé, revert délibéré) : `^LT` décale le point de départ
     * de l'impression sur le défilement papier lui-même, pas juste dans la fenêtre `^LL` existante
     * — le contenu déborde alors sur l'étiquette suivante (vu en test : 2 étiquettes imprimées,
     * décalées, pour UNE demandée). On réduit donc simplement la marge de DÉBUT (uniquement le
     * début, pas la marge symétrique) sur l'axe `^LL` (hauteur physique, qui est l'axe
     * d'empilement en mode normal et l'axe d'avance du texte en mode pivoté — `^FWR` ne pivote que
     * le sens d'écriture, jamais le sens de défilement du papier, voir plus haut) : le contenu
     * reste dans la même fenêtre `^LL`, juste repoussé après la zone morte.
     *
     * @param  array<int, array{text: string, lines: int, icon?: ?string}>  $fields
     */
    private static function render(
        float $widthMm,
        float $heightMm,
        int $dpi,
        bool $rotate90,
        array $fields,
        int $quantity,
        float $topOffsetMm = 0,
    ): string {
        $dotsPerMm = $dpi / 25.4;
        $physicalWidthDots = (int) round($widthMm * $dotsPerMm);
        $physicalHeightDots = (int) round($heightMm * $dotsPerMm);
        $topOffsetDots = (int) round($topOffsetMm * $dotsPerMm);
        $stackDots = $rotate90 ? $physicalWidthDots : $physicalHeightDots;
        $advanceDots = $rotate90 ? $physicalHeightDots : $physicalWidthDots;

        $stackMargin = (int) round($stackDots * self::MARGIN_RATIO);
        $advanceMargin = (int) round($advanceDots * self::MARGIN_RATIO);
        $stackStartMargin = $stackMargin + (! $rotate90 ? $topOffsetDots : 0);
        $advanceStartMargin = $advanceMargin + ($rotate90 ? $topOffsetDots : 0);
        $innerAdvance = max(1, $advanceDots - $advanceStartMargin - $advanceMargin);
        $innerStack = max(1, $stackDots - $stackStartMargin - $stackMargin);

        $lineCount = max(1, array_sum(array_column($fields, 'lines')));
        $lineSlot = (int) floor($innerStack / $lineCount);

        $lines = [
            '^XA',
            '^CI28',
            "^PW{$physicalWidthDots}",
            "^LL{$physicalHeightDots}",
        ];

        // `^FW` (orientation par défaut des champs) est un réglage qui reste actif sur
        // l'imprimante tant qu'il n'est pas explicitement changé — PAS remis à `N` automatiquement
        // au début de chaque nouveau `^XA`. Toujours l'émettre explicitement (jamais juste en
        // conditionnel sur `rotate90`) : sinon, après un job en 36x89 pivoté (`^FWR`), tous les
        // jobs suivants en 57x32 non pivoté héritaient silencieusement de l'orientation tournée
        // de l'imprimante — vécu en prod (dashboard/public sortaient les étiquettes à 90°, alors
        // que le ZPL généré ne contenait pourtant aucun `^FWR`).
        $lines[] = $rotate90 ? '^FWR' : '^FWN';

        $stackPos = $rotate90 ? ($stackMargin + $innerStack) : $stackStartMargin;
        $next = function (int $slots) use (&$stackPos, $lineSlot, $rotate90): int {
            if ($rotate90) {
                $stackPos -= $slots * $lineSlot;

                return $stackPos;
            }

            $pos = $stackPos;
            $stackPos += $slots * $lineSlot;

            return $pos;
        };

        // `^FB` est indispensable sur CHAQUE champ, pas seulement ceux prévus sur 2 lignes : un
        // `^FD` seul n'a aucune limite de longueur et déborderait sur le champ suivant si le texte
        // est un peu long.
        foreach ($fields as $field) {
            $pos = $next($field['lines']);
            $fieldAdvanceMargin = $advanceStartMargin;
            $fieldInnerAdvance = $innerAdvance;

            if (! empty($field['icon'])) {
                $iconGap = max(4, (int) round($lineSlot * 0.15));
                $lines[] = '^FO' . self::fo($rotate90, $pos, $advanceStartMargin)
                    . ZplIconRenderer::graphicField($field['icon'], $lineSlot, $rotate90);
                $fieldAdvanceMargin = $advanceStartMargin + $lineSlot + $iconGap;
                $fieldInnerAdvance = max(1, $innerAdvance - $lineSlot - $iconGap);
            }

            $font = self::fitFont($field['text'], $fieldInnerAdvance, $lineSlot, $field['lines']);
            $spacing = $field['lines'] > 1 ? 2 : 0;
            $lines[] = "^CF0,{$font}";
            $lines[] = '^FO' . self::fo($rotate90, $pos, $fieldAdvanceMargin)
                . "^FB{$fieldInnerAdvance},{$field['lines']},{$spacing},L,0^FD{$field['text']}^FS";
        }

        $lines[] = '^PQ' . max(1, $quantity);
        $lines[] = '^XZ';

        return implode("\n", $lines);
    }

    /**
     * Plus grande taille de police (en dots) qui tient à la fois dans la hauteur allouée et dans
     * la largeur disponible pour `$text` — jamais en dessous de MIN_FONT_DOTS. `$perLine` répartit
     * le texte sur plusieurs lignes pour le calcul de largeur (ex. 2 pour un champ sur 2 lignes,
     * dont le ^FB fait le retour à la ligne réel ; on ne fait qu'estimer une répartition à peu près
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
