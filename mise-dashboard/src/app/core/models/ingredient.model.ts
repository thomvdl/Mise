import { Allergen } from './allergen.model';
import { Picture } from './picture.model';
import { IngredientCategory } from './ingredient-category.model';

/** `price` is an un-cast Laravel decimal column, so it arrives as a string. */
export interface Ingredient {
  id: number;
  name: string;
  slug: string;
  unit: string;
  price: string | null;
  ingredient_category_id: number | null;
  category?: IngredientCategory | null;
  allergens?: Allergen[];
  pictures?: Picture[];
}

/** Payload shape expected by POST/PATCH /api/ingredients. */
export interface IngredientPayload {
  name: string;
  slug: string;
  unit: string;
  price: number | null;
  ingredient_category_id: number | null;
  allergen_ids: number[];
  pictures: string[];
}
