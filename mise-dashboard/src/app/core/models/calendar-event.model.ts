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
}

export interface CalendarEventPayload {
  name: string;
  detail: string | null;
  horaire: string | null;
  couverts: number | null;
  type: string | null;
  start_date: string;
  end_date: string;
  menu_id: number | null;
}
