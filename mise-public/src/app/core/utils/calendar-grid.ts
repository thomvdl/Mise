import { CalendarEvent } from '../models/calendar-event.model';

export interface CalendarCell {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
  isToday: boolean;
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Monday-first grid of 6 full weeks (42 days), including leading/trailing days from adjacent months. */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month - 1, 1 - firstWeekday);
  const today = toIsoDate(new Date());

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const iso = toIsoDate(date);
    cells.push({
      date,
      iso,
      inCurrentMonth: date.getMonth() === month - 1,
      isToday: iso === today,
    });
  }
  return cells;
}

export function eventsOnDay(events: CalendarEvent[], iso: string): CalendarEvent[] {
  return events.filter((event) => event.start_date <= iso && event.end_date >= iso);
}
