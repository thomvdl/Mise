import { FicheTechnique } from '../models/fiche-technique.model';
import { Ingredient } from '../models/ingredient.model';
import { Allergen } from '../models/allergen.model';

/**
 * `FicheTechniqueController` eager-loads `ingredients` but not `ingredients.allergens`,
 * so allergens are cross-referenced client-side from the full `/ingredients` list.
 */
export function enrichFicheTechnique(
  fiche: FicheTechnique,
  ingredientsById: Map<number, Ingredient>,
): FicheTechnique {
  if (!fiche.ingredients?.length) {
    return fiche;
  }

  return {
    ...fiche,
    ingredients: fiche.ingredients.map((ingredient) => ({
      ...ingredient,
      allergens: ingredientsById.get(ingredient.id)?.allergens ?? ingredient.allergens ?? [],
    })),
  };
}

export function uniqueAllergens(fiche: FicheTechnique): Allergen[] {
  const seen = new Map<number, Allergen>();

  for (const ingredient of fiche.ingredients ?? []) {
    for (const allergen of ingredient.allergens ?? []) {
      seen.set(allergen.id, allergen);
    }
  }

  return [...seen.values()];
}
