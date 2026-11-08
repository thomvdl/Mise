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

/**
 * Allergènes d'une fiche, **sous-recettes comprises** à toutes les profondeurs — une béarnaise
 * utilisée comme composant apporte ses œufs et son beurre. Les allergènes de chaque ingrédient
 * sont repris de `ingredientsById` (liste complète des ingrédients) quand elle est fournie, ceux
 * d'un composant de `fichesById` (l'API ne charge qu'un niveau, `components.ingredients`). Une
 * boucle (A utilise B qui utilise A) est ignorée.
 */
export function uniqueAllergens(
  fiche: FicheTechnique,
  fichesById: Map<number, FicheTechnique> = new Map(),
  ingredientsById: Map<number, Ingredient> = new Map(),
): Allergen[] {
  const seen = new Map<number, Allergen>();

  const visit = (current: FicheTechnique, path: Set<number>): void => {
    if (path.has(current.id)) return;
    const nextPath = new Set(path).add(current.id);

    for (const ingredient of current.ingredients ?? []) {
      for (const allergen of ingredientsById.get(ingredient.id)?.allergens ?? ingredient.allergens ?? []) {
        seen.set(allergen.id, allergen);
      }
    }
    for (const component of current.components ?? []) {
      visit(fichesById.get(component.id) ?? component, nextPath);
    }
  };

  visit(fiche, new Set());
  return [...seen.values()];
}
