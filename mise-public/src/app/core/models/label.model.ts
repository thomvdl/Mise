export interface LabelType {
  key: string;
  title: string;
  /**
   * Suggested shelf-life in days, used to pre-fill (and auto-recompute) the "DLC" — the
   * date after which the product shouldn't be used. Purely a starting point: always editable,
   * and not a food-safety authority — the establishment's own PMS (plan de maîtrise sanitaire)
   * governs the real duration. `undefined` = no DLC suggested for this type (e.g. frozen
   * storage, or disposal itself has no forward-looking date).
   */
  defaultShelfLifeDays?: number;
}

export const LABEL_TYPES: LabelType[] = [
  { key: 'ouvert', title: 'Ouvert le' },
  { key: 'produit', title: 'Produit le', defaultShelfLifeDays: 3 },
  { key: 'congele', title: 'Congelé le' },
  { key: 'decongele', title: 'Décongelé le', defaultShelfLifeDays: 2 },
  { key: 'jeter', title: 'Jeter le', defaultShelfLifeDays: 3 },
];

export interface QueuedLabel {
  id: number;
  type: LabelType;
  productName: string;
  date: string;
  /** ISO date (YYYY-MM-DD) after which the product shouldn't be used, or `null` if not tracked. */
  useByDate: string | null;
  /** Number of physical copies of this same label to print (1-10). */
  quantity: number;
  /** Name of the user who composed this label — captured at queue time, not print time, so it
   *  still reflects who actually made it if the account in use changes before printing. */
  madeBy: string;
}

