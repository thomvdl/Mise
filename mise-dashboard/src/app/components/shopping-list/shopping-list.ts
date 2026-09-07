import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ShoppingItemService } from '../../core/services/shopping-item.service';
import { SimpleEntityService } from '../../core/services/simple-entity.service';
import { ShoppingItem, ShoppingStatus } from '../../core/models/shopping-item.model';
import { Station } from '../../core/models/station.model';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-shopping-list',
  imports: [FormsModule, ConfirmDialog],
  templateUrl: './shopping-list.html',
  styleUrl: './shopping-list.css',
})
export class ShoppingList implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly shoppingItemService = inject(ShoppingItemService);
  private readonly stationService = new SimpleEntityService<Station>(inject(HttpClient), 'stations');

  readonly isAdmin = this.auth.isAdmin();

  items = signal<ShoppingItem[]>([]);
  stations = signal<Station[]>([]);
  newItemName = signal('');
  newItemStationId = signal<number | null>(null);
  pendingDelete = signal<ShoppingItem | null>(null);
  pendingClearAll = signal(false);

  filterStationId = signal<number | null>(null);
  filterStatus = signal<ShoppingStatus | null>('todo');

  filteredItems = computed(() => {
    const stationId = this.filterStationId();
    const status = this.filterStatus();

    return this.items().filter((item) => {
      const matchesStation = stationId === null || item.station?.id === stationId;
      const matchesStatus = status === null || item.status === status;
      return matchesStation && matchesStatus;
    });
  });

  ngOnInit(): void {
    this.reload();
    this.stationService.list().subscribe((stations) => this.stations.set(stations));
  }

  reload(): void {
    this.shoppingItemService.list().subscribe((items) => this.items.set([...items].reverse()));
  }

  onNewItemStationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.newItemStationId.set(value ? Number(value) : null);
  }

  onFilterStationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterStationId.set(value ? Number(value) : null);
  }

  onFilterStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterStatus.set(value ? (value as ShoppingStatus) : null);
  }

  addItem(): void {
    const name = this.newItemName().trim();
    if (!name) return;

    this.shoppingItemService.create(name, this.newItemStationId()).subscribe(() => {
      this.newItemName.set('');
      this.newItemStationId.set(null);
      this.reload();
    });
  }

  toggleStatus(item: ShoppingItem): void {
    const nextStatus = item.status === 'todo' ? 'done' : 'todo';
    this.shoppingItemService.updateStatus(item.id, nextStatus).subscribe(() => this.reload());
  }

  confirmDelete(item: ShoppingItem): void {
    this.pendingDelete.set(item);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.pendingDelete();
    if (!item) return;

    this.shoppingItemService.delete(item.id).subscribe(() => {
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

    forkJoin(ids.map((id) => this.shoppingItemService.delete(id))).subscribe(() => {
      this.pendingClearAll.set(false);
      this.reload();
    });
  }
}
