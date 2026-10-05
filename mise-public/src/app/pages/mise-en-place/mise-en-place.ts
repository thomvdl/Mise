import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { MiseEnPlaceClassification, MiseEnPlaceItemService } from '../../core/services/mise-en-place-item.service';
import { MiseEnPlaceItem, MiseEnPlaceStatus, MiseEnPlaceUrgency } from '../../core/models/mise-en-place-item.model';
import { StationService } from '../../core/services/station.service';
import { GroupService } from '../../core/services/group.service';
import { EventService } from '../../core/services/event.service';
import { Station } from '../../core/models/station.model';
import { Group } from '../../core/models/group.model';
import { CalendarEvent } from '../../core/models/calendar-event.model';
import { DatetimePicker } from '../../components/datetime-picker/datetime-picker';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';

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
  selector: 'app-mise-en-place',
  imports: [FormsModule, DatePipe, DatetimePicker, ConfirmDialog],
  templateUrl: './mise-en-place.html',
  styleUrl: './mise-en-place.css',
})
export class MiseEnPlace implements OnInit {
  private readonly miseEnPlaceItemService = inject(MiseEnPlaceItemService);
  private readonly stationService = inject(StationService);
  private readonly groupService = inject(GroupService);
  private readonly eventService = inject(EventService);

  items = signal<MiseEnPlaceItem[]>([]);
  stations = signal<Station[]>([]);
  groups = signal<Group[]>([]);
  events = signal<CalendarEvent[]>([]);

  newItemName = signal('');
  /** `''` tant qu'aucune option n'est choisie dans le select combiné station/groupe/événement. */
  newItemClassification = signal('');
  newItemDeadline = signal('');
  newItemUrgency = signal<MiseEnPlaceUrgency>('moyenne');

  /** Tâche en attente de confirmation avant d'être marquée faite — irréversible depuis cette vue
   * puisqu'elle disparaît alors de la liste (toujours filtrée sur "à faire", voir filteredItems). */
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

  /** Label affiché pour la classification — le badge station/groupe utilise sa couleur,
   * l'événement n'en a pas donc reste un simple libellé. */
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

  isOverdue(item: MiseEnPlaceItem): boolean {
    return item.status === 'todo' && item.deadline !== null && new Date(item.deadline) < new Date();
  }

  /** Cocher (marquer faite) passe par une confirmation — on revertit la case immédiatement, elle
   * ne se coche réellement qu'une fois confirmé (completeConfirmed). Décocher (remettre à faire)
   * ne retire rien de définitif, donc s'applique directement sans dialogue. */
  onToggleDoneChange(item: MiseEnPlaceItem, event: Event): void {
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      checkbox.checked = false;
      this.pendingComplete.set(item);
      return;
    }

    this.miseEnPlaceItemService.updateStatus(item.id, 'todo').subscribe(() => this.reload());
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
}
