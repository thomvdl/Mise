import { Station } from './station.model';

export type MiseEnPlaceStatus = 'todo' | 'done';
export type MiseEnPlaceUrgency = 'faible' | 'moyenne' | 'urgente';

export interface MiseEnPlaceItem {
  id: number;
  name: string;
  status: MiseEnPlaceStatus;
  deadline: string | null;
  urgency: MiseEnPlaceUrgency;
  created_at: string;
  user: { id: number; name: string };
  station: Station;
}
