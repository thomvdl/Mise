import { FicheTechnique } from '../models/fiche-technique.model';

export interface ParsedIngredientLine {
  name: string;
  quantity: number | null;
  unit: string;
  /** Sub-recipe/section label from the nearest preceding "### Groupe" heading, or null when ungrouped. */
  group: string | null;
}

export interface ParsedStepLine {
  instruction: string;
  timerMinutes: number | null;
}

export interface ParsedFicheTechnique {
  name: string;
  station: string | null;
  category: string | null;
  servings: number | null;
  difficulty: number | null;
  description: string | null;
  equipment: string[];
  ingredients: ParsedIngredientLine[];
  miseEnPlace: string | null;
  steps: ParsedStepLine[];
  plating: string | null;
  chefTip: string | null;
  haccp: string | null;
  conservation: string | null;
}

type SectionKey =
  | 'description'
  | 'materiel'
  | 'ingredients'
  | 'mise en place'
  | 'etapes'
  | 'dressage'
  | 'conseil du chef'
  | 'haccp'
  | 'conservation';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function parseIngredientLine(line: string, group: string | null): ParsedIngredientLine {
  const body = line.replace(/^-\s*/, '').trim();
  const separatorIndex = body.indexOf('—');

  if (separatorIndex === -1) {
    return { name: body, quantity: null, unit: '', group };
  }

  const name = body.slice(0, separatorIndex).trim();
  const rest = body.slice(separatorIndex + 1).trim();
  const match = rest.match(/^([\d.,]+)\s*(.*)$/);

  if (!match) {
    return { name, quantity: null, unit: rest, group };
  }

  return { name, quantity: parseFloat(match[1].replace(',', '.')), unit: match[2].trim(), group };
}

function parseStepLine(line: string): ParsedStepLine {
  const body = line.replace(/^\d+[.)]\s*/, '').trim();
  const timerMatch = body.match(/\(\s*(\d+)\s*min\s*\)\s*$/i);

  if (!timerMatch || timerMatch.index === undefined) {
    return { instruction: body, timerMinutes: null };
  }

  return {
    instruction: body.slice(0, timerMatch.index).trim(),
    timerMinutes: Number(timerMatch[1]),
  };
}

/**
 * Parses the "## Section" markdown format described to the user (H1 title + Key: value
 * metadata block + fixed-vocabulary H2 sections) into a structured intermediate representation.
 * Does not touch the API — callers resolve station/category/ingredient names against the
 * existing catalogs and build the actual FicheTechniquePayload themselves.
 */
export function parseFicheTechniqueMarkdown(text: string): ParsedFicheTechnique {
  const lines = text.split(/\r?\n/);
  let i = 0;

  while (i < lines.length && lines[i].trim() === '') i++;

  if (i >= lines.length || !lines[i].trim().startsWith('# ')) {
    throw new Error('Le texte doit commencer par un titre de niveau 1, ex. "# Nom de la fiche".');
  }

  const name = lines[i].trim().slice(2).trim();
  if (!name) {
    throw new Error('Le titre de la fiche ne peut pas être vide.');
  }
  i++;

  const result: ParsedFicheTechnique = {
    name,
    station: null,
    category: null,
    servings: null,
    difficulty: null,
    description: null,
    equipment: [],
    ingredients: [],
    miseEnPlace: null,
    steps: [],
    plating: null,
    chefTip: null,
    haccp: null,
    conservation: null,
  };

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '') {
      i++;
      continue;
    }
    if (line.startsWith('#')) break;

    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) break;

    const key = normalize(match[1]);
    const value = match[2].trim();

    if (key === 'station') result.station = value;
    else if (key === 'categorie') result.category = value;
    else if (key === 'portions') result.servings = Number(value) || null;
    else if (key === 'difficulte') result.difficulty = Number(value) || null;

    i++;
  }

  let currentKey: SectionKey | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join('\n').trim();

    switch (currentKey) {
      case 'description':
        result.description = text || null;
        break;
      case 'materiel':
        result.equipment = buffer
          .map((l) => l.trim())
          .filter((l) => l.startsWith('-'))
          .map((l) => l.slice(1).trim())
          .filter(Boolean);
        break;
      case 'ingredients': {
        let group: string | null = null;
        const ingredients: ParsedIngredientLine[] = [];
        for (const raw of buffer) {
          const l = raw.trim();
          if (l.startsWith('### ')) {
            group = l.slice(4).trim() || null;
          } else if (l.startsWith('-')) {
            ingredients.push(parseIngredientLine(l, group));
          }
        }
        result.ingredients = ingredients;
        break;
      }
      case 'mise en place':
        result.miseEnPlace = text || null;
        break;
      case 'etapes':
        result.steps = buffer
          .map((l) => l.trim())
          .filter((l) => /^\d+[.)]/.test(l))
          .map(parseStepLine);
        break;
      case 'dressage':
        result.plating = text || null;
        break;
      case 'conseil du chef':
        result.chefTip = text || null;
        break;
      case 'haccp':
        result.haccp = text || null;
        break;
      case 'conservation':
        result.conservation = text || null;
        break;
    }

    buffer = [];
  };

  for (; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith('## ')) {
      flush();
      currentKey = normalize(trimmed.slice(3)) as SectionKey;
      continue;
    }

    buffer.push(lines[i]);
  }
  flush();

  return result;
}

