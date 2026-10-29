import { Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { MenuService } from '../../core/services/menu.service';
import { TemperatureReleveService } from '../../core/services/temperature-releve.service';
import { AppareilService } from '../../core/services/appareil.service';
import { FriteuseService } from '../../core/services/friteuse.service';
import { EventService } from '../../core/services/event.service';
import { MiseEnPlaceItemService } from '../../core/services/mise-en-place-item.service';
import { ShoppingItemService } from '../../core/services/shopping-item.service';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { Menu } from '../../core/models/menu.model';
import { TemperatureReleve } from '../../core/models/temperature-releve.model';
import { Appareil } from '../../core/models/appareil.model';
import { Friteuse } from '../../core/models/friteuse.model';
import { CalendarEvent, EVENT_TYPES } from '../../core/models/calendar-event.model';
import { MiseEnPlaceItem, MiseEnPlaceUrgency } from '../../core/models/mise-en-place-item.model';
import { ShoppingItem } from '../../core/models/shopping-item.model';
import { isChangeOverdue, nextChangeDate } from '../../core/utils/friteuse-schedule';
import {
  MAX_SERIES,
  TemperatureMultiChart,
  TemperatureSeries,
} from '../temperature-multi-chart/temperature-multi-chart';

const FICHE_LIMIT = 24;
const MENU_LIMIT = 5;
const HUILE_LIMIT = 6;
const EVENT_LIMIT = 8;
const LIST_LIMIT = 10;

/** Fenêtre du graphique de la tuile températures — une semaine reste lisible dans une petite
 * tuile, et évite de rapatrier tout l'historique (les capteurs Zigbee peuvent relever en continu). */
const RELEVE_WINDOW_DAYS = 7;

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

/** Jour de la semaine abrégé ("lun.") d'une date `Y-m-d` (ou d'un datetime), lue en heure locale. */
function weekday(date: string | Date): string {
  if (typeof date === 'string') {
    const [y, m, d] = date.slice(0, 10).split('-').map(Number);
    date = new Date(y, m - 1, d);
  }
  return date.toLocaleDateString('fr-FR', { weekday: 'short' });
}

function byDateDesc<T>(key: (item: T) => string | undefined) {
  return (a: T, b: T) => (key(b) ?? '').localeCompare(key(a) ?? '');
}

/** Case chiffrée du bandeau du haut — `null` pendant le chargement, `'error'` si l'appel a échoué. */
interface Kpi {
  label: string;
  value: number | null | 'error';
  link: string;
  alert?: boolean;
}

/** Nombre d'éléments d'une tuile, en conservant l'état de chargement/erreur. */
function countOf<T>(state: TileState<T>): number | null | 'error' {
  return Array.isArray(state) ? state.length : state;
}

/** Comme countOf, mais sur un sous-ensemble filtré. */
function countWhere<T>(state: TileState<T>, predicate: (item: T) => boolean): number | null | 'error' {
  return Array.isArray(state) ? state.filter(predicate).length : state;
}

interface HuileRow {
  friteuse: Friteuse;
  date: string;
}

@Component({
  selector: 'app-home-dashboard',
  imports: [RouterLink, DatePipe, TemperatureMultiChart],
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.css',
})
export class HomeDashboard implements OnInit {
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly menuService = inject(MenuService);
  private readonly temperatureReleveService = inject(TemperatureReleveService);
  private readonly appareilService = inject(AppareilService);
  private readonly friteuseService = inject(FriteuseService);
  private readonly eventService = inject(EventService);
  private readonly miseEnPlaceItemService = inject(MiseEnPlaceItemService);
  private readonly shoppingItemService = inject(ShoppingItemService);

  fiches = signal<TileState<FicheTechnique>>(null);
  menus = signal<TileState<Menu>>(null);
  releves = signal<TileState<TemperatureReleve>>(null);
  appareils = signal<TileState<Appareil>>(null);
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

  /** Une courbe par appareil, couleur selon sa position dans la liste des appareils — la même
   *  que dans le rapport de température. Au-delà de MAX_SERIES, plus assez de couleurs. */
  temperatureSeries = computed<TemperatureSeries[] | null | 'error'>(() => {
    const releves = this.releves();
    const appareils = this.appareils();
    if (releves === 'error' || appareils === 'error') return 'error';
    if (releves === null || appareils === null) return null;
    return appareils
      .map((appareil, colorIndex) => ({
        id: appareil.id,
        name: appareil.name,
        colorIndex,
        points: releves
          .filter((r) => r.appareil_id === appareil.id)
          .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
          .map((r) => ({ date: new Date(r.recorded_at), temperature: r.temperature })),
      }))
      .filter((s) => s.colorIndex < MAX_SERIES);
  });

  /** Relevés hors plage de la fenêtre — le graphique commun ne montre pas les plages normales. */
  outOfRangeCount = computed(() => {
    const releves = this.releves();
    return Array.isArray(releves) ? releves.filter((r) => this.isOutOfRange(r)).length : 0;
  });

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

  /** Tous les événements pas encore terminés, du plus proche au plus lointain. */
  private allUpcomingEvents = computed(() => {
    const events = this.events();
    if (!Array.isArray(events)) return events;
    const today = localDateString(new Date());
    return events
      .filter((e) => e.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  });

  upcomingEvents = computed(() => {
    const events = this.allUpcomingEvents();
    return Array.isArray(events) ? events.slice(0, EVENT_LIMIT) : events;
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

  /** Appareils sans aucun relevé depuis minuit — en HACCP, un relevé oublié compte autant
   *  qu'un relevé hors norme. */
  private unreadAppareilsCount = computed<number | null | 'error'>(() => {
    const releves = this.releves();
    const appareils = this.appareils();
    if (releves === 'error' || appareils === 'error') return 'error';
    if (releves === null || appareils === null) return null;
    const today = localDateString(new Date());
    const readToday = new Set(
      releves.filter((r) => localDateString(new Date(r.recorded_at)) === today).map((r) => r.appareil_id),
    );
    return appareils.filter((a) => !readToday.has(a.id)).length;
  });

  /** Couverts des événements qui ont lieu dans les 7 prochains jours (aujourd'hui compris). */
  private weekCouverts = computed<number | null | 'error'>(() => {
    const events = this.allUpcomingEvents();
    if (!Array.isArray(events)) return events;
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 6);
    const last = localDateString(weekEnd);
    return events.filter((e) => e.start_date <= last).reduce((sum, e) => sum + (e.couverts ?? 0), 0);
  });

  kpis = computed<Kpi[]>(() => {
    const releves = this.releves();
    const outOfRange = this.outOfRangeCount();
    const kpis: Kpi[] = [
      {
        label: 'Mise en place urgente',
        value: countWhere(this.pendingMiseEnPlace(), (i) => i.urgency === 'urgente'),
        link: '/mise-en-place',
        alert: true,
      },
      {
        label: "Événements aujourd'hui",
        value: countWhere(this.allUpcomingEvents(), (e) => this.isToday(e)),
        link: '/calendrier',
      },
      { label: 'Événements à venir', value: countOf(this.allUpcomingEvents()), link: '/calendrier' },
      { label: 'Couverts (7 j)', value: this.weekCouverts(), link: '/calendrier' },
      { label: 'Liste de courses', value: countOf(this.pendingCourses()), link: '/courses' },
      { label: 'Fiches techniques', value: countOf(this.fiches()), link: '/fiche-techniques' },
      {
        label: 'Relevés hors norme (7 j)',
        value: Array.isArray(releves) ? outOfRange : releves,
        link: '/temperatures',
        alert: true,
      },
      {
        label: "Appareils non relevés aujourd'hui",
        value: this.unreadAppareilsCount(),
        link: '/temperatures',
        alert: true,
      },
      {
        label: 'Friteuses à changer',
        value: countWhere(this.friteuses(), isChangeOverdue),
        link: '/huile',
        alert: true,
      },
    ];
    // Les cases "alert" ne passent en rouge que s'il y a effectivement quelque chose à traiter.
    return kpis.map((kpi) => ({ ...kpi, alert: kpi.alert && typeof kpi.value === 'number' && kpi.value > 0 }));
  });

  readonly listLimit = LIST_LIMIT;
  readonly isChangeOverdue = isChangeOverdue;
  readonly nextChangeDate = nextChangeDate;
  readonly weekday = weekday;
  readonly formatChartDate = (date: Date) =>
    date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });

  ngOnInit() {
    const from = new Date();
    from.setDate(from.getDate() - RELEVE_WINDOW_DAYS);

    this.load(this.ficheTechniqueService.list(), this.fiches);
    this.load(this.menuService.list(), this.menus);
    this.load(this.temperatureReleveService.list({ from: localDateString(from) }), this.releves);
    this.load(this.appareilService.list(), this.appareils);
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
