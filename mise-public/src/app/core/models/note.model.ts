export interface Note {
  id: number;
  title: string;
  content: string | null;
  user_id: number;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  user: { id: number; name: string };
  parent: { id: number; title: string } | null;
  children: Note[];
}

export interface NotePayload {
  title: string;
  content: string | null;
  parent_id?: number | null;
}
