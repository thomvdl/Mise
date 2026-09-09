import { Menu } from '../models/menu.model';
import { FicheTechnique } from '../models/fiche-technique.model';
import { Ingredient } from '../models/ingredient.model';

export type ShoppingListGroupBy = 'categorie' | 'poste' | 'fiche-technique';

export interface ShoppingListLine {
  ingredientId: number;
  name: string;
  unit: string;
  quantity: number;
}

export interface ShoppingListGroup {
  label: string;
  lines: ShoppingListLine[];
}

interface IngredientContribution {
  ingredientId: number;
  name: string;
  unit: string;
  quantity: number;
  categoryName: string | null;
  stationName: string | null;
  ficheName: string;
}

/**
 * Récupère chaque ligne d'ingrédient de chaque fiche technique du menu, mise à l'échelle sur un
 * nombre de couverts commun, sans les agréger — une même fiche utilisée dans deux plats produit
 * deux contributions distinctes pour un même ingrédient, à sommer ensuite selon le mode de
 * regroupement choisi (une agrégation globale par ingrédient perdrait l'info poste/fiche
 * nécessaire aux modes "poste" et "fiche technique").
 */
function collectContributions(
  menu: Menu,
  fichesById: Map<number, FicheTechnique>,
  ingredientsById: Map<number, Ingredient>,
  covers: number,
): IngredientContribution[] {
  const contributions: IngredientContribution[] = [];

  for (const section of menu.sections ?? []) {
    for (const plat of section.plats ?? []) {
      for (const platFiche of plat.fiche_techniques ?? []) {
        const fiche = fichesById.get(platFiche.id);
        if (!fiche || fiche.servings <= 0) continue;

        const factor = covers / fiche.servings;

        for (const ingredient of fiche.ingredients ?? []) {
          contributions.push({
            ingredientId: ingredient.id,
            name: ingredient.name,
            unit: ingredient.unit,
            quantity: Number(ingredient.pivot.quantity) * factor,
            categoryName: ingredientsById.get(ingredient.id)?.category?.name ?? null,
            stationName: fiche.station?.name ?? null,
            ficheName: fiche.name,
          });
        }
      }
    }
  }

  return contributions;
}

function groupLabel(groupBy: ShoppingListGroupBy, contribution: IngredientContribution): string {
  switch (groupBy) {
    case 'categorie':
      return contribution.categoryName ?? 'Autres';
    case 'poste':
      return contribution.stationName ?? 'Sans poste';
    case 'fiche-technique':
      return contribution.ficheName;
  }
}

/**
 * Somme les contributions par ingrédient à l'intérieur de chaque groupe (label). Un même
 * ingrédient peut donc apparaître dans plusieurs groupes (ex. "Beurre" au poste Poisson et au
 * poste Dessert) — seul le mode "categorie" le regrouperait de toute façon sur un seul groupe.
 */
function aggregate(contributions: IngredientContribution[], groupBy: ShoppingListGroupBy): ShoppingListGroup[] {
  const groups = new Map<string, Map<number, ShoppingListLine>>();

  for (const contribution of contributions) {
    const label = groupLabel(groupBy, contribution);
    let linesByIngredient = groups.get(label);
    if (!linesByIngredient) {
      linesByIngredient = new Map<number, ShoppingListLine>();
      groups.set(label, linesByIngredient);
    }

    const existing = linesByIngredient.get(contribution.ingredientId);
    if (existing) {
      existing.quantity += contribution.quantity;
      continue;
    }

    linesByIngredient.set(contribution.ingredientId, {
      ingredientId: contribution.ingredientId,
      name: contribution.name,
      unit: contribution.unit,
      quantity: contribution.quantity,
    });
  }

  const result: ShoppingListGroup[] = [];
  for (const [label, linesByIngredient] of groups) {
    const lines = [...linesByIngredient.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    );
    result.push({ label, lines });
  }

  return result.sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
}

/**
 * Agrège les ingrédients de toutes les fiches techniques d'un menu, mis à l'échelle sur un
 * nombre de couverts commun. `GET /api/menus/:id` ne charge que sections.plats.ficheTechniques
 * (pas leurs ingrédients) — `fichesById` vient donc d'un fetch séparé de `/api/fiche-techniques`
 * (qui lui charge bien `ingredients`), même principe de croisement client que
 * `enrich-fiche-technique.ts` pour les allergènes. `groupBy` choisit l'axe de regroupement :
 * catégorie d'ingrédient (défaut), poste de la fiche technique d'origine, ou fiche technique.
 */
export function buildShoppingList(
  menu: Menu,
  fichesById: Map<number, FicheTechnique>,
  ingredientsById: Map<number, Ingredient>,
  covers: number,
  groupBy: ShoppingListGroupBy = 'categorie',
): ShoppingListGroup[] {
  return aggregate(collectContributions(menu, fichesById, ingredientsById, covers), groupBy);
}
