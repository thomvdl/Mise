import { Allergen } from './allergen.model';
import { FicheTechnique } from './fiche-technique.model';

export interface EventType {
  key: string;
  label: string;
}

export const EVENT_TYPES: EventType[] = [
  { key: 'brunch', label: 'Brunch' },
  { key: 'groupe', label: 'Groupe' },
  { key: 'evenement', label: 'Événement' },
  { key: 'autre', label: 'Autre' },
];

export interface CalendarEvent {
  id: number;
  name: string;
  detail: string | null;
  horaire: string | null;
  /** Nombre de couverts prévus — optionnel, pas toujours connu à l'avance. */
  couverts: number | null;
  type: string | null;
  start_date: string;
  end_date: string;
  menu_id: number | null;
  menu: { id: number; name: string } | null;
  /** Allergènes à éviter pour le groupe, et détail libre (qui, combien, régimes). */
  allergens: Allergen[];
  allergies_note: string | null;
  /** Chargé seulement par `GET /api/events/:id` (détail), pas par la liste du calendrier. */
  plats?: EventPlat[];
}

/** Un plat prévu pour l'événement et son nombre de pax (section = Entrée, Plat, Dessert…). */
export interface EventPlat {
  id: number;
  section: string;
  name: string;
  pax: number;
  position: number;
  fiche_techniques: FicheTechnique[];
}
