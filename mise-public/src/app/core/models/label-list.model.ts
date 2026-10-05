/** Une ligne d'une liste enregistrée — pas de date fixe : `date` est toujours celle du jour de
 * l'impression, et la DLC (`use_by_date`) est recalculée à ce moment-là à partir soit de
 * `use_by_offset_days` (J+N propre à cette ligne), soit — si non renseigné — du décalage par
 * défaut du type choisi (voir LABEL_TYPES et LabelLists.addSelectionToQueue). Une liste reste
 * ainsi utilisable d'une semaine à l'autre plutôt que de figer une DLC qui deviendrait obsolète. */
export interface LabelListItem {
  id?: number;
  type_key: string;
  product_name: string;
  quantity: number;
  use_by_offset_days: number | null;
}

export interface LabelList {
  id: number;
  name: string;
  items: LabelListItem[];
}

export interface LabelListPayload {
  name: string;
  items: { type_key: string; product_name: string; quantity: number; use_by_offset_days: number | null }[];
}
