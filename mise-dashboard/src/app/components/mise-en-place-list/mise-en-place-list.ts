import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { MiseEnPlaceClassification, MiseEnPlaceItemService } from '../../core/services/mise-en-place-item.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { EventService } from '../../core/services/event.service';
import { MiseEnPlaceItem, MiseEnPlaceStatus, MiseEnPlaceUrgency } from '../../core/models/mise-en-place-item.model';
import { Station } from '../../core/models/station.model';
import { Group } from '../../core/models/group.model';
import { CalendarEvent } from '../../core/models/calendar-event.model';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { DatetimePicker } from '../datetime-picker/datetime-picker';

type ClassificationKind = 'station' | 'group' | 'event';

/** Encode un type + id en une seule valeur `<option>` (ex. "station:3"), pour piloter un unique
 * `<select>` à la fois sur le formulaire d'ajout et sur le filtre, au lieu de jongler avec trois
 * listes déroulantes indépendantes. */
function encodeClassification(kind: ClassificationKind, id: number): string {
  return `${kind}:${id}`;
}

function decodeClassification(value: string): { kind: ClassificationKind; id: number } | null {
  const [kind, id] = value.split(':');
  if (kind !== 'station' && kind !== 'group' && kind !== 'event') return null;
  const numericId = Number(id);
  return Number.isFinite(numericId) ? { kind, id: numericId } : null;
}

/** `start_date`/`end_date` sont des dates `Y-m-d` — comparables telles quelles en chaîne. */
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-mise-en-place-list',
  imports: [FormsModule, DatePipe, ConfirmDialog, DatetimePicker],
  templateUrl: './mise-en-place-list.html',
  styleUrl: './mise-en-place-list.css',
})
export class MiseEnPlaceList implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly miseEnPlaceItemService = inject(MiseEnPlaceItemService);
  private readonly stationService = new SimpleEntityService<Station>(inject(HttpClient), 'stations');
  private readonly groupService = new SimpleEntityService<Group>(inject(HttpClient), 'groups');
  private readonly eventService = inject(EventService);

  readonly isAdmin = this.auth.isAdmin();

  items = signal<MiseEnPlaceItem[]>([]);
  stations = signal<Station[]>([]);
  groups = signal<Group[]>([]);
  events = signal<CalendarEvent[]>([]);

  newItemName = signal('');
  /** `''` tant qu'aucune option n'est choisie dans le select combiné station/groupe/événement. */
  newItemClassification = signal('');
  newItemDeadline = signal('');
  newItemUrgency = signal<MiseEnPlaceUrgency>('moyenne');
  pendingDelete = signal<MiseEnPlaceItem | null>(null);
  pendingClearAll = signal(false);
  /** Tâche en attente de confirmation avant d'être marquée faite. */
  pendingComplete = signal<MiseEnPlaceItem | null>(null);

  filterClassification = signal('');
  filterStatus = signal<MiseEnPlaceStatus | null>('todo');

  /** Le sélecteur d'événement ne propose que ceux encore pertinents pour la mise en place à
   * venir : ni déjà terminés, ni trop lointains (plus de J+7) — sans ça, la liste grossit sans
   * fin avec des événements passés ou hors de portée de planification. */
  upcomingEvents = computed(() => {
    const today = toDateString(new Date());
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    const max = toDateString(maxDate);

    return this.events().filter((e) => e.end_date >= today && e.start_date <= max);
  });

  canAdd = computed(() => this.newItemName().trim().length > 0 && this.newItemClassification() !== '');

  filteredItems = computed(() => {
    const classification = decodeClassification(this.filterClassification());
    const status = this.filterStatus();

    return this.items().filter((item) => {
      const matchesClassification =
        !classification ||
        (classification.kind === 'station' && item.station?.id === classification.id) ||
        (classification.kind === 'group' && item.group?.id === classification.id) ||
        (classification.kind === 'event' && item.event?.id === classification.id);
      const matchesStatus = status === null || item.status === status;
      return matchesClassification && matchesStatus;
    });
  });

  ngOnInit(): void {
    this.reload();
    this.stationService.list().subscribe((stations) => this.stations.set(stations));
    this.groupService.list().subscribe((groups) => this.groups.set(groups));
    this.eventService.listAll().subscribe((events) => this.events.set(events));
  }

  reload(): void {
    this.miseEnPlaceItemService.list().subscribe((items) => this.items.set([...items].reverse()));
  }

  encodeClassification = encodeClassification;

  onNewItemClassificationChange(event: Event): void {
    this.newItemClassification.set((event.target as HTMLSelectElement).value);
  }

  onNewItemUrgencyChange(event: Event): void {
    this.newItemUrgency.set((event.target as HTMLSelectElement).value as MiseEnPlaceUrgency);
  }

  onFilterClassificationChange(event: Event): void {
    this.filterClassification.set((event.target as HTMLSelectElement).value);
  }

  onFilterStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterStatus.set(value ? (value as MiseEnPlaceStatus) : null);
  }

  /** Label affiché dans la colonne "Classification" du tableau — le badge station/groupe utilise
   * sa couleur, l'événement n'en a pas donc reste un simple libellé. */
  classificationLabel(item: MiseEnPlaceItem): string {
    return item.station?.name ?? item.group?.name ?? item.event?.name ?? '—';
  }

  classificationColor(item: MiseEnPlaceItem): string | null {
    return item.station?.color ?? item.group?.color ?? null;
  }

  addItem(): void {
    const name = this.newItemName().trim();
    const classification = decodeClassification(this.newItemClassification());
    const deadline = this.newItemDeadline();
    if (!name || !classification) return;

    this.miseEnPlaceItemService
      .create(name, classification as MiseEnPlaceClassification, deadline || null, this.newItemUrgency())
      .subscribe(() => {
        this.newItemName.set('');
        this.newItemClassification.set('');
        this.newItemDeadline.set('');
        this.newItemUrgency.set('moyenne');
        this.reload();
      });
  }

  /** Repasser une tâche déjà faite à "à faire" ne perd rien de définitif — s'applique directement,
   * sans confirmation (contrairement à confirmComplete, irréversible via cette vue). */
  markTodo(item: MiseEnPlaceItem): void {
    this.miseEnPlaceItemService.updateStatus(item.id, 'todo').subscribe(() => this.reload());
  }

  confirmComplete(item: MiseEnPlaceItem): void {
    this.pendingComplete.set(item);
  }

  cancelComplete(): void {
    this.pendingComplete.set(null);
  }

  completeConfirmed(): void {
    const item = this.pendingComplete();
    if (!item) return;

    this.miseEnPlaceItemService.updateStatus(item.id, 'done').subscribe(() => {
      this.pendingComplete.set(null);
      this.reload();
    });
  }

  confirmDelete(item: MiseEnPlaceItem): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.miseEnPlaceItemService.delete(item.id).subscribe(() => {
      this.pendingDelete.set(null);
      this.reload();
    });
  }

  confirmClearAll(): void {
    this.pendingClearAll.set(true);
  }

  cancelClearAll(): void {
    this.pendingClearAll.set(false);
  }

  clearAllConfirmed(): void {
    const ids = this.items().map((item) => item.id);
    if (ids.length === 0) {
      this.pendingClearAll.set(false);
      return;
    }

    forkJoin(ids.map((id) => this.miseEnPlaceItemService.delete(id))).subscribe(() => {
      this.pendingClearAll.set(false);
      this.reload();
    });
  }
}
