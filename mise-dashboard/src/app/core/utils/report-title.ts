import { DestroyRef } from '@angular/core';
import { Title } from '@angular/platform-browser';

/**
 * Fixe le titre du document pour la durée de vie du composant, puis restaure le titre précédent
 * à la destruction — sans ça, quitter une page de rapport laisserait l'onglet/la fenêtre du
 * navigateur sur un titre de rapport périmé. Utile car Chrome propose ce titre comme nom de
 * fichier par défaut pour "Enregistrer en PDF" : un titre dynamique et descriptif évite que tous
 * les rapports exportés s'appellent pareil.
 */
export function useReportTitle(titleService: Title, destroyRef: DestroyRef): (title: string) => void {
  const previousTitle = titleService.getTitle();
  destroyRef.onDestroy(() => titleService.setTitle(previousTitle));
  return (title: string) => titleService.setTitle(title);
}

/** Date du jour au format JJ-MM-AAAA, pour suffixer les titres de rapport. */
export function todayDDMMYYYY(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${now.getFullYear()}`;
}
