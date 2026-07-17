import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EventService } from '../../core/services/event.service';
import { CalendarEvent, EVENT_TYPES } from '../../core/models/calendar-event.model';
import { buildMonthGrid, eventsOnDay } from '../../core/utils/calendar-grid';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

@Component({
  selector: 'app-calendrier',
  imports: [RouterLink],
  templateUrl: './calendrier.html',
  styleUrl: './calendrier.css',
})
export class Calendrier implements OnInit {
  private readonly eventService = inject(EventService);

  readonly weekdayLabels = WEEKDAY_LABELS;

  currentYear = signal(new Date().getFullYear());
  currentMonth = signal(new Date().getMonth() + 1);

  events = signal<CalendarEvent[]>([]);

  grid = computed(() => buildMonthGrid(this.currentYear(), this.currentMonth()));

  monthLabel = computed(() =>
    new Date(this.currentYear(), this.currentMonth() - 1, 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    }),
  );

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventService.list(this.currentMonth(), this.currentYear()).subscribe((events) => this.events.set(events));
  }

  prevMonth(): void {
    this.shiftMonth(-1);
  }

  nextMonth(): void {
    this.shiftMonth(1);
  }

  goToday(): void {
    const now = new Date();
    this.currentYear.set(now.getFullYear());
    this.currentMonth.set(now.getMonth() + 1);
    this.loadEvents();
  }

  private shiftMonth(delta: number): void {
    let month = this.currentMonth() + delta;
    let year = this.currentYear();
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    this.currentMonth.set(month);
    this.currentYear.set(year);
    this.loadEvents();
  }

  eventsOn(iso: string): CalendarEvent[] {
    return eventsOnDay(this.events(), iso);
  }

  selectedEvent = signal<CalendarEvent | null>(null);

  openDetail(event: CalendarEvent): void {
    this.selectedEvent.set(event);
  }

  closeDetail(): void {
    this.selectedEvent.set(null);
  }

  eventTypeLabel(type: string | null): string | null {
    return EVENT_TYPES.find((eventType) => eventType.key === type)?.label ?? type;
  }
}
