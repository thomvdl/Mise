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

/**
 * Curated subset of Brother's real DK consumables (die-cut labels and continuous rolls) —
 * the rectangular, single-colour ones, which is what a two-column name/date design fits.
 * `id` matches the registry id in `@thermal-label/brother-ql-core`'s media list; `heightMm`
 * is omitted for continuous rolls, which cut to whatever length the caller asks for.
 */
export interface LabelFormat {
  id: number;
  name: string;
  widthMm: number;
  heightMm?: number;
}

export const LABEL_FORMATS: LabelFormat[] = [
  { id: 275, name: '62 × 100 mm — DK-11202', widthMm: 62, heightMm: 100 },
  { id: 274, name: '62 × 29 mm — DK-11209', widthMm: 62, heightMm: 29 },
  { id: 271, name: '29 × 90 mm — DK-11201', widthMm: 29, heightMm: 90 },
  { id: 272, name: '38 × 90 mm — DK-11218', widthMm: 38, heightMm: 90 },
  { id: 367, name: '39 × 48 mm — DK-11219', widthMm: 39, heightMm: 48 },
  { id: 270, name: '17 × 87 mm — DK-11203', widthMm: 17, heightMm: 87 },
  { id: 269, name: '17 × 54 mm — DK-11204', widthMm: 17, heightMm: 54 },
  { id: 365, name: '102 × 51 mm — DK-11240', widthMm: 102, heightMm: 51 },
  { id: 366, name: '102 × 152 mm — DK-11241', widthMm: 102, heightMm: 152 },
  { id: 259, name: '62 mm continu — DK-22205', widthMm: 62 },
  { id: 258, name: '29 mm continu — DK-22210', widthMm: 29 },
  { id: 264, name: '38 mm continu — DK-22225', widthMm: 38 },
  { id: 262, name: '50 mm continu — DK-22246', widthMm: 50 },
  { id: 261, name: '54 mm continu — DK-N55224', widthMm: 54 },
  { id: 260, name: '102 mm continu — DK-22243', widthMm: 102 },
  { id: 257, name: '12 mm continu — DK-22214', widthMm: 12 },
];
