import { FicheTechnique } from '../models/fiche-technique.model';
import {
  ficheTechniqueToMarkdown,
  parseFicheTechniqueMarkdown,
  parseMultipleFicheTechniques,
  splitFicheTechniqueBlocks,
} from './fiche-technique-markdown';

const EXAMPLE = `# Crêpes sucrées
Station: Dessert
Catégorie: Brunch
Portions: 8
Difficulté: 2

## Description
Crêpes classiques pour le brunch du dimanche.

## Matériel
- Fouet
- Poêle antiadhésive

## Ingrédients
- Farine de blé — 0.5 kg
- Oeufs — 4 pièce

## Mise en place
Sortir le beurre à température ambiante.

## Étapes
1. Mélanger la farine et les oeufs.
2. Laisser reposer la pâte au frais. (30 min)

## Dressage
Empiler les crêpes en éventail.

## Conseil du chef
Laisser reposer la pâte plus longtemps si possible.

## HACCP
Respecter la chaîne du froid.

## Conservation
Se conserve 48h au réfrigérateur.
`;

describe('parseFicheTechniqueMarkdown', () => {
  it('parses the full example format', () => {
    const result = parseFicheTechniqueMarkdown(EXAMPLE);

    expect(result.name).toBe('Crêpes sucrées');
    expect(result.station).toBe('Dessert');
    expect(result.category).toBe('Brunch');
    expect(result.servings).toBe(8);
    expect(result.difficulty).toBe(2);
    expect(result.description).toBe('Crêpes classiques pour le brunch du dimanche.');
    expect(result.equipment).toEqual(['Fouet', 'Poêle antiadhésive']);
    expect(result.ingredients).toEqual([
      { name: 'Farine de blé', quantity: 0.5, unit: 'kg', group: null },
      { name: 'Oeufs', quantity: 4, unit: 'pièce', group: null },
    ]);
    expect(result.miseEnPlace).toBe('Sortir le beurre à température ambiante.');
    expect(result.steps).toEqual([
      { instruction: 'Mélanger la farine et les oeufs.', timerMinutes: null },
      { instruction: 'Laisser reposer la pâte au frais.', timerMinutes: 30 },
    ]);
    expect(result.plating).toBe('Empiler les crêpes en éventail.');
    expect(result.chefTip).toBe('Laisser reposer la pâte plus longtemps si possible.');
    expect(result.haccp).toBe('Respecter la chaîne du froid.');
    expect(result.conservation).toBe('Se conserve 48h au réfrigérateur.');
  });

  it('throws when there is no H1 title', () => {
    expect(() => parseFicheTechniqueMarkdown('Pas de titre ici')).toThrow();
  });

  it('handles a minimal fiche with only a title', () => {
    const result = parseFicheTechniqueMarkdown('# Fiche minimale');

    expect(result.name).toBe('Fiche minimale');
    expect(result.station).toBeNull();
    expect(result.ingredients).toEqual([]);
    expect(result.steps).toEqual([]);
  });

  it('parses an ingredient line without a resolvable quantity', () => {
    const result = parseFicheTechniqueMarkdown('# Fiche\n\n## Ingrédients\n- Sel\n');

    expect(result.ingredients).toEqual([{ name: 'Sel', quantity: null, unit: '', group: null }]);
  });

  it('groups ingredients under "### Groupe" sub-headings within the Ingrédients section', () => {
    const result = parseFicheTechniqueMarkdown(
      '# Fiche\n\n## Ingrédients\n- Sel\n### Pâte\n- Farine — 0.5 kg\n- Oeufs — 2 pièce\n### Sauce\n- Beurre — 0.05 kg\n',
    );

    expect(result.ingredients).toEqual([
      { name: 'Sel', quantity: null, unit: '', group: null },
      { name: 'Farine', quantity: 0.5, unit: 'kg', group: 'Pâte' },
      { name: 'Oeufs', quantity: 2, unit: 'pièce', group: 'Pâte' },
      { name: 'Beurre', quantity: 0.05, unit: 'kg', group: 'Sauce' },
    ]);
  });
});

