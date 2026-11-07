import { FicheTechnique, FicheTechniqueComponent, FicheTechniqueIngredient } from '../models/fiche-technique.model';
import { merchandiseList } from './merchandise-list';

function ingredient(id: number, name: string, quantity: number, unit = 'kg'): FicheTechniqueIngredient {
  return {
    id, name, slug: name, unit, barcode: null, price: null, ingredient_category_id: null,
    pivot: { quantity: String(quantity), group_label: null },
  };
}

function fiche(id: number, servings: number, ingredients: FicheTechniqueIngredient[], components: FicheTechniqueComponent[] = []): FicheTechnique {
  return {
    id, name: `Fiche ${id}`, slug: `fiche-${id}`, category_id: null, station_id: null, servings, difficulty: 1,
    description: null, equipment: null, mise_en_place: null, plating: null, plating_schema: null,
    chef_tip: null, haccp: null, conservation: null, ingredients, components,
  };
}

function asComponent(f: FicheTechnique, quantity: number): FicheTechniqueComponent {
  return { ...f, pivot: { quantity: String(quantity), group_label: null } };
}

function quantityOf(lines: ReturnType<typeof merchandiseList>, id: number): number | undefined {
  return lines.find((line) => line.ingredient.id === id)?.quantity;
}

describe('merchandiseList', () => {
  it('met les ingrédients à l’échelle des portions demandées', () => {
    const sauce = fiche(1, 10, [ingredient(100, 'Beurre', 0.5)]);

    const lines = merchandiseList([{ fiche: sauce, servings: 40 }], new Map());

    expect(quantityOf(lines, 100)).toBeCloseTo(2);
  });

  it('additionne un même ingrédient venant de plusieurs fiches', () => {
    const a = fiche(1, 10, [ingredient(100, 'Beurre', 0.5)]);
    const b = fiche(2, 4, [ingredient(100, 'Beurre', 0.2), ingredient(101, 'Œufs', 6, 'pièce')]);

    const lines = merchandiseList([{ fiche: a, servings: 10 }, { fiche: b, servings: 8 }], new Map());

    expect(quantityOf(lines, 100)).toBeCloseTo(0.9);
    expect(quantityOf(lines, 101)).toBeCloseTo(12);
    expect(lines.length).toBe(2);
  });

  it('déplie les sous-recettes à toutes les profondeurs', () => {
    const fond = fiche(3, 1, [ingredient(102, 'Os de veau', 2)]);
    const sauce = fiche(2, 1, [ingredient(103, 'Vin rouge', 1, 'L')], [asComponent(fond, 0.5)]);
    // Le composant chargé par l'API n'a qu'un niveau : la "sauce" vue comme composant n'a pas ses
    // propres composants — c'est fichesById qui permet de descendre jusqu'au fond.
    const sauceAsLoaded = asComponent({ ...sauce, components: [] }, 2);
    const plat = fiche(1, 4, [], [sauceAsLoaded]);
    const fichesById = new Map([[1, plat], [2, sauce], [3, fond]]);

    const lines = merchandiseList([{ fiche: plat, servings: 8 }], fichesById);

    // 8 portions / 4 = ×2 → 2 × 2 sauces = 4 sauces → 4 L de vin, 4 × 0.5 fond × 2 kg = 4 kg d'os.
    expect(quantityOf(lines, 103)).toBeCloseTo(4);
    expect(quantityOf(lines, 102)).toBeCloseTo(4);
  });

  it('ignore une boucle de sous-recettes au lieu de tourner sans fin', () => {
    const a = fiche(1, 1, [ingredient(100, 'Beurre', 1)]);
    const b = fiche(2, 1, [ingredient(101, 'Farine', 1)], [asComponent(a, 1)]);
    a.components = [asComponent(b, 1)];
    const fichesById = new Map([[1, a], [2, b]]);

    const lines = merchandiseList([{ fiche: a, servings: 1 }], fichesById);

    expect(quantityOf(lines, 100)).toBeCloseTo(1);
    expect(quantityOf(lines, 101)).toBeCloseTo(1);
  });
});
