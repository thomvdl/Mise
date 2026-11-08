import { Allergen } from '../models/allergen.model';
import { FicheTechnique } from '../models/fiche-technique.model';
import { Ingredient } from '../models/ingredient.model';
import { checkPlatAllergens } from './event-allergens';

const gluten = { id: 1, name: 'Gluten' } as Allergen;
const oeuf = { id: 2, name: 'Œufs' } as Allergen;
const lait = { id: 3, name: 'Lait' } as Allergen;

const ingredients = new Map<number, Ingredient>([
  [10, { id: 10, name: 'Beurre', allergens: [lait] } as Ingredient],
  [11, { id: 11, name: 'Jaune d\'œuf', allergens: [oeuf] } as Ingredient],
  [12, { id: 12, name: 'Bœuf', allergens: [] } as unknown as Ingredient],
]);

const fiche = (id: number, ingredientIds: number[], componentIds: number[] = []) =>
  ({
    id,
    name: `Fiche ${id}`,
    ingredients: ingredientIds.map((i) => ({ id: i })),
    components: componentIds.map((c) => ({ id: c })),
  }) as unknown as FicheTechnique;

describe('checkPlatAllergens', () => {
  // Bœuf (sans allergène) + béarnaise en sous-recette (beurre, œuf) ; la béarnaise boucle sur le bœuf.
  const fiches = new Map<number, FicheTechnique>([
    [1, fiche(1, [12], [2])],
    [2, fiche(2, [10, 11], [1])],
  ]);

  it('trouve les allergènes du groupe dans les sous-recettes, sans boucler', () => {
    const check = checkPlatAllergens([1], [gluten, oeuf, lait], fiches, ingredients);
    expect(check.conflicts.map((a) => a.name)).toEqual(['Œufs', 'Lait']);
    expect(check.unverifiable).toBe(false);
  });

  it('signale un plat sans fiche comme non vérifiable', () => {
    expect(checkPlatAllergens([], [gluten], fiches, ingredients)).toEqual({ conflicts: [], unverifiable: true });
    expect(checkPlatAllergens([99], [gluten], fiches, ingredients).unverifiable).toBe(true);
  });
});
