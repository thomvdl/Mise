import { FicheTechniqueComponent } from '../models/fiche-technique.model';

export interface ComponentCost {
  /** Coût total pour `quantity` préparations du composant (déjà mise à l'échelle) — null si son
   * propre coût de base est inconnu (aucun ingrédient chargé). */
  lineCost: number | null;
  /** true si au moins un ingrédient du composant n'a pas de prix — le coût ci-dessus est sous-estimé. */
  incomplete: boolean;
}

/**
 * Coût d'une ligne "composant" = coût d'une préparation complète du composant (somme prix ×
 * quantité de SES PROPRES ingrédients, chargés côté API via `components.ingredients`) multiplié
 * par `quantity` (déjà mise à l'échelle des portions × fraction de recette du pivot). Un seul
 * niveau : si le composant utilise lui-même un autre composant, ce coût-là n'est pas inclus.
 */
export function componentCost(component: FicheTechniqueComponent, quantity: number): ComponentCost {
  const ingredients = component.ingredients ?? [];
  let baseCost = 0;
  let incomplete = ingredients.length === 0;

  for (const ingredient of ingredients) {
    if (ingredient.price === null) {
      incomplete = true;
      continue;
    }
    baseCost += Number(ingredient.price) * Number(ingredient.pivot.quantity);
  }

  return {
    lineCost: baseCost * quantity,
    incomplete,
  };
}
