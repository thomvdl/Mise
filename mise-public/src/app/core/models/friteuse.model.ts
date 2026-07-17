import { ChangementHuile } from './changement-huile.model';

export interface Friteuse {
  id: number;
  name: string;
  duree_vie_jours: number;
  changements_huile?: ChangementHuile[];
}
