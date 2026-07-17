export interface Message {
  id: number;
  channel_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  created_at: string;
  user: { id: number; name: string };
}

export interface MessagePayload {
  channel_id: number;
  content: string;
  parent_id?: number | null;
}
