export interface UnitConversion {
  unit: string;
  factor: number;
}

/** Unités de base pouvant être exprimées dans une sous-unité plus lisible en dessous de 1. */
const CONVERTIBLE_UNITS: Record<string, UnitConversion> = {
  kg: { unit: 'g', factor: 1000 },
  L: { unit: 'mL', factor: 1000 },
};

/** La sous-unité d'affichage/saisie d'une unité de base (ex. "kg" → { unit: "g", factor: 1000 }), ou null si elle n'a pas de sous-unité (pièce, c. à café…). */
export function smallUnitFor(baseUnit: string): UnitConversion | null {
  return CONVERTIBLE_UNITS[baseUnit] ?? null;
}

/**
 * Formate une quantité avec son unité, en basculant automatiquement vers la sous-unité
 * (kg → g, L → mL) quand la quantité est inférieure à 1, pour éviter d'afficher des
 * valeurs comme "0.01 kg" à la place de "10 g".
 */
export function formatQuantity(quantity: number, unit: string): string {
  const conversion = smallUnitFor(unit);

  if (conversion && Math.abs(quantity) < 1) {
    return `${formatNumber(quantity * conversion.factor, 0)} ${conversion.unit}`;
  }

  return `${formatNumber(quantity, 2)} ${unit}`;
}

function formatNumber(value: number, maxFractionDigits: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: maxFractionDigits });
}
