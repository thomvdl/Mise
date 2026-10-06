<?php

namespace App\Services;

/**
 * Dessine une petite icône monochrome par type d'étiquette (voir LabelTypeController::ICON_KEYS)
 * et l'encode en commande ZPL `^GFA` (bitmap hex ASCII) — pas de fichiers image externes, tout est
 * tracé à la volée avec GD (lignes/polygones/ellipses), donc un seul endroit à modifier pour
 * ajuster ou ajouter une icône.
 *
 * `^GF` n'est PAS affecté par `^FWR` (contrairement au texte, voir ZplLabelBuilder::render()) : la
 * bitmap est pivotée ici même, côté PHP, avant l'encodage, quand l'étiquette est en mode pivoté.
 */
class ZplIconRenderer
{
    /** Renvoie la commande ^GF complète (sans le ^FO qui la positionne) pour une icône carrée de `$sizeDots` de côté. */
    public static function graphicField(string $iconKey, int $sizeDots, bool $rotate90): string
    {
        $size = max(8, $sizeDots);
        $image = imagecreatetruecolor($size, $size);
        $white = imagecolorallocate($image, 255, 255, 255);
        $black = imagecolorallocate($image, 0, 0, 0);
        imagefilledrectangle($image, 0, 0, $size - 1, $size - 1, $white);
        imagesetthickness($image, max(1, (int) round($size * 0.08)));

        self::draw($image, $iconKey, $size, $black);

        if ($rotate90) {
            // Confirmé en test (icône poubelle, asymétrique) : -90 ici place l'icône à l'endroit
            // une fois l'étiquette physiquement tournée pour la lecture — +90 l'affiche à l'envers.
            $rotated = imagerotate($image, -90, $white);
            imagedestroy($image);
            $image = $rotated;
        }

        $zpl = self::toGraphicField($image);
        imagedestroy($image);

        return $zpl;
    }

    private static function draw($image, string $iconKey, int $size, int $black): void
    {
        match ($iconKey) {
            'flocon' => self::drawFlocon($image, $size, $black),
            'poubelle' => self::drawPoubelle($image, $size, $black),
            'production' => self::drawProduction($image, $size, $black),
            'goutte' => self::drawGoutte($image, $size, $black),
            'ouvert' => self::drawOuvert($image, $size, $black),
            default => self::drawGenerique($image, $size, $black),
        };
    }

    /** Flocon : 3 axes croisés (6 branches) avec une petite coche sur chaque branche. */
    private static function drawFlocon($image, int $size, int $black): void
    {
        $cx = $cy = $size / 2;
        $r = $size * 0.42;

        for ($i = 0; $i < 3; $i++) {
            $angle = deg2rad($i * 60);
            $x1 = $cx - cos($angle) * $r;
            $y1 = $cy - sin($angle) * $r;
            $x2 = $cx + cos($angle) * $r;
            $y2 = $cy + sin($angle) * $r;
            imageline($image, (int) $x1, (int) $y1, (int) $x2, (int) $y2, $black);

            foreach ([0.55, -0.55] as $sign) {
                $branchAngle = $angle + $sign;
                foreach ([0.55, 1.0] as $frac) {
                    $bx = $cx + cos($angle) * $r * $frac;
                    $by = $cy + sin($angle) * $r * $frac;
                    $tx = $bx + cos($branchAngle) * $r * 0.22;
                    $ty = $by + sin($branchAngle) * $r * 0.22;
                    imageline($image, (int) $bx, (int) $by, (int) $tx, (int) $ty, $black);
                    $bx2 = $cx - cos($angle) * $r * $frac;
                    $by2 = $cy - sin($angle) * $r * $frac;
                    $tx2 = $bx2 - cos($branchAngle) * $r * 0.22;
                    $ty2 = $by2 - sin($branchAngle) * $r * 0.22;
                    imageline($image, (int) $bx2, (int) $by2, (int) $tx2, (int) $ty2, $black);
                }
            }
        }
    }

