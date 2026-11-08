import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { EventService } from '../../core/services/event.service';
import { CalendarEvent } from '../../core/models/calendar-event.model';
import { buildMonthGrid, eventsOnDay, toIsoDate } from '../../core/utils/calendar-grid';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

@Component({
  selector: 'app-event-calendar',
  imports: [DatePipe],
  templateUrl: './event-calendar.html',
  styleUrl: './event-calendar.css',
})
export class EventCalendar implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);

  readonly weekdayLabels = WEEKDAY_LABELS;

  currentYear = signal(new Date().getFullYear());
  currentMonth = signal(new Date().getMonth() + 1);

  viewMode = signal<'calendar' | 'list'>('calendar');

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

  openNewEventDefault(): void {
    this.openNewEventForm(toIsoDate(new Date()));
  }

  openNewEventForm(iso: string): void {
    this.router.navigate(['/calendrier/nouveau'], { queryParams: { date: iso } });
  }

  openEditEventForm(event: CalendarEvent, domEvent: Event): void {
    domEvent.stopPropagation();
    this.router.navigate(['/calendrier', event.id]);
  }

  protected readonly toIsoDate = toIsoDate;
}
