import { Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { MenuService } from '../../core/services/menu.service';
import { TemperatureReleveService } from '../../core/services/temperature-releve.service';
import { FriteuseService } from '../../core/services/friteuse.service';
import { EventService } from '../../core/services/event.service';
import { MiseEnPlaceItemService } from '../../core/services/mise-en-place-item.service';
import { ShoppingItemService } from '../../core/services/shopping-item.service';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Menu } from '../../core/models/menu.model';
import { TemperatureReleve } from '../../core/models/temperature-releve.model';
import { Friteuse } from '../../core/models/friteuse.model';
import { CalendarEvent, EVENT_TYPES } from '../../core/models/calendar-event.model';
import { MiseEnPlaceItem, MiseEnPlaceUrgency } from '../../core/models/mise-en-place-item.model';
import { ShoppingItem } from '../../core/models/shopping-item.model';
import { isChangeOverdue, nextChangeDate } from '../../core/utils/friteuse-schedule';

const FICHE_LIMIT = 24;
const MENU_LIMIT = 5;
const RELEVE_LIMIT = 10;
const HUILE_LIMIT = 6;
const EVENT_LIMIT = 8;
const LIST_LIMIT = 10;

/** Fenêtre de relevés chargée pour la tuile températures — suffisant pour remplir 10 lignes
 * sans rapatrier tout l'historique (les capteurs Zigbee peuvent relever en continu). */
const RELEVE_WINDOW_DAYS = 30;

const URGENCY_RANK: Record<MiseEnPlaceUrgency, number> = { urgente: 0, moyenne: 1, faible: 2 };

/** État d'une tuile : `null` tant que le chargement n'est pas terminé, `'error'` si l'appel a
 * échoué — chaque tuile charge indépendamment, une API en erreur ne bloque pas les autres. */
type TileState<T> = T[] | null | 'error';

/** Date locale `Y-m-d`, comparable telle quelle aux `start_date`/`end_date` des événements
 * (pas `toISOString()`, qui passe en UTC et décale d'un jour en début de matinée). */
function localDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function byDateDesc<T>(key: (item: T) => string | undefined) {
  return (a: T, b: T) => (key(b) ?? '').localeCompare(key(a) ?? '');
}

interface HuileRow {
  friteuse: Friteuse;
  date: string;
}

@Component({
  selector: 'app-home-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.css',
})
export class HomeDashboard implements OnInit {
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly menuService = inject(MenuService);
  private readonly temperatureReleveService = inject(TemperatureReleveService);
  private readonly friteuseService = inject(FriteuseService);
  private readonly eventService = inject(EventService);
  private readonly miseEnPlaceItemService = inject(MiseEnPlaceItemService);
  private readonly shoppingItemService = inject(ShoppingItemService);

  fiches = signal<TileState<FicheTechnique>>(null);
  menus = signal<TileState<Menu>>(null);
  releves = signal<TileState<TemperatureReleve>>(null);
  friteuses = signal<TileState<Friteuse>>(null);
  events = signal<TileState<CalendarEvent>>(null);
  miseEnPlace = signal<TileState<MiseEnPlaceItem>>(null);
  courses = signal<TileState<ShoppingItem>>(null);

  latestFiches = computed(() =>
    this.take(
      this.fiches(),
      FICHE_LIMIT,
      byDateDesc((f) => f.updated_at),
    ),
  );
  latestMenus = computed(() =>
    this.take(
      this.menus(),
      MENU_LIMIT,
      byDateDesc((m) => m.updated_at),
    ),
  );
  latestReleves = computed(() =>
    this.take(
      this.releves(),
      RELEVE_LIMIT,
      byDateDesc((r) => r.recorded_at),
    ),
  );

  /** Tous les changements d'huile de toutes les friteuses, à plat, du plus récent au plus ancien. */
  latestHuile = computed<HuileRow[] | null | 'error'>(() => {
    const friteuses = this.friteuses();
    if (!Array.isArray(friteuses)) return friteuses;
    return friteuses
      .flatMap((friteuse) =>
        (friteuse.changements_huile ?? []).map((c) => ({ friteuse, date: c.date_changement })),
      )
      .sort(byDateDesc((row) => row.date))
      .slice(0, HUILE_LIMIT);
  });

  overdueFriteuses = computed(() => {
    const friteuses = this.friteuses();
    return Array.isArray(friteuses) ? friteuses.filter(isChangeOverdue) : [];
  });

  upcomingEvents = computed(() => {
    const events = this.events();
    if (!Array.isArray(events)) return events;
    const today = localDateString(new Date());
    return events
      .filter((e) => e.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, EVENT_LIMIT);
  });

  /** Tâches à faire, les plus urgentes d'abord puis par échéance la plus proche (sans échéance en dernier). */
  pendingMiseEnPlace = computed(() => {
    const items = this.miseEnPlace();
    if (!Array.isArray(items)) return items;
    return items
      .filter((i) => i.status === 'todo')
      .sort(
        (a, b) =>
          URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
          (a.deadline ?? '￿').localeCompare(b.deadline ?? '￿'),
      );
  });

  pendingCourses = computed(() => {
    const items = this.courses();
    return Array.isArray(items) ? items.filter((i) => i.status === 'todo') : items;
  });

  readonly listLimit = LIST_LIMIT;
  readonly isChangeOverdue = isChangeOverdue;
  readonly nextChangeDate = nextChangeDate;

  ngOnInit() {
    const from = new Date();
    from.setDate(from.getDate() - RELEVE_WINDOW_DAYS);

    this.load(this.ficheTechniqueService.list(), this.fiches);
    this.load(this.menuService.list(), this.menus);
    this.load(this.temperatureReleveService.list({ from: localDateString(from) }), this.releves);
    this.load(this.friteuseService.list(), this.friteuses);
    this.load(this.eventService.listAll(), this.events);
    this.load(this.miseEnPlaceItemService.list(), this.miseEnPlace);
    this.load(this.shoppingItemService.list(), this.courses);
  }

  isOutOfRange(releve: TemperatureReleve): boolean {
    const appareil = releve.appareil;
    if (!appareil) return false;
    return (
      (appareil.temperature_min !== null && releve.temperature < appareil.temperature_min) ||
      (appareil.temperature_max !== null && releve.temperature > appareil.temperature_max)
    );
  }

  eventTypeLabel(type: string | null): string | null {
    return EVENT_TYPES.find((t) => t.key === type)?.label ?? null;
  }

  isToday(event: CalendarEvent): boolean {
    const today = localDateString(new Date());
    return event.start_date <= today && event.end_date >= today;
  }

  /** Station, groupe ou événement auquel la tâche est rattachée (un seul des trois). */
  miseEnPlaceTarget(item: MiseEnPlaceItem): string {
    return item.station?.name ?? item.group?.name ?? item.event?.name ?? '';
  }

  private load<T>(source: Observable<T[]>, target: WritableSignal<TileState<T>>) {
    source.subscribe({
      next: (items) => target.set(items),
      error: () => target.set('error'),
    });
  }

  private take<T>(
    state: TileState<T>,
    limit: number,
    compare: (a: T, b: T) => number,
  ): TileState<T> {
    return Array.isArray(state) ? [...state].sort(compare).slice(0, limit) : state;
  }
}
