import { Menu } from '../models/menu.model';

export interface ParsedPlat {
  name: string;
  description: string | null;
  ficheTechniques: string[];
}

export interface ParsedMenuSection {
  name: string;
  plats: ParsedPlat[];
}

export interface ParsedMenu {
  name: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sections: ParsedMenuSection[];
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Parses the "## Section" / "### Plat" markdown format described to the user (H1 title + Key: value
 * metadata block + one "## Nom de section" per menu section, each containing one "### Nom du plat" per
 * dish) into a structured intermediate representation. Does not touch the API — callers resolve fiche
 * technique names against the existing catalog and build the actual MenuPayload themselves.
 */
export function parseMenuMarkdown(text: string): ParsedMenu {
  const lines = text.split(/\r?\n/);
  let i = 0;

  while (i < lines.length && lines[i].trim() === '') i++;

  if (i >= lines.length || !lines[i].trim().startsWith('# ')) {
    throw new Error('Le texte doit commencer par un titre de niveau 1, ex. "# Nom du menu".');
  }

  const name = lines[i].trim().slice(2).trim();
  if (!name) {
    throw new Error('Le titre du menu ne peut pas être vide.');
  }
  i++;

  const result: ParsedMenu = {
    name,
    description: null,
    startsAt: null,
    endsAt: null,
    sections: [],
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

    if (key === 'description') result.description = value;
    else if (key === 'debut') result.startsAt = value;
    else if (key === 'fin') result.endsAt = value;

    i++;
  }

  if (result.startsAt && !result.endsAt) {
    result.endsAt = result.startsAt;
  }

  let currentSection: ParsedMenuSection | null = null;
  let currentPlat: ParsedPlat | null = null;
  let descBuffer: string[] = [];

  const flushPlat = () => {
    if (currentPlat && currentSection) {
      currentPlat.description = descBuffer.join('\n').trim() || null;
      currentSection.plats.push(currentPlat);
    }
    currentPlat = null;
    descBuffer = [];
  };

  const flushSection = () => {
    flushPlat();
    if (currentSection) result.sections.push(currentSection);
    currentSection = null;
  };

  for (; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed.startsWith('## ')) {
      flushSection();
      currentSection = { name: trimmed.slice(3).trim(), plats: [] };
      continue;
    }

    if (trimmed.startsWith('### ')) {
      if (!currentSection) continue;
      flushPlat();
      currentPlat = { name: trimmed.slice(4).trim(), description: null, ficheTechniques: [] };
      continue;
    }

    if (trimmed === '') {
      if (currentPlat) descBuffer.push('');
      continue;
    }

    if (!currentPlat) continue;

    const match = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (match && normalize(match[1]) === 'fiches') {
      currentPlat.ficheTechniques = match[2]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }

    descBuffer.push(raw);
  }
  flushSection();

  return result;
}

export interface ParsedMenuBlock {
  raw: string;
  value: ParsedMenu | null;
  error: string | null;
}

/**
 * Splits a pasted text into one block per menu. No dedicated separator is needed — each menu
 * already starts with its own "# Titre" (H1), so a new H1 simply starts a new block. Content
 * before the first H1 (blank lines, stray text) is dropped.
 */
export function splitMenuBlocks(text: string): string[] {
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

/** Parses a pasted text containing one or more menus, one result per detected block. */
export function parseMultipleMenus(text: string): ParsedMenuBlock[] {
  return splitMenuBlocks(text).map((raw) => {
    try {
      return { raw, value: parseMenuMarkdown(raw), error: null };
    } catch (error) {
      return { raw, value: null, error: error instanceof Error ? error.message : 'Texte illisible.' };
    }
  });
}

/**
 * Serializes a menu back to the same "## Section" / "### Plat" markdown format the import screen
 * parses, so an export can be re-imported unchanged.
 */
export function menuToMarkdown(menu: Menu): string {
  const header = [`# ${menu.name}`];
  if (menu.description) header.push(`Description: ${menu.description}`);
  if (menu.starts_at) header.push(`Début: ${menu.starts_at}`);
  if (menu.ends_at && menu.ends_at !== menu.starts_at) header.push(`Fin: ${menu.ends_at}`);

  const sections = (menu.sections ?? []).map((section) => {
    const plats = (section.plats ?? []).map((plat) => {
      const lines = [`### ${plat.name}`];
      if (plat.description) lines.push(plat.description);
      if (plat.fiche_techniques?.length) {
        lines.push(`Fiches: ${plat.fiche_techniques.map((fiche) => fiche.name).join(', ')}`);
      }
      return lines.join('\n');
    });

    return [`## ${section.name}`, ...plats].join('\n\n');
  });

  return [header.join('\n'), ...sections].join('\n\n');
}

/** Joins multiple menus into a single pasteable text, each starting with its own "# Titre". */
export function menusToMarkdown(menus: Menu[]): string {
  return menus.map(menuToMarkdown).join('\n\n');
}
