import { Category } from './category.model';
import { Station } from './station.model';
import { Ingredient } from './ingredient.model';
import { Step } from './step.model';
import { Picture } from './picture.model';

export interface FicheTechniqueIngredient extends Ingredient {
  /** `quantity` is an un-cast Laravel decimal pivot column, so it arrives as a string. */
  pivot: { quantity: string; group_label: string | null };
}

export type Difficulty = 1 | 2 | 3;

export interface FicheTechnique {
  id: number;
  name: string;
  slug: string;
  category_id: number | null;
  station_id: number | null;
  servings: number;
  difficulty: Difficulty;
  description: string | null;
  equipment: string[] | null;
  mise_en_place: string | null;
  plating: string | null;
  chef_tip: string | null;
  haccp: string | null;
  conservation: string | null;
  category?: Category | null;
  station?: Station | null;
  ingredients?: FicheTechniqueIngredient[];
  steps?: Step[];
  pictures?: Picture[];
}
