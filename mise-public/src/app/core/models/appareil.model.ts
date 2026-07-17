export interface Appareil {
  id: number;
  name: string;
  abbreviation: string;
  fonction: string;
  temperature_min: number | null;
  temperature_max: number | null;
}
