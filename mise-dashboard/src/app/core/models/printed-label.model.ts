export interface PrintedLabel {
  id: number;
  user_id: number | null;
  user_name: string;
  type_key: string;
  product_name: string;
  date: string;
  use_by_date: string | null;
  quantity: number;
  printed_via: 'browser' | 'brother_ql' | 'zebra_network';
  created_at: string;
}

export interface PrintedLabelPayload {
  type_key: string;
  product_name: string;
  date: string;
  use_by_date?: string | null;
  quantity: number;
  printed_via: 'browser' | 'zebra_network';
}

/** Payload envoyé à /printed-labels/print-zebra — pas de `printed_via` : le serveur l'impose lui-même. */
export interface ZebraPrintPayload {
  type_key: string;
  product_name: string;
  date: string;
  use_by_date?: string | null;
  quantity: number;
}
