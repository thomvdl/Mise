export interface PrintedLabelPayload {
  type_key: string;
  product_name: string;
  date: string;
  use_by_date?: string | null;
  quantity: number;
  printed_via: 'browser' | 'brother_ql';
}
