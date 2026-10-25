<?php

namespace App\Services;

use App\Models\FicheTechnique;

/**
 * Génère le ticket ESC/POS d'une fiche technique, à poser sur le plan de travail pendant la
 * prépa — un pense-bête de cuisine, pas un remplacement de la page "Voir"/PDF (ingrédients,
 * étapes, pas de coût ni de photos : sans intérêt sur un rouleau thermique). Texte brut avec
 * quelques mises en forme (gras, taille), protocole ESC/POS — différent du ZPL des étiquettes
 * Zebra (voir ZplLabelBuilder), imprimante différente (ticket continu, pas un support découpé).
 */
class EscposFicheTechniqueBuilder
{
    private const ESC = "\x1B";

    private const GS = "\x1D";

    private const INIT = self::ESC.'@';

    private const BOLD_ON = self::ESC.'E'."\x01";

    private const BOLD_OFF = self::ESC.'E'."\x00";

    private const ALIGN_LEFT = self::ESC.'a'."\x00";

    private const ALIGN_CENTER = self::ESC.'a'."\x01";

    private const SIZE_NORMAL = self::GS.'!'."\x00";

    // Double largeur + double hauteur (bits haut/bas de l'octet de taille ESC/POS standard).
    private const SIZE_DOUBLE = self::GS.'!'."\x11";

    // Avance le papier de quelques lignes avant de couper, pour que le texte ne reste pas coincé
    // sous la lame (GS V 0 = coupe totale — supportée par la quasi-totalité des tickets Epson,
    // contrairement à GS V 1 "coupe partielle" qui dépend du modèle).
    private const CUT = "\n\n\n".self::GS.'V'."\x00";

    /**
     * Sélectionne la table de caractères Windows-1252 (n°16 chez Epson, `ESC t 16`) plutôt que
     * l'une des tables PC850/PC858 habituelles en ESC/POS : elle couvre tous les accents
     * français ET se produit depuis de l'UTF-8 avec un simple iconv côté PHP (voir encode()),
     * contrairement aux tables PC* qui demandent une table de correspondance maison.
     */
    private const SELECT_CODEPAGE = self::ESC.'t'."\x10";

    /** Nombre de caractères par ligne selon la largeur de rouleau — valeurs usuelles des tickets
     * Epson en police A (voir EscposPrinter/Printer::paper_width_mm, réglé dans Paramètres). */
    private const CHARS_PER_LINE = [58 => 32, 80 => 48];

    private const DEFAULT_CHARS_PER_LINE = 48;

    /** Sous-unités d'affichage en dessous de 1 — même table que `smallUnitFor()` côté dashboard
     * (format-quantity.ts), dupliquée ici car ce générateur ESC/POS est un pur service API sans
     * accès au code front. */
    private const SMALL_UNITS = [
        'kg' => ['unit' => 'g', 'factor' => 1000],
        'L' => ['unit' => 'mL', 'factor' => 1000],
    ];

    /**
     * `$servings` est le nombre de portions demandé pour CE tirage (peut différer de
     * `$fiche->servings`, la base de la fiche) — toutes les quantités sont mises à l'échelle en
     * conséquence, comme le dial +/- des pages "Voir" dashboard/public.
     */
    public static function build(FicheTechnique $fiche, float $servings, ?int $paperWidthMm = null): string
    {
        $charsPerLine = self::CHARS_PER_LINE[$paperWidthMm] ?? self::DEFAULT_CHARS_PER_LINE;
        $scale = $fiche->servings > 0 ? $servings / $fiche->servings : 1;

        $out = self::INIT.self::SELECT_CODEPAGE;

        $out .= self::ALIGN_CENTER.self::BOLD_ON.self::SIZE_DOUBLE;
        $out .= self::wrap($fiche->name, $charsPerLine);
        $out .= self::SIZE_NORMAL.self::BOLD_OFF;

        if ($fiche->station) {
            $out .= self::wrap($fiche->station->name, $charsPerLine);
        }
        $out .= self::wrap(self::formatServings($servings), $charsPerLine);
        $out .= self::ALIGN_LEFT;
        $out .= self::rule($charsPerLine);

        if (! empty($fiche->equipment)) {
            $out .= self::section('MATÉRIEL');
            foreach ($fiche->equipment as $item) {
                $out .= self::wrap('- '.$item, $charsPerLine, 2);
            }
            $out .= self::rule($charsPerLine);
        }

        $out .= self::section('INGRÉDIENTS');
        $out .= self::ingredientLines($fiche, $scale, $charsPerLine);
        $out .= self::rule($charsPerLine);

        if ($fiche->mise_en_place) {
            $out .= self::section('MISE EN PLACE');
            $out .= self::wrap($fiche->mise_en_place, $charsPerLine);
            $out .= self::rule($charsPerLine);
        }

        $out .= self::section('ÉTAPES');
        foreach ($fiche->steps as $step) {
            $prefix = "{$step->position}. ";
            $out .= self::wrap($prefix.$step->instruction, $charsPerLine, mb_strlen($prefix));
            if ($step->timer_minutes) {
                $out .= self::wrap('   -> '.$step->timer_minutes.' min', $charsPerLine);
            }
        }

        if ($fiche->plating) {
            $out .= self::rule($charsPerLine);
            $out .= self::section('DRESSAGE');
            $out .= self::wrap($fiche->plating, $charsPerLine);
        }

        if ($fiche->chef_tip) {
            $out .= self::rule($charsPerLine);
            $out .= self::section('CONSEIL DU CHEF');
            $out .= self::wrap($fiche->chef_tip, $charsPerLine);
        }

        if ($fiche->haccp) {
            $out .= self::rule($charsPerLine);
            $out .= self::section('HACCP');
            $out .= self::wrap($fiche->haccp, $charsPerLine);
        }

        if ($fiche->conservation) {
            $out .= self::rule($charsPerLine);
            $out .= self::section('CONSERVATION');
            $out .= self::wrap($fiche->conservation, $charsPerLine);
        }

        $allergens = self::allergenCodes($fiche);
        if ($allergens) {
            $out .= self::rule($charsPerLine);
            $out .= self::wrap('Allergènes : '.implode(', ', $allergens), $charsPerLine);
        }

        $out .= self::CUT;

        return $out;
    }

