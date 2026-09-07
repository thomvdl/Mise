import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { MiseEnPlaceItemService } from '../../core/services/mise-en-place-item.service';
import { MiseEnPlaceItem, MiseEnPlaceStatus, MiseEnPlaceUrgency } from '../../core/models/mise-en-place-item.model';
import { StationService } from '../../core/services/station.service';
import { Station } from '../../core/models/station.model';
import { DatetimePicker } from '../../components/datetime-picker/datetime-picker';

@Component({
  selector: 'app-mise-en-place',
  imports: [FormsModule, DatePipe, DatetimePicker],
  templateUrl: './mise-en-place.html',
  styleUrl: './mise-en-place.css',
})
export class MiseEnPlace implements OnInit {
  private readonly miseEnPlaceItemService = inject(MiseEnPlaceItemService);
  private readonly stationService = inject(StationService);

  items = signal<MiseEnPlaceItem[]>([]);
  stations = signal<Station[]>([]);

  newItemName = signal('');
  newItemStationId = signal<number | null>(null);
  newItemDeadline = signal('');
  newItemUrgency = signal<MiseEnPlaceUrgency>('moyenne');

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

  isOverdue(item: MiseEnPlaceItem): boolean {
    return item.status === 'todo' && item.deadline !== null && new Date(item.deadline) < new Date();
  }

  toggleDone(item: MiseEnPlaceItem, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const nextStatus: MiseEnPlaceStatus = checked ? 'done' : 'todo';
    this.miseEnPlaceItemService.updateStatus(item.id, nextStatus).subscribe(() => this.reload());
  }
}
