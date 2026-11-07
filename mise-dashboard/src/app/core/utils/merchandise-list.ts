import { FicheTechnique } from '../models/fiche-technique.model';
import { Ingredient } from '../models/ingredient.model';

/** Une fiche à préparer et le nombre de portions à prévoir (une tâche de mise en place). */
export interface MerchandiseEntry {
  fiche: FicheTechnique;
  servings: number;
}

/** Quantité totale d'un ingrédient, dans son unité de base (celle de l'ingrédient). */
export interface MerchandiseLine {
  ingredient: Ingredient;
  quantity: number;
}

/**
 * Liste de marchandise : additionne les ingrédients de chaque fiche, mis à l'échelle des portions
 * à prévoir (portions demandées / portions de base de la fiche).
 *
 * Les sous-recettes (`components`) sont dépliées en leurs propres ingrédients, à toutes les
 * profondeurs : `pivot.quantity` d'un composant est un nombre de préparations de sa recette de
 * base, multiplié par l'échelle de la fiche parente. `fichesById` sert à retrouver les composants
 * d'un composant (l'API ne charge qu'un niveau, `components.ingredients`) — une fiche absente de
 * la map est dépliée avec ce qui a été chargé. Une boucle (A utilise B qui utilise A) est ignorée.
 */
export function merchandiseList(
  entries: MerchandiseEntry[],
  fichesById: Map<number, FicheTechnique>,
): MerchandiseLine[] {
  const totals = new Map<number, MerchandiseLine>();

  const addFiche = (fiche: FicheTechnique, batches: number, path: Set<number>): void => {
    if (path.has(fiche.id) || batches <= 0) return;
    const nextPath = new Set(path).add(fiche.id);

    for (const ingredient of fiche.ingredients ?? []) {
      const quantity = Number(ingredient.pivot.quantity) * batches;
      if (!Number.isFinite(quantity)) continue;

      const line = totals.get(ingredient.id);
      if (line) {
        line.quantity += quantity;
      } else {
        const { pivot: _pivot, ...base } = ingredient;
        totals.set(ingredient.id, { ingredient: base, quantity });
      }
    }

    for (const component of fiche.components ?? []) {
      const componentBatches = Number(component.pivot.quantity) * batches;
      addFiche(fichesById.get(component.id) ?? component, componentBatches, nextPath);
    }
  };

  for (const { fiche, servings } of entries) {
    if (fiche.servings > 0) {
      addFiche(fiche, servings / fiche.servings, new Set());
    }
  }

  return [...totals.values()];
}
