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
