/** Shared shape for the 4 "name/slug/color" resources (categories, stations, allergens, ingredient-categories). */
export interface SimpleEntity {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  code?: string;
}