describe('ficheTechniqueToMarkdown', () => {
  it('serializes a fiche back into the same format the parser accepts (round-trip)', () => {
    const fiche: FicheTechnique = {
      id: 1,
      name: 'Crêpes sucrées',
      slug: 'crepes-sucrees',
      category_id: 2,
      station_id: 3,
      servings: 8,
      difficulty: 2,
      description: 'Crêpes classiques pour le brunch du dimanche.',
      equipment: ['Fouet', 'Poêle antiadhésive'],
      mise_en_place: 'Sortir le beurre à température ambiante.',
      plating: 'Empiler les crêpes en éventail.',
      chef_tip: 'Laisser reposer la pâte plus longtemps si possible.',
      haccp: 'Respecter la chaîne du froid.',
      conservation: 'Se conserve 48h au réfrigérateur.',
      station: { id: 3, name: 'Dessert', slug: 'dessert', color: null },
      category: { id: 2, name: 'Brunch', slug: 'brunch', color: null },
      ingredients: [
        {
          id: 10, name: 'Farine de blé', slug: 'farine-de-ble', unit: 'kg', price: null,
          ingredient_category_id: null, pivot: { quantity: '0.500000', group_label: null },
        },
        {
          id: 11, name: 'Oeufs', slug: 'oeufs', unit: 'pièce', price: null,
          ingredient_category_id: null, pivot: { quantity: '4.000000', group_label: null },
        },
      ],
      steps: [
        { id: 20, position: 1, instruction: 'Mélanger la farine et les oeufs.', timer_minutes: null },
        { id: 21, position: 2, instruction: 'Laisser reposer la pâte au frais.', timer_minutes: 30 },
      ],
    };

    const markdown = ficheTechniqueToMarkdown(fiche);
    const reparsed = parseFicheTechniqueMarkdown(markdown);

    expect(reparsed.name).toBe(fiche.name);
    expect(reparsed.station).toBe('Dessert');
    expect(reparsed.category).toBe('Brunch');
    expect(reparsed.servings).toBe(8);
    expect(reparsed.difficulty).toBe(2);
    expect(reparsed.description).toBe(fiche.description);
    expect(reparsed.equipment).toEqual(fiche.equipment);
    expect(reparsed.ingredients).toEqual([
      { name: 'Farine de blé', quantity: 0.5, unit: 'kg', group: null },
      { name: 'Oeufs', quantity: 4, unit: 'pièce', group: null },
    ]);
    expect(reparsed.miseEnPlace).toBe(fiche.mise_en_place);
    expect(reparsed.steps).toEqual([
      { instruction: 'Mélanger la farine et les oeufs.', timerMinutes: null },
      { instruction: 'Laisser reposer la pâte au frais.', timerMinutes: 30 },
    ]);
    expect(reparsed.plating).toBe(fiche.plating);
    expect(reparsed.chefTip).toBe(fiche.chef_tip);
    expect(reparsed.haccp).toBe(fiche.haccp);
    expect(reparsed.conservation).toBe(fiche.conservation);
  });

  it('serializes grouped ingredients under "### Groupe" headings, folding ungrouped ones into "Divers"', () => {
    const fiche: FicheTechnique = {
      id: 2,
      name: 'Pâte à choux',
      slug: 'pate-a-choux',
      category_id: null,
      station_id: null,
      servings: 4,
      difficulty: 1,
      description: null,
      equipment: null,
      mise_en_place: null,
      plating: null,
      chef_tip: null,
      haccp: null,
      conservation: null,
      ingredients: [
        {
          id: 10, name: 'Farine', slug: 'farine', unit: 'kg', price: null,
          ingredient_category_id: null, pivot: { quantity: '0.250000', group_label: 'Pâte' },
        },
        {
          id: 11, name: 'Beurre', slug: 'beurre', unit: 'kg', price: null,
          ingredient_category_id: null, pivot: { quantity: '0.100000', group_label: 'Pâte' },
        },
        {
          id: 12, name: 'Chocolat', slug: 'chocolat', unit: 'kg', price: null,
          ingredient_category_id: null, pivot: { quantity: '0.150000', group_label: 'Sauce' },
        },
        {
          id: 13, name: 'Sel', slug: 'sel', unit: 'pincée', price: null,
          ingredient_category_id: null, pivot: { quantity: '1.000000', group_label: null },
        },
      ],
      steps: [],
    };

    const markdown = ficheTechniqueToMarkdown(fiche);
    expect(markdown).toContain('### Pâte');
    expect(markdown).toContain('### Sauce');
    expect(markdown).toContain('### Divers');

    const reparsed = parseFicheTechniqueMarkdown(markdown);
    expect(reparsed.ingredients).toEqual([
      { name: 'Farine', quantity: 0.25, unit: 'kg', group: 'Pâte' },
      { name: 'Beurre', quantity: 0.1, unit: 'kg', group: 'Pâte' },
      { name: 'Chocolat', quantity: 0.15, unit: 'kg', group: 'Sauce' },
      { name: 'Sel', quantity: 1, unit: 'pincée', group: 'Divers' },
    ]);
  });
});

describe('splitFicheTechniqueBlocks', () => {
  it('splits several fiches pasted back to back on their own titles', () => {
    const text = '# Fiche 1\nServings: 4\n\n## Description\nUn\n\n# Fiche 2\n\n## Description\nDeux\n';
    const blocks = splitFicheTechniqueBlocks(text);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('# Fiche 1');
    expect(blocks[1]).toContain('# Fiche 2');
  });

  it('drops stray content before the first title', () => {
    const blocks = splitFicheTechniqueBlocks('quelques notes avant\n\n# Fiche 1\n');
    expect(blocks).toEqual(['# Fiche 1']);
  });

  it('returns an empty array when there is no title at all', () => {
    expect(splitFicheTechniqueBlocks('rien ici')).toEqual([]);
  });
});

describe('parseMultipleFicheTechniques', () => {
  it('parses each block independently, isolating failures', () => {
    const text = `${EXAMPLE}\n# Fiche cassée\n## Ingrédients\n- Sel — abc kg\n`;
    const results = parseMultipleFicheTechniques(text);

    expect(results).toHaveLength(2);
    expect(results[0].error).toBeNull();
    expect(results[0].value?.name).toBe('Crêpes sucrées');
    // A non-numeric quantity simply parses as "no quantity" rather than throwing.
    expect(results[1].error).toBeNull();
    expect(results[1].value?.ingredients[0].quantity).toBeNull();
  });
});
