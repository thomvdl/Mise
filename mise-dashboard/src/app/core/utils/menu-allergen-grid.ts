import { Allergen } from '../models/allergen.model';
import { FicheTechnique } from '../models/fiche-technique.model';
import { Ingredient } from '../models/ingredient.model';
import { Menu } from '../models/menu.model';

export interface AllergenGridRow {
  platId: number;
  platName: string;
  sectionName: string;
  /** Un plat combine parfois plusieurs fiches techniques — allergènes réunis des deux. */
  allergenIds: Set<number>;
}

export interface AllergenGrid {
  allergens: Allergen[];
  rows: AllergenGridRow[];
}

/**
 * Construit la grille plats × allergènes d'un menu : une ligne par plat, une colonne par
 * allergène du référentiel, cochée si un ingrédient d'une des fiches techniques du plat porte
 * cet allergène. Même principe de croisement client que `enrich-fiche-technique.ts` — l'API ne
 * charge pas `ingredients.allergens` sur une fiche technique.
 */
export function buildAllergenGrid(
  menu: Menu,
  fichesById: Map<number, FicheTechnique>,
  ingredientsById: Map<number, Ingredient>,
  allergens: Allergen[],
): AllergenGrid {
  const rows: AllergenGridRow[] = [];

  for (const section of menu.sections ?? []) {
    for (const plat of section.plats ?? []) {
      const allergenIds = new Set<number>();

      for (const platFiche of plat.fiche_techniques ?? []) {
        const fiche = fichesById.get(platFiche.id);
        for (const ingredient of fiche?.ingredients ?? []) {
          const allergensOfIngredient = ingredientsById.get(ingredient.id)?.allergens ?? ingredient.allergens ?? [];
          for (const allergen of allergensOfIngredient) {
            allergenIds.add(allergen.id);
          }
        }
      }

      rows.push({
        platId: plat.id,
        platName: plat.name,
        sectionName: section.name,
        allergenIds,
      });
    }
  }

  return { allergens, rows };
}
