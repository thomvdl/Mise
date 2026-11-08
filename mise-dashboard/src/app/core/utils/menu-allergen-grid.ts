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

/** Un plat à placer dans la grille : ses fiches techniques et où il se range. */
export interface AllergenGridPlat {
  id: number;
  name: string;
  sectionName: string;
  ficheIds: number[];
}

/**
 * Construit la grille plats × allergènes d'un menu : une ligne par plat, une colonne par
 * allergène du référentiel, cochée si un ingrédient d'une des fiches techniques du plat porte
 * cet allergène — sous-recettes comprises (voir `uniqueAllergens`).
 */
export function buildAllergenGrid(
  menu: Menu,
  fichesById: Map<number, FicheTechnique>,
  ingredientsById: Map<number, Ingredient>,
  allergens: Allergen[],
): AllergenGrid {
  const plats = (menu.sections ?? []).flatMap((section) =>
    (section.plats ?? []).map((plat) => ({
      id: plat.id,
      name: plat.name,
      sectionName: section.name,
      ficheIds: (plat.fiche_techniques ?? []).map((fiche) => fiche.id),
    })),
  );
  return buildPlatsAllergenGrid(plats, fichesById, ingredientsById, allergens);
}

/** Même grille pour n'importe quelle liste de plats (ex. les plats d'un événement). Un plat sans
 * fiche, ou dont une fiche est introuvable, est marqué `unverifiable`. */
export function buildPlatsAllergenGrid(
  plats: AllergenGridPlat[],
  fichesById: Map<number, FicheTechnique>,
  ingredientsById: Map<number, Ingredient>,
  allergens: Allergen[],
): AllergenGrid {
  const rows: AllergenGridRow[] = plats.map((plat) => {
    const allergenIds = new Set<number>();
    let unverifiable = plat.ficheIds.length === 0;

    for (const ficheId of plat.ficheIds) {
      const fiche = fichesById.get(ficheId);
      if (!fiche) {
        unverifiable = true;
        continue;
      }
      for (const allergen of uniqueAllergens(fiche, fichesById, ingredientsById)) {
        allergenIds.add(allergen.id);
      }
    }

    return { platId: plat.id, platName: plat.name, sectionName: plat.sectionName, allergenIds, unverifiable };
  });

  return { allergens, rows };
}
