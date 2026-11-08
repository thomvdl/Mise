import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { EventService } from '../../core/services/event.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { CalendarEvent, EVENT_TYPES, EventPlat } from '../../core/models/calendar-event.model';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Ingredient } from '../../core/models/ingredient.model';
import { PlatAllergenCheck, checkPlatAllergens } from '../../core/utils/event-allergens';
import { buildMonthGrid, eventsOnDay } from '../../core/utils/calendar-grid';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

@Component({
  selector: 'app-calendrier',
  imports: [RouterLink, DatePipe],
  templateUrl: './calendrier.html',
  styleUrl: './calendrier.css',
})
export class Calendrier implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly ingredientService = inject(IngredientService);

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

  selectedEvent = signal<CalendarEvent | null>(null);
  /** Plats de l'événement ouvert, chargés à l'ouverture du détail (`null` pendant le chargement). */
  selectedPlats = signal<EventPlat[] | null>(null);

  /** Fiches et ingrédients complets, chargés une fois au premier détail ouvert — nécessaires pour
   * retrouver les allergènes des plats (sous-recettes comprises). */
  private readonly fichesById = signal(new Map<number, FicheTechnique>());
  private readonly ingredientsById = signal(new Map<number, Ingredient>());
  private referencesLoaded = false;

  /** Plats regroupés par section (Entrée, Plat…), dans l'ordre. */
  platSections = computed(() => {
    const sections: { name: string; plats: EventPlat[] }[] = [];
    for (const plat of this.selectedPlats() ?? []) {
      const last = sections.at(-1);
      if (last && last.name === plat.section) last.plats.push(plat);
      else sections.push({ name: plat.section, plats: [plat] });
    }
    return sections;
  });

  /** Vérification de chaque plat face aux allergies du groupe (vide si aucune allergie). */
  platChecks = computed(() => {
    const group = this.selectedEvent()?.allergens ?? [];
    const checks = new Map<number, PlatAllergenCheck>();
    if (group.length === 0) return checks;
    for (const plat of this.selectedPlats() ?? []) {
      const ficheIds = plat.fiche_techniques.map((f) => f.id);
      checks.set(plat.id, checkPlatAllergens(ficheIds, group, this.fichesById(), this.ingredientsById()));
    }
    return checks;
  });

  openDetail(event: CalendarEvent): void {
    this.selectedEvent.set(event);
    this.selectedPlats.set(null);
    this.printLabelError.set(null);

    this.eventService.get(event.id).subscribe({
      next: (full) => {
        if (this.selectedEvent()?.id !== event.id) return;
        this.selectedEvent.set(full);
        this.selectedPlats.set(full.plats ?? []);
      },
      error: () => this.selectedPlats.set([]),
    });

    if (!this.referencesLoaded) {
      this.referencesLoaded = true;
      this.ficheTechniqueService.list().subscribe((fiches) => this.fichesById.set(new Map(fiches.map((f) => [f.id, f]))));
      this.ingredientService.list().subscribe((items) => this.ingredientsById.set(new Map(items.map((i) => [i.id, i]))));
    }
  }

  closeDetail(): void {
    this.selectedEvent.set(null);
  }

  printingLabel = signal(false);
  printLabelError = signal<string | null>(null);

  printLabel(): void {
    const event = this.selectedEvent();
    if (!event) return;

    this.printingLabel.set(true);
    this.printLabelError.set(null);
    this.eventService.printLabel(event.id).subscribe({
      next: () => this.printingLabel.set(false),
      error: () => {
        this.printingLabel.set(false);
        this.printLabelError.set("Impossible d'imprimer l'étiquette.");
      },
    });
  }

  eventTypeLabel(type: string | null): string | null {
    return EVENT_TYPES.find((eventType) => eventType.key === type)?.label ?? type;
  }
}
