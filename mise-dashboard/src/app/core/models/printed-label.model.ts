export interface PrintedLabel {
  id: number;
  user_id: number | null;
  user_name: string;
  type_key: string;
  product_name: string;
  date: string;
  use_by_date: string | null;
  quantity: number;
  printed_via: 'browser' | 'brother_ql';
  created_at: string;
}

/** mise-dashboard ne partage pas de code avec mise-public — sous-ensemble des LABEL_TYPES pour l'affichage/le filtre ici. */
export const LABEL_TYPE_TITLES: Record<string, string> = {
  ouvert: 'Ouvert le',
  produit: 'Produit le',
  congele: 'Congelé le',
  decongele: 'Décongelé le',
  jeter: 'Jeter le',
};
