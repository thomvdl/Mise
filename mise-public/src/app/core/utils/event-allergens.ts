import { Allergen } from '../models/allergen.model';
import { FicheTechnique } from '../models/fiche-technique.model';
import { Ingredient } from '../models/ingredient.model';

/**
 * Allergènes d'une fiche technique, **sous-recettes comprises** (à toutes les profondeurs) — une
 * béarnaise utilisée comme composant apporte ses œufs et son beurre au plat. Croisement client
 * comme `enrich-fiche-technique.ts` : l'API ne charge pas `ingredients.allergens`, on les reprend
 * de la liste complète des ingrédients. Une boucle (A utilise B qui utilise A) est ignorée.
 */
export function ficheAllergenIds(
  fiche: FicheTechnique,
  fichesById: Map<number, FicheTechnique>,
  ingredientsById: Map<number, Ingredient>,
  path: Set<number> = new Set(),
): Set<number> {
  const ids = new Set<number>();
  if (path.has(fiche.id)) return ids;
  const nextPath = new Set(path).add(fiche.id);

  for (const ingredient of fiche.ingredients ?? []) {
    for (const allergen of ingredientsById.get(ingredient.id)?.allergens ?? ingredient.allergens ?? []) {
      ids.add(allergen.id);
    }
  }
  for (const component of fiche.components ?? []) {
    const full = fichesById.get(component.id) ?? component;
    for (const id of ficheAllergenIds(full, fichesById, ingredientsById, nextPath)) ids.add(id);
  }
  return ids;
}

export interface PlatAllergenCheck {
  /** Allergènes du groupe présents dans le plat. */
  conflicts: Allergen[];
  /** Aucune fiche liée (ou fiche introuvable) : impossible de vérifier, à contrôler à la main. */
  unverifiable: boolean;
}

/** Croise les fiches d'un plat avec les allergènes à éviter pour le groupe. */
export function checkPlatAllergens(
  ficheIds: number[],
  groupAllergens: Allergen[],
  fichesById: Map<number, FicheTechnique>,
  ingredientsById: Map<number, Ingredient>,
): PlatAllergenCheck {
  const fiches = ficheIds.map((id) => fichesById.get(id));
  const unverifiable = fiches.length === 0 || fiches.some((fiche) => !fiche);

  const platIds = new Set<number>();
  for (const fiche of fiches) {
    if (!fiche) continue;
    for (const id of ficheAllergenIds(fiche, fichesById, ingredientsById)) platIds.add(id);
  }

  return { conflicts: groupAllergens.filter((allergen) => platIds.has(allergen.id)), unverifiable };
}
