import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EventService } from '../../core/services/event.service';
import { MenuService } from '../../core/services/menu.service';
import { CalendarEvent, EVENT_TYPES } from '../../core/models/calendar-event.model';
import { Menu } from '../../core/models/menu.model';
import { buildMonthGrid, eventsOnDay, toIsoDate } from '../../core/utils/calendar-grid';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

@Component({
  selector: 'app-event-calendar',
  imports: [FormsModule, ConfirmDialog],
  templateUrl: './event-calendar.html',
  styleUrl: './event-calendar.css',
})
export class EventCalendar implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly menuService = inject(MenuService);

  readonly weekdayLabels = WEEKDAY_LABELS;
  readonly eventTypes = EVENT_TYPES;

  currentYear = signal(new Date().getFullYear());
  currentMonth = signal(new Date().getMonth() + 1);

  events = signal<CalendarEvent[]>([]);
  menus = signal<Menu[]>([]);

  grid = computed(() => buildMonthGrid(this.currentYear(), this.currentMonth()));

  monthLabel = computed(() =>
    new Date(this.currentYear(), this.currentMonth() - 1, 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    }),
  );

  showForm = signal(false);
  editingEvent = signal<CalendarEvent | null>(null);
  formName = signal('');
  formDetail = signal('');
  formHoraire = signal('');
  formCouverts = signal<number | null>(null);
  formType = signal<string | null>(null);
  formStartDate = signal('');
  formEndDate = signal('');
  formMenuId = signal<number | null>(null);
  formError = signal<string | null>(null);

  pendingDelete = signal<CalendarEvent | null>(null);

  ngOnInit(): void {
    this.menuService.list().subscribe((menus) => this.menus.set(menus));
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
    this.editingEvent.set(null);
    this.formName.set('');
    this.formDetail.set('');
    this.formHoraire.set('');
    this.formCouverts.set(null);
    this.formType.set(null);
    this.formStartDate.set(iso);
    this.formEndDate.set(iso);
    this.formMenuId.set(null);
    this.formError.set(null);
    this.showForm.set(true);
  }

  openEditEventForm(event: CalendarEvent, domEvent: Event): void {
    domEvent.stopPropagation();
    this.editingEvent.set(event);
    this.formName.set(event.name);
    this.formDetail.set(event.detail ?? '');
    this.formHoraire.set(event.horaire ?? '');
    this.formCouverts.set(event.couverts);
    this.formType.set(event.type);
    this.formStartDate.set(event.start_date);
    this.formEndDate.set(event.end_date);
    this.formMenuId.set(event.menu_id);
    this.formError.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  saveEvent(): void {
    const name = this.formName().trim();
    const startDate = this.formStartDate();
    const endDate = this.formEndDate() || startDate;
    if (!name || !startDate) return;

    const payload = {
      name,
      detail: this.formDetail().trim() || null,
      horaire: this.formHoraire().trim() || null,
      couverts: this.formCouverts(),
      type: this.formType(),
      start_date: startDate,
      end_date: endDate,
      menu_id: this.formMenuId(),
    };
    const editing = this.editingEvent();
    const request = editing ? this.eventService.update(editing.id, payload) : this.eventService.create(payload);

    this.formError.set(null);
    request.subscribe({
      next: () => {
        this.showForm.set(false);
        this.loadEvents();
      },
      error: () => this.formError.set("Une erreur est survenue lors de l'enregistrement."),
    });
  }

  confirmDeleteFromForm(): void {
    this.pendingDelete.set(this.editingEvent());
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const event = this.pendingDelete();
    if (!event) return;

    this.eventService.delete(event.id).subscribe(() => {
      this.pendingDelete.set(null);
      this.showForm.set(false);
      this.loadEvents();
    });
  }

  protected readonly toIsoDate = toIsoDate;
}
