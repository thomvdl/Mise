export interface ChangementHuile {
  id: number;
  friteuse_id: number;
  date_changement: string;
}

export interface ChangementHuilePayload {
  friteuse_id: number;
  date_changement?: string;
}