    /** Poubelle : corps rectangulaire, couvercle qui dépasse, poignée, deux côtes verticales. */
    private static function drawPoubelle($image, int $size, int $black): void
    {
        $left = $size * 0.26;
        $right = $size * 0.74;
        $top = $size * 0.3;
        $bottom = $size * 0.88;

        imagerectangle($image, (int) $left, (int) $top, (int) $right, (int) $bottom, $black);
        imageline($image, (int) ($size * 0.18), (int) $top, (int) ($size * 0.82), (int) $top, $black);
        imagerectangle($image, (int) ($size * 0.4), (int) ($size * 0.18), (int) ($size * 0.6), (int) $top, $black);
        imageline($image, (int) ($size * 0.4), (int) ($size * 0.42), (int) ($size * 0.4), (int) ($size * 0.76), $black);
        imageline($image, (int) ($size * 0.6), (int) ($size * 0.42), (int) ($size * 0.6), (int) ($size * 0.76), $black);
    }

    /** Production : toque de cuisinier (dôme + bandeau). */
    private static function drawProduction($image, int $size, int $black): void
    {
        imagefilledellipse($image, (int) ($size * 0.5), (int) ($size * 0.38), (int) ($size * 0.6), (int) ($size * 0.5), $black);
        imagefilledrectangle($image, (int) ($size * 0.26), (int) ($size * 0.6), (int) ($size * 0.74), (int) ($size * 0.82), $black);
    }

    /** Décongelé : goutte d'eau (pointe + base arrondie). */
    private static function drawGoutte($image, int $size, int $black): void
    {
        $cx = $size * 0.5;
        imagefilledpolygon($image, [
            (int) $cx, (int) ($size * 0.18),
            (int) ($size * 0.3), (int) ($size * 0.55),
            (int) ($size * 0.7), (int) ($size * 0.55),
        ], $black);
        imagefilledellipse($image, (int) $cx, (int) ($size * 0.6), (int) ($size * 0.46), (int) ($size * 0.46), $black);
    }

    /** Ouvert : boîte avec les deux rabats du dessus ouverts (V de chaque côté). */
    private static function drawOuvert($image, int $size, int $black): void
    {
        imagerectangle($image, (int) ($size * 0.22), (int) ($size * 0.42), (int) ($size * 0.78), (int) ($size * 0.82), $black);
        imageline($image, (int) ($size * 0.22), (int) ($size * 0.42), (int) ($size * 0.3), (int) ($size * 0.16), $black);
        imageline($image, (int) ($size * 0.5), (int) ($size * 0.42), (int) ($size * 0.3), (int) ($size * 0.16), $black);
        imageline($image, (int) ($size * 0.78), (int) ($size * 0.42), (int) ($size * 0.7), (int) ($size * 0.16), $black);
        imageline($image, (int) ($size * 0.5), (int) ($size * 0.42), (int) ($size * 0.7), (int) ($size * 0.16), $black);
    }

    /** Repli générique : une étiquette (tag) avec son trou. */
    private static function drawGenerique($image, int $size, int $black): void
    {
        imagefilledpolygon($image, [
            (int) ($size * 0.2), (int) ($size * 0.3),
            (int) ($size * 0.55), (int) ($size * 0.3),
            (int) ($size * 0.8), (int) ($size * 0.55),
            (int) ($size * 0.55), (int) ($size * 0.8),
            (int) ($size * 0.2), (int) ($size * 0.8),
        ], $black);
        $white = imagecolorallocate($image, 255, 255, 255);
        imagefilledellipse($image, (int) ($size * 0.34), (int) ($size * 0.46), (int) ($size * 0.12), (int) ($size * 0.12), $white);
    }

    /** Convertit une image GD en commande `^GFA,<total>,<total>,<bytesPerRow>,<hex>`. */
    private static function toGraphicField($image): string
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $bytesPerRow = (int) ceil($width / 8);

        $hex = '';
        for ($y = 0; $y < $height; $y++) {
            $bits = '';
            for ($x = 0; $x < $width; $x++) {
                $rgb = imagecolorsforindex($image, imagecolorat($image, $x, $y));
                $bits .= $rgb['red'] < 128 ? '1' : '0';
            }
            $bits = str_pad($bits, $bytesPerRow * 8, '0', STR_PAD_RIGHT);
            for ($b = 0; $b < $bytesPerRow; $b++) {
                $hex .= str_pad(dechex(bindec(substr($bits, $b * 8, 8))), 2, '0', STR_PAD_LEFT);
            }
        }

        $totalBytes = $bytesPerRow * $height;

        return "^GFA,{$totalBytes},{$totalBytes},{$bytesPerRow},{$hex}";
    }
}
