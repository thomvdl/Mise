import { FicheTechnique, FicheTechniqueIngredient } from '../models/fiche-technique.model';
import { Ingredient } from '../models/ingredient.model';
import { Allergen } from '../models/allergen.model';

export interface ResolvedIngredientLine {
  ingredient: FicheTechniqueIngredient;
  quantity: number;
  lineCost: number | null;
  groupLabel: string | null;
  /** Name of the component sub-recipe this line was pulled from, null for the fiche's own ingredients. */
  sourceFicheName: string | null;
}

/** Sane ceiling on composition depth — a real cycle should already be rejected by the API. */
const MAX_DEPTH = 10;

/**
 * Flattens a fiche's ingredients, recursively expanding component sub-recipes (scaled by their
 * pivot quantity — a fraction/multiple of the component's own base recipe) down to raw
 * ingredients. `fichesById` must hold full FicheTechnique objects (with their own ingredients and
 * components) for anything beyond the one level of `components` the API eager-loads directly on
 * `fiche` — otherwise a component's own sub-components are silently dropped. `visited` guards
 * against a cycle slipping past the API's own validation.
 */
export function resolveIngredientLines(
  fiche: FicheTechnique,
  factor: number,
  fichesById: Map<number, FicheTechnique>,
  ingredientsById: Map<number, Ingredient>,
  context: { groupLabel?: string | null; sourceFicheName?: string | null } = {},
  visited: Set<number> = new Set(),
  depth = 0,
): ResolvedIngredientLine[] {
  if (depth > MAX_DEPTH || visited.has(fiche.id)) return [];

  const nextVisited = new Set(visited).add(fiche.id);
  const groupLabel = context.groupLabel ?? null;
  const sourceFicheName = context.sourceFicheName ?? null;
  const lines: ResolvedIngredientLine[] = [];

  for (const ingredient of fiche.ingredients ?? []) {
    const quantity = Number(ingredient.pivot.quantity) * factor;
    const price = ingredient.price !== null ? Number(ingredient.price) : null;

    lines.push({
      ingredient: {
        ...ingredient,
        allergens: ingredientsById.get(ingredient.id)?.allergens ?? ingredient.allergens ?? [],
      },
      quantity,
      lineCost: price !== null ? price * quantity : null,
      groupLabel: groupLabel ?? ingredient.pivot.group_label,
      sourceFicheName,
    });
  }

  for (const component of fiche.components ?? []) {
    const componentFiche = fichesById.get(component.id) ?? component;
    const componentFactor = factor * Number(component.pivot.quantity);

    lines.push(
      ...resolveIngredientLines(
        componentFiche,
        componentFactor,
        fichesById,
        ingredientsById,
        { groupLabel: component.pivot.group_label ?? groupLabel, sourceFicheName: componentFiche.name },
        nextVisited,
        depth + 1,
      ),
    );
  }

  return lines;
}

export function uniqueAllergensFromLines(lines: ResolvedIngredientLine[]): Allergen[] {
  const seen = new Map<number, Allergen>();

  for (const line of lines) {
    for (const allergen of line.ingredient.allergens ?? []) {
      seen.set(allergen.id, allergen);
    }
  }

  return [...seen.values()];
}
