import { Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { FicheTechniqueService } from '../../core/services/fiche-technique.service';
import { EventService } from '../../core/services/event.service';
import { MiseEnPlaceItemService } from '../../core/services/mise-en-place-item.service';
import { ShoppingItemService } from '../../core/services/shopping-item.service';
import { NettoyageTacheService } from '../../core/services/nettoyage-tache.service';
import { FicheTechnique } from '../../core/models/fiche-technique.model';
import { CalendarEvent, EVENT_TYPES } from '../../core/models/calendar-event.model';
import { MiseEnPlaceItem, MiseEnPlaceUrgency } from '../../core/models/mise-en-place-item.model';
import { ShoppingItem } from '../../core/models/shopping-item.model';
import {
  NettoyageTache,
  formatRealisation,
  isFaitPourPeriode,
  nettoyageDuJour,
} from '../../core/models/nettoyage-tache.model';

const FICHE_LIMIT = 24;
const EVENT_LIMIT = 8;
const LIST_LIMIT = 10;

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

/** Jour de la semaine abrégé ("lun.") d'une date `Y-m-d`, lue en heure locale. */
function weekday(date: string): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'short' });
}

/** Tableau de bord de l'accueil, en lecture seule — même principe que celui de mise-dashboard,
 * limité à ce qui sert à la brigade en service. */
@Component({
  selector: 'app-accueil-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './accueil-dashboard.html',
  styleUrl: './accueil-dashboard.css',
})
export class AccueilDashboard implements OnInit {
  private readonly ficheTechniqueService = inject(FicheTechniqueService);
  private readonly eventService = inject(EventService);
  private readonly miseEnPlaceItemService = inject(MiseEnPlaceItemService);
  private readonly shoppingItemService = inject(ShoppingItemService);
  private readonly nettoyageService = inject(NettoyageTacheService);

  fiches = signal<TileState<FicheTechnique>>(null);
  events = signal<TileState<CalendarEvent>>(null);
  miseEnPlace = signal<TileState<MiseEnPlaceItem>>(null);
  courses = signal<TileState<ShoppingItem>>(null);
  nettoyage = signal<TileState<NettoyageTache>>(null);

  /** Dernières fiches modifiées (ou créées, pour une fiche jamais retouchée). */
  latestFiches = computed(() => {
    const fiches = this.fiches();
    if (!Array.isArray(fiches)) return fiches;
    const date = (f: FicheTechnique) => f.updated_at ?? f.created_at;
    return [...fiches].sort((a, b) => date(b).localeCompare(date(a))).slice(0, FICHE_LIMIT);
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

  /** Tâches du plan de nettoyage qui reviennent chaque jour (après service, quotidien). */
  nettoyageAujourdhui = computed(() => {
    const taches = this.nettoyage();
    return Array.isArray(taches) ? nettoyageDuJour(taches) : taches;
  });

  /** Tâches du jour déjà faites (aujourd'hui), pour le compteur « x / n faites ». */
  nettoyageFaites = computed(() => {
    const taches = this.nettoyageAujourdhui();
    return Array.isArray(taches) ? taches.filter((t) => isFaitPourPeriode(t)).length : 0;
  });

  readonly isFaitPourPeriode = isFaitPourPeriode;
  readonly formatRealisation = formatRealisation;

  /** Nombre de tâches hebdomadaires, rappelé sous la liste (0 = rien à afficher). */
  nettoyageSemaine = computed(() => {
    const taches = this.nettoyage();
    return Array.isArray(taches) ? taches.filter((t) => t.frequence === 'hebdomadaire').length : 0;
  });

  readonly listLimit = LIST_LIMIT;
  readonly weekday = weekday;

  ngOnInit() {
    this.load(this.ficheTechniqueService.list(), this.fiches);
    this.load(this.eventService.listAll(), this.events);
    this.load(this.miseEnPlaceItemService.list(), this.miseEnPlace);
    this.load(this.shoppingItemService.list(), this.courses);
    this.load(this.nettoyageService.list(), this.nettoyage);
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
}
