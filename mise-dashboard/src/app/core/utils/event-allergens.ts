import { Allergen } from '../models/allergen.model';
import { FicheTechnique } from '../models/fiche-technique.model';
import { Ingredient } from '../models/ingredient.model';
import { uniqueAllergens } from './enrich-fiche-technique';

export interface PlatAllergenCheck {
  /** Allergènes du groupe présents dans le plat. */
  conflicts: Allergen[];
  /** Aucune fiche liée (ou fiche introuvable) : impossible de vérifier, à contrôler à la main. */
  unverifiable: boolean;
}

/** Croise les fiches d'un plat (sous-recettes comprises, voir `uniqueAllergens`) avec les
 * allergènes à éviter pour le groupe. */
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
    for (const allergen of uniqueAllergens(fiche, fichesById, ingredientsById)) platIds.add(allergen.id);
  }

  return { conflicts: groupAllergens.filter((allergen) => platIds.has(allergen.id)), unverifiable };
}
