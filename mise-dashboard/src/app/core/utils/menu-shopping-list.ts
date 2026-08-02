import { Menu } from '../models/menu.model';
import { FicheTechnique } from '../models/fiche-technique.model';
import { Ingredient } from '../models/ingredient.model';

export interface ShoppingListLine {
  ingredientId: number;
  name: string;
  unit: string;
  categoryName: string | null;
  quantity: number;
}

export interface ShoppingListGroup {
  categoryName: string;
  lines: ShoppingListLine[];
}

/**
 * Agrège les ingrédients de toutes les fiches techniques d'un menu, mis à l'échelle sur un
 * nombre de couverts commun. `GET /api/menus/:id` ne charge que sections.plats.ficheTechniques
 * (pas leurs ingrédients) — `fichesById` vient donc d'un fetch séparé de `/api/fiche-techniques`
 * (qui lui charge bien `ingredients`), même principe de croisement client que
 * `enrich-fiche-technique.ts` pour les allergènes. Une même fiche utilisée dans plusieurs plats
 * du menu voit ses quantités cumulées normalement (Map par ingredient_id).
 */
export function buildShoppingList(
  menu: Menu,
  fichesById: Map<number, FicheTechnique>,
  ingredientsById: Map<number, Ingredient>,
  covers: number,
): ShoppingListGroup[] {
  const totals = new Map<number, ShoppingListLine>();

  for (const section of menu.sections ?? []) {
    for (const plat of section.plats ?? []) {
      for (const platFiche of plat.fiche_techniques ?? []) {
        const fiche = fichesById.get(platFiche.id);
        if (!fiche || fiche.servings <= 0) continue;

        const factor = covers / fiche.servings;

        for (const ingredient of fiche.ingredients ?? []) {
          const quantity = Number(ingredient.pivot.quantity) * factor;
          const existing = totals.get(ingredient.id);

          if (existing) {
            existing.quantity += quantity;
            continue;
          }

          totals.set(ingredient.id, {
            ingredientId: ingredient.id,
            name: ingredient.name,
            unit: ingredient.unit,
            categoryName: ingredientsById.get(ingredient.id)?.category?.name ?? null,
            quantity,
          });
        }
      }
    }
  }

  const groups = new Map<string, ShoppingListGroup>();
  for (const line of totals.values()) {
    const key = line.categoryName ?? 'Autres';
    let group = groups.get(key);
    if (!group) {
      group = { categoryName: key, lines: [] };
      groups.set(key, group);
    }
    group.lines.push(line);
  }

  for (const group of groups.values()) {
    group.lines.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }

  return [...groups.values()].sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'fr', { sensitivity: 'base' }));
}
