export interface NettoyageFrequence {
  key: string;
  label: string;
}

/** Dans l'ordre d'affichage : de la plus fréquente à la moins fréquente. */
export const NETTOYAGE_FREQUENCES: NettoyageFrequence[] = [
  { key: 'apres_utilisation', label: 'Après chaque utilisation' },
  { key: 'apres_service', label: 'Après chaque service' },
  { key: 'quotidien', label: 'Tous les jours' },
  { key: 'hebdomadaire', label: 'Chaque semaine' },
  { key: 'mensuel', label: 'Chaque mois' },
  { key: 'trimestriel', label: 'Chaque trimestre' },
  { key: 'annuel', label: 'Chaque année' },
];

export function frequenceLabel(key: string): string {
  return NETTOYAGE_FREQUENCES.find((f) => f.key === key)?.label ?? key;
}

/** Rang de la fréquence pour trier les tâches (inconnue = en dernier). */
export function frequenceRank(key: string): number {
  const index = NETTOYAGE_FREQUENCES.findIndex((f) => f.key === key);
  return index === -1 ? NETTOYAGE_FREQUENCES.length : index;
}

/** Une ligne du plan de nettoyage : quoi (`name`), où (`zone`), quand (`frequence` + `moment`),
 * qui (`responsable`), avec quoi (`produit`) et comment (`methode`). */
export interface NettoyageTache {
  id: number;
  zone: string;
  name: string;
  frequence: string;
  moment: string | null;
  responsable: string | null;
  produit: string | null;
  methode: string | null;
  /** Dernière fois que la tâche a été marquée faite (renvoyée par la liste du plan), ou null. */
  derniere_realisation?: NettoyageRealisation | null;
}

/** Une ligne du registre : qui a fait quelle tâche, et quand (`created_at`, heure du serveur).
 * `zone`/`tache_name` sont recopiés au moment où c'est fait — la tâche a pu être renommée ou
 * supprimée depuis (`nettoyage_tache_id` null). */
export interface NettoyageRealisation {
  id: number;
  nettoyage_tache_id: number | null;
  zone: string;
  tache_name: string;
  user_id: number | null;
  user_name: string;
  created_at: string;
}

export type NettoyageTachePayload = Omit<NettoyageTache, 'id'>;

/** Fréquences qui reviennent chaque jour — celles affichées dans « Nettoyage du jour » des
 * tableaux de bord. `apres_utilisation` en est exclu : c'est un réflexe continu, pas une tâche
 * à planifier dans la journée. */
const DU_JOUR = ['apres_service', 'quotidien'];

/** Tâches du jour, triées par zone puis fréquence puis nom. */
export function nettoyageDuJour(taches: NettoyageTache[]): NettoyageTache[] {
  return taches
    .filter((t) => DU_JOUR.includes(t.frequence))
    .sort(
      (a, b) =>
        a.zone.localeCompare(b.zone, 'fr') ||
        frequenceRank(a.frequence) - frequenceRank(b.frequence) ||
        a.name.localeCompare(b.name, 'fr'),
    );
}

/** Début de la période en cours pour une fréquence : aujourd'hui pour les tâches quotidiennes
 * (et après service/utilisation), lundi pour l'hebdomadaire, le 1er du mois, du trimestre ou de
 * l'année pour les autres. */
function periodStart(frequence: string, now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (frequence) {
    case 'hebdomadaire':
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      return start;
    case 'mensuel':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'trimestriel':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case 'annuel':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return start;
  }
}

/** La tâche a-t-elle été faite depuis le début de sa période en cours ? */
export function isFaitPourPeriode(tache: NettoyageTache, now = new Date()): boolean {
  const derniere = tache.derniere_realisation;
  return !!derniere && new Date(derniere.created_at) >= periodStart(tache.frequence, now);
}

/** « aujourd'hui à 14:32 » ou « le 03/11 à 09:15 ». */
export function formatRealisation(createdAt: string, now = new Date()): string {
  const date = new Date(createdAt);
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `aujourd'hui à ${time}`;
  return `le ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${time}`;
}
