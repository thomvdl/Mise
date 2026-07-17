import { ChangementHuile } from './changement-huile.model';

export interface Friteuse {
  id: number;
  name: string;
  duree_vie_jours: number;
  changements_huile?: ChangementHuile[];
}

export type FriteusePayload = Omit<Friteuse, 'id' | 'changements_huile'>;
