export interface SimpleEntityField {
  key: 'name' | 'slug' | 'code' | 'color';
  label: string;
  type: 'text' | 'color';
  required: boolean;
}

export interface SimpleEntityConfig {
  resource: string;
  label: string;
  singularLabel: string;
  fields: SimpleEntityField[];
}

const NAME_SLUG_COLOR_FIELDS: SimpleEntityField[] = [
  { key: 'name', label: 'Nom', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true },
  { key: 'color', label: 'Couleur', type: 'color', required: false },
];

export const categoryConfig: SimpleEntityConfig = {
  resource: 'categories',
  label: 'Catégories',
  singularLabel: 'cette catégorie',
  fields: NAME_SLUG_COLOR_FIELDS,
};

export const stationConfig: SimpleEntityConfig = {
  resource: 'stations',
  label: 'Stations',
  singularLabel: 'cette station',
  fields: NAME_SLUG_COLOR_FIELDS,
};

export const ingredientCategoryConfig: SimpleEntityConfig = {
  resource: 'ingredient-categories',
  label: "Catégories d'ingrédients",
  singularLabel: "cette catégorie d'ingrédient",
  fields: NAME_SLUG_COLOR_FIELDS,
};

export const allergenConfig: SimpleEntityConfig = {
  resource: 'allergens',
  label: 'Allergènes',
  singularLabel: 'cet allergène',
  fields: [
    { key: 'name', label: 'Nom', type: 'text', required: true },
    { key: 'slug', label: 'Slug', type: 'text', required: true },
    { key: 'code', label: 'Code', type: 'text', required: true },
    { key: 'color', label: 'Couleur', type: 'color', required: false },
  ],
};
