import { FicheTechnique } from '../models/fiche-technique.model';
import { IngredientCategory } from '../models/ingredient-category.model';
import { MerchandiseEntry, MerchandiseLine, merchandiseList } from './merchandise-list';

export interface MerchandiseGroup {
  category: string;
  lines: MerchandiseLine[];
}

/**
 * Liste de marchandise d'un événement : les ingrédients de toutes les fiches de ses plats, chaque
 * fiche mise à l'échelle des pax de son plat (sous-recettes comprises, voir `merchandiseList`),
 * regroupés par famille d'ingrédient dans l'ordre alphabétique — « Autres » en dernier. Utilisée
 * par le formulaire (recalcul en direct) et par la fiche événement.
 */
export function eventMerchandiseGroups(
  plats: { pax: number; ficheIds: number[] }[],
  fichesById: Map<number, FicheTechnique>,
  categories: IngredientCategory[],
): MerchandiseGroup[] {
  const entries: MerchandiseEntry[] = plats.flatMap((plat) =>
    plat.ficheIds
      .map((id) => fichesById.get(id))
      .filter((fiche): fiche is FicheTechnique => !!fiche && plat.pax > 0)
      .map((fiche) => ({ fiche, servings: plat.pax })),
  );
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  const groups = new Map<string, MerchandiseLine[]>();
  for (const line of merchandiseList(entries, fichesById)) {
    const category = categoryNames.get(line.ingredient.ingredient_category_id ?? -1) ?? 'Autres';
    groups.set(category, [...(groups.get(category) ?? []), line]);
  }

  return [...groups.entries()]
    .map(([category, groupLines]) => ({
      category,
      lines: groupLines.sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name, 'fr')),
    }))
    .sort((a, b) =>
      a.category === 'Autres' ? 1 : b.category === 'Autres' ? -1 : a.category.localeCompare(b.category, 'fr'),
    );
}
