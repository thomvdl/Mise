import { Category } from './category.model';
import { Station } from './station.model';
import { Ingredient } from './ingredient.model';
import { Step, StepPayload } from './step.model';
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
  /** Sous-recettes utilisées par cette fiche (ex. "Fond brun" dans un "Bœuf bourguignon"). */
  components?: FicheTechniqueComponent[];
  /** Autres fiches qui utilisent celle-ci comme composant — pour savoir où une recette de base sert. */
  used_in?: FicheTechniqueComponent[];
}

/** Une fiche utilisée comme composant d'une autre. `pivot.quantity` est une fraction/un multiple
 * de la recette de base du composant (0.5 = une demi-préparation), pas une masse/un volume absolu. */
export interface FicheTechniqueComponent extends FicheTechnique {
  pivot: { quantity: string; group_label: string | null };
}

/** Payload shape expected by POST/PATCH /api/fiche-techniques. */
export interface FicheTechniquePayload {
  name: string;
  slug: string;
  category_id: number | null;
  station_id: number | null;
  servings: number;
  difficulty: Difficulty;
  description: string | null;
  equipment: string[];
  mise_en_place: string | null;
  plating: string | null;
  chef_tip: string | null;
  haccp: string | null;
  conservation: string | null;
  ingredients: { ingredient_id: number; quantity: number; group_label: string | null }[];
  steps: StepPayload[];
  components: { component_fiche_technique_id: number; quantity: number; group_label: string | null }[];
}
