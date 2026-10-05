import { Station } from './station.model';
import { Group } from './group.model';
import { CalendarEvent } from './calendar-event.model';

export type MiseEnPlaceStatus = 'todo' | 'done';
export type MiseEnPlaceUrgency = 'faible' | 'moyenne' | 'urgente';

/** Une tâche se rattache à une station, un groupe ou un événement — un seul des trois, jamais
 * zéro (imposé côté API) : les deux autres sont alors `null`. */
export interface MiseEnPlaceItem {
  id: number;
  name: string;
  status: MiseEnPlaceStatus;
  deadline: string | null;
  urgency: MiseEnPlaceUrgency;
  created_at: string;
  user: { id: number; name: string };
  station: Station | null;
  group: Group | null;
  event: CalendarEvent | null;
}
