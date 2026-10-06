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
  /** Clé d'icône (voir ICON_KEYS) — `undefined` affiche l'icône générique de repli. */
  iconKey?: string;
}

/** Enregistrement brut tel que renvoyé par `GET /label-types` (voir LabelTypeController côté API). */
export interface LabelTypeRecord {
  id: number;
  key: string;
  name: string;
  jplus_days: number | null;
  icon_key: string | null;
  position: number;
}

export function labelTypeFromRecord(record: LabelTypeRecord): LabelType {
  return {
    key: record.key,
    title: record.name,
    defaultShelfLifeDays: record.jplus_days ?? undefined,
    iconKey: record.icon_key ?? undefined,
  };
}

/** Jeu fixe d'icônes dessinables côté impression (voir ZplIconRenderer/LabelTypeController::ICON_KEYS). */
export const ICON_KEYS = ['flocon', 'poubelle', 'production', 'goutte', 'ouvert', 'generique'] as const;
export type IconKey = (typeof ICON_KEYS)[number];

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

