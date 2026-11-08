import { Allergen } from '../models/allergen.model';
import { FicheTechnique } from '../models/fiche-technique.model';
import { Ingredient } from '../models/ingredient.model';
import { Menu } from '../models/menu.model';
import { uniqueAllergens } from './enrich-fiche-technique';

export interface AllergenGridRow {
  platId: number;
  platName: string;
  sectionName: string;
  /** Un plat combine parfois plusieurs fiches techniques — allergènes réunis des deux. */
  allergenIds: Set<number>;
  /** Aucune fiche liée (ou fiche introuvable) : allergènes inconnus, à vérifier à la main — à ne
   * surtout pas lire comme « sans allergène ». */
  unverifiable: boolean;
}

export interface AllergenGrid {
  allergens: Allergen[];
  rows: AllergenGridRow[];
}

/**
 * Construit la grille plats × allergènes d'un menu : une ligne par plat, une colonne par
 * allergène du référentiel, cochée si un ingrédient d'une des fiches techniques du plat porte
 * cet allergène — sous-recettes comprises (voir `uniqueAllergens`). Même principe de croisement client que `enrich-fiche-technique.ts` — l'API ne
 * charge pas `ingredients.allergens` sur une fiche technique. Miroir de
 * mise-dashboard/core/utils/menu-allergen-grid.ts.
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
      const platFiches = plat.fiche_techniques ?? [];
      let unverifiable = platFiches.length === 0;

      for (const platFiche of platFiches) {
        const fiche = fichesById.get(platFiche.id);
        if (!fiche) {
          unverifiable = true;
          continue;
        }
        for (const allergen of uniqueAllergens(fiche, fichesById, ingredientsById)) {
          allergenIds.add(allergen.id);
        }
      }

      rows.push({
        platId: plat.id,
        platName: plat.name,
        sectionName: section.name,
        allergenIds,
        unverifiable,
      });
    }
  }

  return { allergens, rows };
}
