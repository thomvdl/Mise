import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { MiseEnPlaceItemService } from '../../core/services/mise-en-place-item.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { MiseEnPlaceItem, MiseEnPlaceStatus, MiseEnPlaceUrgency } from '../../core/models/mise-en-place-item.model';
import { Station } from '../../core/models/station.model';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { DatetimePicker } from '../datetime-picker/datetime-picker';

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

  readonly isAdmin = this.auth.isAdmin();

  items = signal<MiseEnPlaceItem[]>([]);
  stations = signal<Station[]>([]);
  newItemName = signal('');
  newItemStationId = signal<number | null>(null);
  newItemDeadline = signal('');
  newItemUrgency = signal<MiseEnPlaceUrgency>('moyenne');
  pendingDelete = signal<MiseEnPlaceItem | null>(null);
  pendingClearAll = signal(false);

  filterStationId = signal<number | null>(null);
  filterStatus = signal<MiseEnPlaceStatus | null>('todo');

  canAdd = computed(
    () =>
      this.newItemName().trim().length > 0 &&
      this.newItemStationId() !== null &&
      this.newItemDeadline().length > 0,
  );

  filteredItems = computed(() => {
    const stationId = this.filterStationId();
    const status = this.filterStatus();

    return this.items().filter((item) => {
      const matchesStation = stationId === null || item.station.id === stationId;
      const matchesStatus = status === null || item.status === status;
      return matchesStation && matchesStatus;
    });
  });

  ngOnInit(): void {
    this.reload();
    this.stationService.list().subscribe((stations) => this.stations.set(stations));
  }

  reload(): void {
    this.miseEnPlaceItemService.list().subscribe((items) => this.items.set([...items].reverse()));
  }

  onNewItemStationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.newItemStationId.set(value ? Number(value) : null);
  }

  onNewItemUrgencyChange(event: Event): void {
    this.newItemUrgency.set((event.target as HTMLSelectElement).value as MiseEnPlaceUrgency);
  }

  onFilterStationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterStationId.set(value ? Number(value) : null);
  }

  onFilterStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterStatus.set(value ? (value as MiseEnPlaceStatus) : null);
  }

  addItem(): void {
    const name = this.newItemName().trim();
    const stationId = this.newItemStationId();
    const deadline = this.newItemDeadline();
    if (!name || stationId === null || !deadline) return;

    this.miseEnPlaceItemService.create(name, stationId, deadline, this.newItemUrgency()).subscribe(() => {
      this.newItemName.set('');
      this.newItemStationId.set(null);
      this.newItemDeadline.set('');
      this.newItemUrgency.set('moyenne');
      this.reload();
    });
  }

  toggleStatus(item: MiseEnPlaceItem): void {
    const nextStatus = item.status === 'todo' ? 'done' : 'todo';
    this.miseEnPlaceItemService.updateStatus(item.id, nextStatus).subscribe(() => this.reload());
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
