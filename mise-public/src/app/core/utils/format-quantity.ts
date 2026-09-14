/** Unités de base pouvant être affichées dans une sous-unité plus lisible en dessous de 1. */
const CONVERTIBLE_UNITS: Record<string, { unit: string; factor: number }> = {
  kg: { unit: 'g', factor: 1000 },
  L: { unit: 'mL', factor: 1000 },
};

/**
 * Formate une quantité avec son unité, en basculant automatiquement vers la sous-unité
 * (kg → g, L → mL) quand la quantité est inférieure à 1, pour éviter d'afficher des
 * valeurs comme "0.01 kg" à la place de "10 g".
 */
export function formatQuantity(quantity: number, unit: string): string {
  const conversion = CONVERTIBLE_UNITS[unit];

  if (conversion && Math.abs(quantity) < 1) {
    return `${formatNumber(quantity * conversion.factor, 0)} ${conversion.unit}`;
  }

  return `${formatNumber(quantity, 2)} ${unit}`;
}

function formatNumber(value: number, maxFractionDigits: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: maxFractionDigits });
}