export interface ParsedFicheTechniqueBlock {
  raw: string;
  value: ParsedFicheTechnique | null;
  error: string | null;
}

/**
 * Splits a pasted text into one block per fiche technique. No dedicated separator is needed —
 * each fiche already starts with its own "# Titre" (H1), so a new H1 simply starts a new block.
 * Content before the first H1 (blank lines, stray text) is dropped.
 */
export function splitFicheTechniqueBlocks(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const blocks: string[][] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    if (/^#\s/.test(line.trim())) {
      if (current) blocks.push(current);
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) blocks.push(current);

  return blocks.map((block) => block.join('\n').trim()).filter(Boolean);
}

/** Parses a pasted text containing one or more fiches techniques, one result per detected block. */
export function parseMultipleFicheTechniques(text: string): ParsedFicheTechniqueBlock[] {
  return splitFicheTechniqueBlocks(text).map((raw) => {
    try {
      return { raw, value: parseFicheTechniqueMarkdown(raw), error: null };
    } catch (error) {
      return { raw, value: null, error: error instanceof Error ? error.message : 'Texte illisible.' };
    }
  });
}

function formatQuantity(quantity: string): string {
  const num = parseFloat(quantity);
  return Number.isNaN(num) ? quantity : String(num);
}

/**
 * Serializes a fiche technique back to the same "## Section" markdown format the import
 * screen parses, so an export can be re-imported unchanged.
 */
export function ficheTechniqueToMarkdown(fiche: FicheTechnique): string {
  const header = [`# ${fiche.name}`];
  if (fiche.station) header.push(`Station: ${fiche.station.name}`);
  if (fiche.category) header.push(`Catégorie: ${fiche.category.name}`);
  if (fiche.servings) header.push(`Portions: ${fiche.servings}`);
  if (fiche.difficulty) header.push(`Difficulté: ${fiche.difficulty}`);

  const sections: string[] = [];

  if (fiche.description) {
    sections.push(`## Description\n${fiche.description}`);
  }

  if (fiche.equipment?.length) {
    sections.push(`## Matériel\n${fiche.equipment.map((item) => `- ${item}`).join('\n')}`);
  }

  if (fiche.ingredients?.length) {
    const hasGroups = fiche.ingredients.some((ingredient) => ingredient.pivot.group_label);
    let currentGroup: string | null | undefined;
    const lines: string[] = [];

    for (const ingredient of fiche.ingredients) {
      if (hasGroups && ingredient.pivot.group_label !== currentGroup) {
        currentGroup = ingredient.pivot.group_label;
        lines.push(`### ${currentGroup ?? 'Divers'}`);
      }
      const quantity = formatQuantity(ingredient.pivot.quantity);
      const unit = ingredient.unit ? ` ${ingredient.unit}` : '';
      lines.push(`- ${ingredient.name} — ${quantity}${unit}`);
    }

    sections.push(`## Ingrédients\n${lines.join('\n')}`);
  }

  if (fiche.mise_en_place) {
    sections.push(`## Mise en place\n${fiche.mise_en_place}`);
  }

  if (fiche.steps?.length) {
    const lines = [...fiche.steps]
      .sort((a, b) => a.position - b.position)
      .map((step, index) => {
        const timer = step.timer_minutes ? ` (${step.timer_minutes} min)` : '';
        return `${index + 1}. ${step.instruction}${timer}`;
      });
    sections.push(`## Étapes\n${lines.join('\n')}`);
  }

  if (fiche.plating) sections.push(`## Dressage\n${fiche.plating}`);
  if (fiche.chef_tip) sections.push(`## Conseil du chef\n${fiche.chef_tip}`);
  if (fiche.haccp) sections.push(`## HACCP\n${fiche.haccp}`);
  if (fiche.conservation) sections.push(`## Conservation\n${fiche.conservation}`);

  return [header.join('\n'), ...sections].join('\n\n');
}

/** Joins multiple fiches into a single pasteable text, each starting with its own "# Titre". */
export function fichesTechniquesToMarkdown(fiches: FicheTechnique[]): string {
  return fiches.map(ficheTechniqueToMarkdown).join('\n\n');
}
