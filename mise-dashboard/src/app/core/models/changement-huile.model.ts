import { Friteuse } from './friteuse.model';

export interface ChangementHuile {
  id: number;
  friteuse_id: number;
  date_changement: string;
  friteuse?: Friteuse;
}

export interface ChangementHuilePayload {
  friteuse_id: number;
  date_changement?: string;
}
