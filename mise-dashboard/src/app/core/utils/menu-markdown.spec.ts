import { Menu } from '../models/menu.model';
import { menuToMarkdown, menusToMarkdown, parseMenuMarkdown, parseMultipleMenus, splitMenuBlocks } from './menu-markdown';

const EXAMPLE = `# Menu du dimanche
Description: Menu brunch dominical
Début: 2026-07-20
Fin: 2026-07-20

## Entrées
### Velouté de saison
Une soupe légère pour ouvrir le repas.
Fiches: Velouté de courge

### Salade composée

## Desserts
### Crêpes sucrées
Fiches: Crêpes sucrées, Pain perdu
`;

describe('parseMenuMarkdown', () => {
  it('parses the full example format', () => {
    const result = parseMenuMarkdown(EXAMPLE);

    expect(result.name).toBe('Menu du dimanche');
    expect(result.description).toBe('Menu brunch dominical');
    expect(result.startsAt).toBe('2026-07-20');
    expect(result.endsAt).toBe('2026-07-20');
    expect(result.sections).toEqual([
      {
        name: 'Entrées',
        plats: [
          {
            name: 'Velouté de saison',
            description: 'Une soupe légère pour ouvrir le repas.',
            ficheTechniques: ['Velouté de courge'],
          },
          { name: 'Salade composée', description: null, ficheTechniques: [] },
        ],
      },
      {
        name: 'Desserts',
        plats: [
          {
            name: 'Crêpes sucrées',
            description: null,
            ficheTechniques: ['Crêpes sucrées', 'Pain perdu'],
          },
        ],
      },
    ]);
  });

  it('throws when there is no H1 title', () => {
    expect(() => parseMenuMarkdown('Pas de titre ici')).toThrow();
  });

  it('handles a minimal menu with only a title', () => {
    const result = parseMenuMarkdown('# Menu minimal');

    expect(result.name).toBe('Menu minimal');
    expect(result.description).toBeNull();
    expect(result.startsAt).toBeNull();
    expect(result.endsAt).toBeNull();
    expect(result.sections).toEqual([]);
  });

  it('defaults "Fin" to "Début" for a one-shot menu when only "Début" is given', () => {
    const result = parseMenuMarkdown('# Menu\nDébut: 2026-07-20\n');
    expect(result.startsAt).toBe('2026-07-20');
    expect(result.endsAt).toBe('2026-07-20');
  });

  it('ignores a plat with no "Fiches:" line as having no linked fiche technique', () => {
    const result = parseMenuMarkdown('# Menu\n\n## Plats\n### Riz nature\n');
    expect(result.sections[0].plats[0].ficheTechniques).toEqual([]);
  });
});

describe('menuToMarkdown', () => {
  it('serializes a menu back into the same format the parser accepts (round-trip)', () => {
    const menu: Menu = {
      id: 1,
      name: 'Menu du dimanche',
      slug: 'menu-du-dimanche',
      description: 'Menu brunch dominical',
      starts_at: '2026-07-20',
      ends_at: '2026-07-20',
      sections: [
        {
          id: 1,
          menu_id: 1,
          name: 'Entrées',
          position: 1,
          plats: [
            {
              id: 1,
              menu_section_id: 1,
              name: 'Velouté de saison',
              description: 'Une soupe légère pour ouvrir le repas.',
              position: 1,
              fiche_techniques: [
                {
                  id: 5,
                  name: 'Velouté de courge',
                  slug: 'veloute-de-courge',
                  category_id: null,
                  station_id: null,
                  servings: 6,
                  difficulty: 1,
                  description: null,
                  equipment: null,
                  mise_en_place: null,
                  plating: null,
                  chef_tip: null,
                  haccp: null,
                  conservation: null,
                  pivot: { position: 1 },
                },
              ],
            },
          ],
        },
      ],
    };

    const markdown = menuToMarkdown(menu);
    const reparsed = parseMenuMarkdown(markdown);

    expect(reparsed.name).toBe(menu.name);
    expect(reparsed.description).toBe(menu.description);
    expect(reparsed.startsAt).toBe(menu.starts_at);
    expect(reparsed.endsAt).toBe(menu.ends_at);
    expect(reparsed.sections).toEqual([
      {
        name: 'Entrées',
        plats: [
          {
            name: 'Velouté de saison',
            description: 'Une soupe légère pour ouvrir le repas.',
            ficheTechniques: ['Velouté de courge'],
          },
        ],
      },
    ]);
  });

  it('omits the "Fin" line when it equals "Début" (one-shot menu)', () => {
    const menu: Menu = {
      id: 2,
      name: 'Soirée spéciale',
      slug: 'soiree-speciale',
      description: null,
      starts_at: '2026-08-01',
      ends_at: '2026-08-01',
      sections: [],
    };

    expect(menuToMarkdown(menu)).not.toContain('Fin:');
  });
});

describe('splitMenuBlocks', () => {
  it('splits several menus pasted back to back on their own titles', () => {
    const text = '# Menu 1\nDescription: Un\n\n## Entrées\n### Plat 1\n\n# Menu 2\n\n## Entrées\n### Plat 2\n';
    const blocks = splitMenuBlocks(text);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('# Menu 1');
    expect(blocks[1]).toContain('# Menu 2');
  });

  it('drops stray content before the first title', () => {
    const blocks = splitMenuBlocks('quelques notes avant\n\n# Menu 1\n');
    expect(blocks).toEqual(['# Menu 1']);
  });

  it('returns an empty array when there is no title at all', () => {
    expect(splitMenuBlocks('rien ici')).toEqual([]);
  });
});

describe('parseMultipleMenus', () => {
  it('parses each block independently', () => {
    const text = `${EXAMPLE}\n# Menu de semaine\nDébut: 2026-07-21\nFin: 2026-07-25\n`;
    const results = parseMultipleMenus(text);

    expect(results).toHaveLength(2);
    expect(results[0].error).toBeNull();
    expect(results[0].value?.name).toBe('Menu du dimanche');
    expect(results[1].error).toBeNull();
    expect(results[1].value?.name).toBe('Menu de semaine');
    expect(results[1].value?.startsAt).toBe('2026-07-21');
    expect(results[1].value?.endsAt).toBe('2026-07-25');
  });
});

describe('menusToMarkdown', () => {
  it('joins multiple menus, each starting with its own title', () => {
    const menus: Menu[] = [
      { id: 1, name: 'Menu A', slug: 'menu-a', description: null, starts_at: null, ends_at: null, sections: [] },
      { id: 2, name: 'Menu B', slug: 'menu-b', description: null, starts_at: null, ends_at: null, sections: [] },
    ];

    const markdown = menusToMarkdown(menus);
    expect(markdown).toContain('# Menu A');
    expect(markdown).toContain('# Menu B');
  });
});