    private static function section(string $title): string
    {
        return self::BOLD_ON.self::encode($title)."\n".self::BOLD_OFF;
    }

    private static function rule(int $charsPerLine): string
    {
        return self::encode(str_repeat('-', $charsPerLine))."\n";
    }

    /**
     * Ingrédients directs regroupés par `group_label` (comme les pages "Voir" dashboard/public),
     * puis fiches-composants listées à part avec leur multiplicateur mis à l'échelle — un seul
     * niveau, pas de recalcul récursif dans leurs propres ingrédients (même limite que le calcul
     * de coût, voir CONTEXT.md "Food cost par fiche technique" : le ticket resterait illisible à
     * tout développer, et la fiche composant a son propre ticket si besoin).
     */
    private static function ingredientLines(FicheTechnique $fiche, float $scale, int $charsPerLine): string
    {
        $out = '';
        $groups = [];

        foreach ($fiche->ingredients as $ingredient) {
            $label = $ingredient->pivot->group_label ?: '';
            $groups[$label][] = $ingredient;
        }

        foreach ($groups as $label => $ingredients) {
            if ($label !== '') {
                $out .= self::wrap(self::encode($label).':', $charsPerLine);
            }
            foreach ($ingredients as $ingredient) {
                $quantity = self::formatQuantity($ingredient->pivot->quantity * $scale, $ingredient->unit);
                $out .= self::wrap("- {$ingredient->name} — {$quantity}", $charsPerLine, 2);
            }
        }

        foreach ($fiche->components as $component) {
            $quantity = round($component->pivot->quantity * $scale, 2);
            $out .= self::wrap("- {$component->name} (fiche à part) × {$quantity}", $charsPerLine, 2);
        }

        return $out;
    }

    /** Allergènes des ingrédients DIRECTS uniquement (pas ceux des fiches-composants) — même
     * simplification qu'ailleurs dans l'app, voir enrich-fiche-technique.ts côté dashboard. */
    private static function allergenCodes(FicheTechnique $fiche): array
    {
        $codes = [];
        foreach ($fiche->ingredients as $ingredient) {
            foreach ($ingredient->allergens as $allergen) {
                $codes[$allergen->code] = true;
            }
        }

        return array_keys($codes);
    }

    private static function formatServings(float $servings): string
    {
        $formatted = rtrim(rtrim(number_format($servings, 2, ',', ''), '0'), ',');

        return 'Pour '.($formatted === '' ? '0' : $formatted).' portions';
    }

    /** Port de `formatQuantity()` (format-quantity.ts côté dashboard) : bascule vers la
     * sous-unité (kg -> g, L -> mL) sous 1, pour éviter "0,01 kg" à la place de "10 g". */
    private static function formatQuantity(float $quantity, string $unit): string
    {
        $conversion = self::SMALL_UNITS[$unit] ?? null;

        if ($conversion && abs($quantity) < 1) {
            $value = round($quantity * $conversion['factor']);

            return "{$value} {$conversion['unit']}";
        }

        $formatted = rtrim(rtrim(number_format($quantity, 2, ',', ''), '0'), ',');

        return ($formatted === '' ? '0' : $formatted).' '.$unit;
    }

    /**
     * Retour à la ligne manuel (pas `wordwrap()`, pas mb-safe — casserait un mot accentué en
     * plein milieu d'un caractère UTF-8 multi-octets) avec indentation en continuation (`$indent`)
     * pour que les lignes suivantes d'une étape numérotée s'alignent sous le texte, pas sous le
     * numéro.
     */
    private static function wrap(string $text, int $width, int $indent = 0): string
    {
        $words = preg_split('/\s+/u', trim($text)) ?: [];
        $contWidth = max(1, $width - $indent);
        $pad = str_repeat(' ', $indent);

        $lines = [];
        $current = '';

        foreach ($words as $word) {
            $limit = $lines === [] ? $width : $contWidth;
            $candidate = $current === '' ? $word : $current.' '.$word;

            if (mb_strlen($candidate) > $limit && $current !== '') {
                $lines[] = $current;
                $current = $word;
            } else {
                $current = $candidate;
            }
        }
        if ($current !== '') {
            $lines[] = $current;
        }

        $out = '';
        foreach ($lines as $i => $line) {
            $prefix = $i === 0 ? '' : $pad;
            $out .= self::encode($prefix.$line)."\n";
        }

        return $out === '' ? "\n" : $out;
    }

    /** UTF-8 -> Windows-1252 (voir SELECT_CODEPAGE) ; `//TRANSLIT` rapproche un caractère non
     * représentable plutôt que de le faire disparaître silencieusement ou planter la conversion. */
    private static function encode(string $text): string
    {
        $converted = @iconv('UTF-8', 'Windows-1252//TRANSLIT', $text);

        return $converted !== false ? $converted : preg_replace('/[^\x20-\x7E]/', '?', $text);
    }
}
