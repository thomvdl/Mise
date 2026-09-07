import { Station } from './station.model';

export type ShoppingStatus = 'todo' | 'done';

export interface ShoppingItem {
  id: number;
  name: string;
  status: ShoppingStatus;
  created_at: string;
  user: { id: number; name: string };
  station: Station | null;
}
