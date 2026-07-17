import { Friteuse } from '../models/friteuse.model';

/** Most recent oil change, or null if none has ever been logged. */
export function lastChangeDate(friteuse: Friteuse): string | null {
  const changements = friteuse.changements_huile ?? [];
  if (changements.length === 0) return null;

  return changements.reduce((latest, c) => (c.date_changement > latest ? c.date_changement : latest), changements[0].date_changement);
}

/** Suggested next change date (last change + oil lifespan), or null if no change is logged yet. */
export function nextChangeDate(friteuse: Friteuse): Date | null {
  const last = lastChangeDate(friteuse);
  if (!last) return null;

  const [year, month, day] = last.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + friteuse.duree_vie_jours);
  return date;
}

/** True once today is at or past the suggested change date. */
export function isChangeOverdue(friteuse: Friteuse): boolean {
  const next = nextChangeDate(friteuse);
  if (!next) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return next.getTime() <= today.getTime();
}
