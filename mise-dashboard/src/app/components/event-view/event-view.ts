import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { EventService } from '../../core/services/event.service';
import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { MiseEnPlaceItemService } from '../../core/services/mise-en-place-item.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { CalendarEvent, EVENT_TYPES, EventPlat } from '../../core/models/calendar-event.model';
import { Allergen } from '../../core/models/allergen.model';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Ingredient } from '../../core/models/ingredient.model';
import { IngredientCategory } from '../../core/models/ingredient-category.model';
import { MiseEnPlaceItem } from '../../core/models/mise-en-place-item.model';
import { checkPlatAllergens } from '../../core/utils/event-allergens';
import { eventMerchandiseGroups } from '../../core/utils/event-merchandise';
import { buildPlatsAllergenGrid } from '../../core/utils/menu-allergen-grid';
import { formatQuantity } from '../../core/utils/format-quantity';
import { useReportTitle } from '../../core/utils/report-title';

/**
 * Fiche d'un événement, en lecture et imprimable : infos, allergies du groupe, plats et pax,
 * grille allergènes, mise en place générée et liste de marchandise. La modification se fait sur
 * `/calendrier/:id/modifier` (EventForm).
 */
@Component({
  selector: 'app-event-view',
  imports: [RouterLink, DatePipe],
  templateUrl: './event-view.html',
  styleUrl: './event-view.css',
})
export class EventView {
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  private readonly miseEnPlaceService = inject(MiseEnPlaceItemService);
  private readonly setReportTitle = useReportTitle(inject(Title), inject(DestroyRef));

  private readonly eventId = toSignal(this.route.paramMap.pipe(map((params) => Number(params.get('id')))), {
    initialValue: NaN,
  });

  event = signal<CalendarEvent | null>(null);
  notFound = signal(false);
  miseEnPlace = signal<MiseEnPlaceItem[] | null>(null);

  private readonly fichesById = toSignal(
    inject(FicheTechniqueService).list().pipe(map((fiches) => new Map<number, FicheTechnique>(fiches.map((f) => [f.id, f])))),
  );
  private readonly ingredientsById = toSignal(
    inject(IngredientService).list().pipe(map((items) => new Map<number, Ingredient>(items.map((i) => [i.id, i])))),
    { initialValue: new Map<number, Ingredient>() },
  );
  private readonly allergens = toSignal(new SimpleEntityService<Allergen>(inject(HttpClient), 'allergens').list(), {
    initialValue: [] as Allergen[],
  });
  private readonly categories = toSignal(
    new SimpleEntityService<IngredientCategory>(inject(HttpClient), 'ingredient-categories').list(),
    { initialValue: [] as IngredientCategory[] },
  );

  printingLabel = signal(false);
  printLabelError = signal<string | null>(null);

  plats = computed<EventPlat[]>(() => this.event()?.plats ?? []);

  /** Plats regroupés par section (dans l'ordre), avec le total des pax de chaque section. */
  sections = computed(() => {
    const sections: { name: string; plats: EventPlat[]; pax: number }[] = [];
    for (const plat of this.plats()) {
      let section = sections.at(-1);
      if (!section || section.name !== plat.section) {
        section = { name: plat.section, plats: [], pax: 0 };
        sections.push(section);
      }
      section.plats.push(plat);
      section.pax += plat.pax;
    }
    return sections;
  });

  groupAllergenIds = computed(() => new Set((this.event()?.allergens ?? []).map((a) => a.id)));

  /** Avertissement allergies par plat (vide si le groupe n'a pas d'allergie). `null` tant que les
   * fiches ne sont pas chargées, pour ne pas afficher un faux « à vérifier ». */
  platChecks = computed(() => {
    const fichesById = this.fichesById();
    const group = this.event()?.allergens ?? [];
    if (!fichesById) return null;
    return new Map(
      this.plats().map((plat) => [
        plat.id,
        checkPlatAllergens(plat.fiche_techniques.map((f) => f.id), group, fichesById, this.ingredientsById()),
      ]),
    );
  });

  allergyAlerts = computed(() => {
    const checks = [...(this.platChecks()?.values() ?? [])];
    return {
      conflicts: checks.filter((c) => c.conflicts.length > 0).length,
      unverifiable: (this.event()?.allergens.length ?? 0) > 0 ? checks.filter((c) => c.unverifiable).length : 0,
    };
  });

  grid = computed(() => {
    const fichesById = this.fichesById();
    if (!fichesById || this.plats().length === 0) return null;
    const plats = this.plats().map((plat) => ({
      id: plat.id,
      name: plat.name,
      sectionName: plat.section,
      ficheIds: plat.fiche_techniques.map((f) => f.id),
    }));
    return buildPlatsAllergenGrid(plats, fichesById, this.ingredientsById(), this.allergens());
  });

  merchandiseGroups = computed(() =>
    eventMerchandiseGroups(
      this.plats().map((plat) => ({ pax: plat.pax, ficheIds: plat.fiche_techniques.map((f) => f.id) })),
      this.fichesById() ?? new Map(),
      this.categories(),
    ),
  );

  miseEnPlaceDone = computed(() => (this.miseEnPlace() ?? []).filter((item) => item.status === 'done').length);

  constructor() {
    effect(() => {
      const id = this.eventId();
      if (!id || Number.isNaN(id)) return;

      this.eventService.get(id).subscribe({
        next: (event) => this.event.set(event),
        error: () => this.notFound.set(true),
      });
      this.miseEnPlaceService.list().subscribe({
        next: (items) => this.miseEnPlace.set(items.filter((item) => item.event?.id === id)),
        error: () => this.miseEnPlace.set([]),
      });
    });

    effect(() => {
      const event = this.event();
      this.setReportTitle(event ? `Événement — ${event.name} — ${event.start_date}` : 'Événement');
    });
  }

  eventTypeLabel(type: string | null): string | null {
    return EVENT_TYPES.find((t) => t.key === type)?.label ?? null;
  }

  /** « samedi 12 décembre 2026 » — la date `Y-m-d` est lue en heure locale (pas `new Date(iso)`,
   * qui la prend en UTC et peut afficher la veille). */
  longDate(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  isGroupAllergen(allergenId: number): boolean {
    return this.groupAllergenIds().has(allergenId);
  }

  hasAllergen(row: { allergenIds: Set<number> }, allergenId: number): boolean {
    return row.allergenIds.has(allergenId);
  }

  print(): void {
    window.print();
  }

  printLabel(): void {
    const event = this.event();
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

  generatedAt(): string {
    return new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatQuantity = formatQuantity;
}
