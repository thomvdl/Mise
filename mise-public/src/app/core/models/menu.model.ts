import { FicheTechnique } from './fiche-technique.model';

export interface PlatFicheTechnique extends FicheTechnique {
  pivot: { position: number };
}

export interface Plat {
  id: number;
  menu_section_id: number;
  name: string;
  description: string | null;
  position: number;
  fiche_techniques?: PlatFicheTechnique[];
}

export interface MenuSection {
  id: number;
  menu_id: number;
  name: string;
  position: number;
  plats?: Plat[];
}

export interface Menu {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  /** ISO date (YYYY-MM-DD), or null for a menu with no defined period. */
  starts_at: string | null;
  /** ISO date (YYYY-MM-DD). Equal to `starts_at` for a one-shot (single-day) menu. */
  ends_at: string | null;
  created_at: string;
  sections?: MenuSection[];
}
