export interface Picture {
  id: number;
  url: string;
  fiche_technique: { id: number; name: string; slug: string } | null;
}
