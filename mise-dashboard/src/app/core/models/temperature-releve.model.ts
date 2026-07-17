import { Appareil } from './appareil.model';

export interface TemperatureReleve {
  id: number;
  appareil_id: number;
  temperature: number;
  recorded_at: string;
  appareil?: Appareil;
}

export interface TemperatureRelevePayload {
  appareil_id: number;
  temperature: number;
  recorded_at?: string;
}
