export interface Printer {
  id: number;
  name: string;
  ip: string;
  dpi: number;
  label_width_mm: number;
  label_height_mm: number;
  rotate_90: boolean;
  top_offset_mm: number;
  is_default: boolean;
}
