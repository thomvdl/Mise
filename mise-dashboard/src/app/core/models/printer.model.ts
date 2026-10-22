export type PrinterType = 'label' | 'thermal';

export interface Printer {
  id: number;
  name: string;
  type: PrinterType;
  ip: string;
  dpi: number;
  label_width_mm: number;
  label_height_mm: number;
  rotate_90: boolean;
  top_offset_mm: number;
  /** Uniquement pour `type: 'thermal'` (58 ou 80mm) — null/absent sur une imprimante étiquette. */
  paper_width_mm: number | null;
  is_default: boolean;
}

export interface PrinterPayload {
  name: string;
  type?: PrinterType;
  ip: string;
  dpi?: number;
  label_width_mm?: number;
  label_height_mm?: number;
  rotate_90?: boolean;
  top_offset_mm?: number;
  paper_width_mm?: number | null;
  is_default?: boolean;
}
