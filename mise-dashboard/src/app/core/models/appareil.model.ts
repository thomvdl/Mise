export interface Appareil {
  id: number;
  name: string;
  abbreviation: string;
  fonction: string;
  temperature_min: number | null;
  temperature_max: number | null;
  zigbee_device_id: string | null;
}

export type AppareilPayload = Omit<Appareil, 'id'>;
